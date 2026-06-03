import time
import threading
import requests
import cv2
import socketio

from analyzer import FrameAnalyzer
from behavior_tracker import BehaviorTracker
from cooldown_tracker import CooldownTracker

# NOTE: Set this exact string to your current local machine network IP address!
BACKEND_NETWORK_IP = "192.168.10.177" 
BACKEND_URL = f"http://{BACKEND_NETWORK_IP}:3000"

CAMERA_INDEX = 0
FRAME_INTERVAL = 1.0

RAW_TO_NAMED = {
    "drowsy":       "Drowsiness",
    "looking_away": "Eyes Off Road",
    "phone":        "Phone Usage",
    "eating":       "Eating While Driving",
    "no_seatbelt":  "No Seatbelt",
}

sio = socketio.Client()
state_lock = threading.Lock()

active_session_id = None
camera_running = False
stop_worker_flag = threading.Event()

shared = {
    "latest_frame": None,
    "flags": {k: False for k in RAW_TO_NAMED},
    "last_event": "(none)",
    "last_event_at": None
}

print("Loading 4 models (MediaPipe Face, MediaPipe Hand, YOLO COCO, YOLO Seatbelt)...")
analyzer = FrameAnalyzer(heavy_every_n_frames=1)
tracker = BehaviorTracker()
cooldown = CooldownTracker()
print("All tracking models preloaded and warmed up successfully.\n")

def send_alert_post_to_database(behavior_name):
    """POSTs infractions back into Node.js database controller stack."""
    global active_session_id
    if not active_session_id:
        return
    try:
        url = f"{BACKEND_URL}/api/misbehavior"
        payload = {
            "behavior_name": behavior_name,
            "session_id": active_session_id
        }
        res = requests.post(url, json=payload, timeout=2)
        if res.status_code == 201:
            print(f" -> [ALARM SENT TO DATABASE AND PHONES] Recorded: {behavior_name}")
    except Exception as e:
        print(f" -> [API SYNC FAILED] Could not post infraction: {e}")

def analyzer_worker():
    """Background pipeline thread worker processing frames at 1 FPS."""
    global active_session_id
    while not stop_worker_flag.is_set():
        loop_start = time.time()
        
        with state_lock:
            frame = shared["latest_frame"]
            
        if frame is None:
            time.sleep(0.05)
            continue
            
        # Execute ML inference calculations completely outside state lock context
        result = analyzer.analyze(frame)
        raw_flags = result["flags"]
        named_flags = {RAW_TO_NAMED[k]: v for k, v in raw_flags.items()}
        
        fired = tracker.update(named_flags, now=loop_start)
        allowed = cooldown.filter(fired, now=loop_start)
        
        with state_lock:
            shared["flags"] = raw_flags
            for behavior in allowed:
                shared["last_event"] = behavior
                shared["last_event_at"] = loop_start
                
        # Fire alerts through HTTP POST interface layer for database logging
        for behavior in allowed:
            send_alert_post_to_database(behavior)
            
        elapsed = time.time() - loop_start
        if elapsed < FRAME_INTERVAL:
            stop_worker_flag.wait(timeout=FRAME_INTERVAL - elapsed)

def run_camera_viewport():
    """Spawns native high-speed camera collection viewport matrix thread."""
    global camera_running, active_session_id
    
    cap = cv2.VideoCapture(CAMERA_INDEX)
    if not cap.isOpened():
        print("Hardware Resource Exception: Web camera configuration could not unlock.")
        camera_running = False
        return
        
    print(f"\n==================================================")
    print(f"LAUNCHING LIVE TRACKING WEBCAM FOR: {active_session_id[:12]}")
    print(f"==================================================\n")
    
    stop_worker_flag.clear()
    worker_thread = threading.Thread(target=analyzer_worker, daemon=True)
    worker_thread.start()
    
    while camera_running and active_session_id:
        ret, frame = cap.read()
        if not ret:
            break
            
        with state_lock:
            shared["latest_frame"] = frame
            flags_snapshot = shared["flags"].copy()
            last_event = shared["last_event"]
            
        # Draw descriptive visual diagnostics directly on laptop output screen
        h, w = frame.shape[:2]
        cv2.rectangle(frame, (0, 0), (w, 75), (0, 0, 0), -1)
        cv2.putText(frame, f"Realtime Driver Link: {active_session_id[:16]}...", (10, 25), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        flag_str = " | ".join([f"{k}:{int(v)}" for k, v in flags_snapshot.items()])
        cv2.putText(frame, flag_str, (10, 55), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)
                    
        cv2.imshow("RoadGuard Safety Monitor Engine - Active Viewport", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
            
    # Safe hardware release
    stop_worker_flag.set()
    worker_thread.join(timeout=1)
    cap.release()
    cv2.destroyAllWindows()
    print("Camera engine viewport disconnected successfully.")

# ────────────────────────────────────────────────────────────────────
# WebSocket Network Event Hooks
# ────────────────────────────────────────────────────────────────────
@sio.event
def connect():
    print(">>> WebSocket handshake verified with backend routing grid.")

@sio.on('SESSION_STARTED')
def on_session_start(data):
    """Fires instantly the exact split-second the phone button is touched."""
    global active_session_id, camera_running
    session_id = data.get("session_id")
    
    if not camera_running:
        active_session_id = session_id
        camera_running = True
        
        # Spawn camera inside separate context thread so socket connection doesn't drop
        t = threading.Thread(target=run_camera_viewport, daemon=True)
        t.start()

@sio.on('SESSION_ENDED')
def on_session_end(data):
    """Closes everything down gracefully when driving session terminates."""
    global camera_running, active_session_id
    print(">>> Session cleanup signal processed. Closing webcam viewport window.")
    camera_running = False
    active_session_id = None

if __name__ == "__main__":
    try:
        sio.connect(BACKEND_URL)
        print("System fully connected. Standing by for phone trigger commands...")
        sio.wait()
    except Exception as e:
        print(f"WebSocket execution initialization aborted: {e}")