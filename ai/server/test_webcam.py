"""Local webcam end-to-end test — full pipeline (analyzer + tracker + cooldown).

Mirrors the production architecture as closely as possible on a single laptop:
  - Main thread: captures webcam frames at the camera's native rate (~30 fps)
    and renders the display — never blocked by ML.
  - Worker thread: runs the analyzer at 1 fps on the LATEST frame available
    (drop-stale pattern; older frames are silently overwritten).
  - Shared state: a lock-protected dict; worker writes detection results,
    main thread reads them for the overlay.

This is the same architecture Rania will implement in Phase 5 (FastAPI),
just with the WebSocket replaced by direct memory sharing.

Controls (focus the video window first):
  q   — quit
  r   — reset all trackers (queues a reset; applied on the next worker tick)
"""

import time
import platform
import threading
import cv2

from analyzer import FrameAnalyzer
from behavior_tracker import BehaviorTracker
from cooldown_tracker import CooldownTracker


CAMERA_INDEX = 0          # 0 = built-in laptop cam, 1 = Iriun (phone) usually
FRAME_INTERVAL = 1.0      # seconds between analyses → 1 fps
ALARM_FLASH_DURATION = 2  # how long the "LAST ALARM" line stays red


# Cross-platform beep
if platform.system() == "Windows":
    import winsound
    def beep():
        winsound.Beep(1000, 200)
else:
    def beep():
        print("\a", end="", flush=True)


# Map analyzer's raw flag keys → BehaviorTracker's named keys
RAW_TO_NAMED = {
    "drowsy":       "Drowsiness",
    "looking_away": "Eyes Off Road",
    "phone":        "Phone Usage",
    "eating":       "Eating While Driving",
    "no_seatbelt":  "No Seatbelt",
}


# ────────────────────────────────────────────────────────────────────
# Shared state (lock-protected — written by worker, read by main)
# ────────────────────────────────────────────────────────────────────
state_lock = threading.Lock()
shared = {
    "latest_frame": None,                            # main writes, worker reads
    "flags": {k: False for k in RAW_TO_NAMED},       # worker writes, main reads
    "eating_debug": {},                              # worker writes, main reads
    "phone_conf": None,                              # worker writes, main reads
    "yaw": None,                                     # worker writes, main reads
    "pitch": None,                                   # worker writes, main reads
    "roll": None,                                    # worker writes, main reads (diagnostic only)
    "last_event": "(none yet)",
    "last_event_at": None,
    "session_start": time.time(),
    "pending_reset": False,                          # main sets, worker honours
}
stop_flag = threading.Event()


def analyzer_worker(analyzer, tracker, cooldown):
    """Background loop — pulls the latest frame at 1 fps, runs the pipeline,
    updates shared state. Drop-stale by design: only the most recent frame
    set by the main thread is ever processed."""
    while not stop_flag.is_set():
        loop_start = time.time()

        # ── Snapshot what we need (under lock) ──
        with state_lock:
            if shared["pending_reset"]:
                analyzer.reset()
                tracker.reset()
                cooldown.reset()
                shared["pending_reset"] = False
                shared["session_start"] = loop_start
                shared["last_event"] = "(reset)"
                shared["last_event_at"] = None
                shared["flags"] = {k: False for k in RAW_TO_NAMED}
                print("\n=== SESSION RESET ===\n")
            frame = shared["latest_frame"]
            session_start = shared["session_start"]

        if frame is None:
            # Camera hasn't produced a frame yet
            time.sleep(0.05)
            continue

        # ── Run the pipeline (outside the lock — slow work) ──
        result = analyzer.analyze(frame)
        raw_flags = result["flags"]
        named_flags = {RAW_TO_NAMED[k]: v for k, v in raw_flags.items()}
        fired = tracker.update(named_flags, now=loop_start)
        allowed = cooldown.filter(fired, now=loop_start)

        # ── Publish results (under lock) ──
        with state_lock:
            shared["flags"] = raw_flags
            shared["eating_debug"] = result.get("debug", {}).get("eating", {}) or {}
            shared["phone_conf"] = result.get("debug", {}).get("phone_conf")
            shared["yaw"] = result.get("debug", {}).get("yaw")
            shared["pitch"] = result.get("debug", {}).get("pitch")
            shared["roll"] = result.get("debug", {}).get("roll")
            for behavior in allowed:
                shared["last_event"] = behavior
                shared["last_event_at"] = loop_start

        # ── Side effects: terminal log + beep ──
        for behavior in allowed:
            ts = loop_start - session_start
            print(f"[{ts:6.1f}s] ALARM: {behavior}")
            beep()

        # ── Throttle to 1 fps (only sleep if we have spare time) ──
        elapsed = time.time() - loop_start
        if elapsed < FRAME_INTERVAL:
            # Wake early if asked to stop — use Event.wait, not time.sleep
            stop_flag.wait(timeout=FRAME_INTERVAL - elapsed)


