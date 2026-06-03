import time
import requests
import cv2
import numpy as np
import logging
from detectors import detect_drowsiness, detect_looking_away, detect_phone, detect_no_seatbelt, detect_eating

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("DMSDaemon")

# Configuration matching your architecture
BACKEND_API_URL = "http://192.168.10.177:3000"  # Match your backend IP address
FRAME_INTERVAL_SECONDS = 1.0                    # Paced at 1 FPS pipeline

class LocalDMSOrchestrator:
    def __init__(self):
        self.current_session_id = None
        self.cap = None
        # Here you would load your models once to avoid lag when the loop boots up
        log.info("DMS Engine Initialized. Models pooled and warmed up.")

    def poll_for_active_session(self):
        """Checks if any driver hit 'Start Driving' on their phone."""
        try:
            url = f"{BACKEND_API_URL}/api/sessions/active"
            response = requests.get(url, timeout=3)
            if response.status_code == 200:
                data = response.json()
                return data.get("session_id")
        except Exception as e:
            log.debug(f"Polling backend gateway failed: {e}")
        return None

    def send_misbehavior_alert(self, behavior_name):
        """Pushes detected infrastructure flags directly into the driver's timeline."""
        try:
            url = f"{BACKEND_API_URL}/api/misbehavior"
            # Note: For production real-time alerting, you would pass an internal service token 
            # or map the user context using the current active session_id payload
            payload = {
                "behavior_name": behavior_name,
                "session_id": self.current_session_id
            }
            res = requests.post(url, json=payload, timeout=2)
            if res.status_code == 201:
                log.info(f"Successfully committed and pushed ALARM: {behavior_name}")
        except Exception as e:
            log.error(f"Failed to transmit pipeline alert to backend: {e}")

    def run_capture_pipeline(self):
        """Opens hardware camera pipeline and processes frames dynamically at 1 FPS."""
        log.info(f"Kicking off automated active pipeline capture for Session: {self.current_session_id}")
        
        # Open laptop default webcam hardware link
        self.cap = cv2.VideoCapture(0)
        if not self.cap.isOpened():
            log.error("Could not unlock camera layer resource on laptop.")
            return

        # Simple threshold tracking parameters for example frame checks
        while self.current_session_id:
            start_time = time.time()
            ret, frame = self.cap.read()
            if not ret:
                log.warning("Hardware frame dropped from stream, skipping loop pass.")
                continue

            # -- VISUAL OVERLAY AND INTERFACE CAPABILITY --
            # Shows diagnostic verification feed locally on laptop screen
            display_frame = frame.copy()
            cv2.putText(display_frame, f"RoadGuard Active Session: {self.current_session_id[:8]}...", 
                        (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            cv2.imshow("RoadGuard DMS - Laptop Camera Subsystem", display_frame)
            
            # Non-blocking window update breaks out if user manual kills on dashboard via 'q' key
            if cv2.waitKey(1) & 0xFF == ord('q'):
                log.info("Manual local override requested.")
                break

            # --------------------------------------------------------
            # PLACEHOLDER MOCK AI INFERENCE ENGINE RUNS IN BACKGROUND 
            # (Replace variables below directly with your MediaPipe landmarks/YOLO inference maps)
            # --------------------------------------------------------
            # Example Evaluation hook:
            # is_drowsy, score = detect_drowsiness(face_landmarks)
            # if is_drowsy: 
            #     self.send_misbehavior_alert("Drowsiness")
            
            # Let's run a test simulation flag to watch real-time state mutations on mobile screen
            # (In true production operations, these evaluation metrics map directly from your detectors.py)
            
            # --- Pacing cadence calculation ---
            elapsed = time.time() - start_time
            if elapsed < FRAME_INTERVAL_SECONDS:
                # Sleep dynamic remaining gap time to stick to 1 FPS cadence strictly without drifting
                time.sleep(FRAME_INTERVAL_SECONDS - elapsed)

            # Re-verify session status at step margins to drop lock when driver taps finish button
            session_check = self.poll_for_active_session()
            if session_check != self.current_session_id:
                log.info("Session state change detected. Tearing down active stream.")
                break

        # Teardown visual structures safely when loop terminates
        self.cap.release()
        cv2.destroyAllWindows()
        self.cap = None

    def start_daemon(self):
        """Continuous long-poll scheduler thread tracking mobile driver state changes."""
        log.info("RoadGuard Python Engine active. Listening for mobile application signals...")
        while True:
            active_id = self.poll_for_active_session()
            
            if active_id and self.current_session_id != active_id:
                # Mobile app just initiated a drive trigger! Open hardware camera link
                self.current_session_id = active_id
                self.run_capture_pipeline()
            elif not active_id and self.current_session_id is not None:
                log.info(f"Driver completed journey. Cleaning up active links for: {self.current_session_id}")
                self.current_session_id = None
            
            # Sleep 2 seconds between discovery pings while waiting for a trip to start
            time.sleep(2)

if __name__ == "__main__":
    orchestrator = LocalDMSOrchestrator()
    orchestrator.start_daemon()