def main():
    print("Loading 4 models (MediaPipe Face, MediaPipe Hand, YOLO COCO, YOLO Seatbelt)...")
    analyzer = FrameAnalyzer(heavy_every_n_frames=1)
    tracker = BehaviorTracker()
    cooldown = CooldownTracker()
    print("Models loaded.\n")

    # CAP_DSHOW = DirectShow backend, most reliable for virtual cameras
    # (Iriun, OBS Virtual Cam, etc.) on Windows.
    cap = cv2.VideoCapture(CAMERA_INDEX, cv2.CAP_DSHOW)
    if not cap.isOpened():
        print(f"ERROR: cannot open webcam at index {CAMERA_INDEX}.")
        print("If your laptop has multiple cameras, try CAMERA_INDEX = 1.")
        return

    print("Webcam open. Focus the video window then press:")
    print("  q  - quit")
    print("  r  - reset trackers (start a new 'session')")
    print("=" * 60)

    # Start the analyzer thread
    worker = threading.Thread(
        target=analyzer_worker,
        args=(analyzer, tracker, cooldown),
        daemon=True,
    )
    worker.start()

    # ── Main loop: capture + display at native camera framerate ──
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("ERROR: failed to read frame")
                break

            # Hand the latest frame to the worker (drop-stale: overwrite previous)
            with state_lock:
                shared["latest_frame"] = frame
                flags_snapshot = shared["flags"].copy()
                eating_debug = dict(shared["eating_debug"])
                phone_conf = shared["phone_conf"]
                yaw = shared["yaw"]
                pitch = shared["pitch"]
                roll = shared["roll"]
                last_event = shared["last_event"]
                last_event_at = shared["last_event_at"]
                session_start = shared["session_start"]

            now = time.time()

            # ── Overlay ──
            h, w = frame.shape[:2]
            cv2.rectangle(frame, (0, 0), (w, 170), (0, 0, 0), -1)

            cv2.putText(frame, f"Session: {int(now - session_start)}s",
                        (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)

            x, y = 10, 50
            for key, value in flags_snapshot.items():
                label = f"{key}={int(value)}"
                color = (0, 255, 0) if value else (160, 160, 160)
                cv2.putText(frame, label, (x, y),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
                x += int(len(label) * 9) + 12

            # Eating diagnostic — shows WHICH of the two conditions is failing
            food_seen = eating_debug.get("food", False)
            food_name = eating_debug.get("food_name") or "—"
            food_conf = eating_debug.get("food_conf")
            hand_on_food = eating_debug.get("hand_on_food", False)
            hand_dist = eating_debug.get("hand_dist")  # None if no hand detected at all
            hand_seen = hand_dist is not None
            food_part = f"food={food_name}({food_conf:.2f})" if food_conf is not None else "food=NONE"
            food_color = (0, 255, 0) if food_seen else (160, 160, 160)
            cv2.putText(frame, food_part, (10, 75),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, food_color, 1)
            hand_part = f"hand_seen={int(hand_seen)} hand_on_food={int(hand_on_food)}"
            hand_color = (0, 255, 0) if hand_on_food else ((255, 200, 0) if hand_seen else (160, 160, 160))
            cv2.putText(frame, hand_part, (240, 75),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, hand_color, 1)

            # Phone diagnostic — shows what YOLO thinks it's seeing for "cell phone"
            if phone_conf is None:
                phone_text = "phone: no detection"
                phone_color = (160, 160, 160)
            elif phone_conf >= 0.5:
                phone_text = f"phone: cell_phone conf={phone_conf:.2f} (above 0.50 -> FLAG)"
                phone_color = (0, 255, 0)
            else:
                phone_text = f"phone: cell_phone conf={phone_conf:.2f} (below 0.50)"
                phone_color = (255, 200, 0)
            cv2.putText(frame, phone_text, (10, 100),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, phone_color, 1)

            # Eyes-Off-Road diagnostic — all three Euler angles in degrees.
            # Threshold check uses |yaw| > 40 OR |pitch| > 35. Roll is shown
            # for diagnostic purposes only (verify which Euler component
            # actually corresponds to physical head turn).
            if yaw is None or pitch is None:
                yp_text = "yaw=—  pitch=—  roll=—  (no face detected)"
                yp_color = (160, 160, 160)
            else:
                triggers = abs(yaw) > 35 or abs(pitch) > 35
                yp_color = (0, 255, 0) if triggers else (200, 200, 200)
                marker = " -> FLAG" if triggers else ""
                roll_str = f"{roll:+.0f}" if roll is not None else "—"
                yp_text = (
                    f"yaw={yaw:+.0f}  pitch={pitch:+.0f}  roll={roll_str}"
                    f"  (|y|>35 or |p|>35{marker})"
                )
            cv2.putText(frame, yp_text, (10, 125),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, yp_color, 1)

            event_age = (now - last_event_at) if last_event_at else None
            event_color = (0, 0, 255) if (event_age is not None and event_age < ALARM_FLASH_DURATION) else (200, 200, 200)
            cv2.putText(frame, f"LAST ALARM: {last_event}",
                        (10, 155), cv2.FONT_HERSHEY_SIMPLEX, 0.55, event_color, 2)

            cv2.imshow("RoadGuard webcam test  (q=quit  r=reset)", frame)

            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            if key == ord('r'):
                with state_lock:
                    shared["pending_reset"] = True

    finally:
        stop_flag.set()
        worker.join(timeout=2)
        cap.release()
        cv2.destroyAllWindows()
        analyzer.close()
        print("Done.")


if __name__ == "__main__":
    main()
