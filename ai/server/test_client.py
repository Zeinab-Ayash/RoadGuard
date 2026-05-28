import cv2
import asyncio
import websockets
import json
import time

URL = "ws://127.0.0.1:8000/ws"


async def run():
    async with websockets.connect(URL, ping_interval=20, ping_timeout=60) as ws:

        cap = cv2.VideoCapture(0)

        last_send = 0
        SEND_INTERVAL = 0.05  # 20 FPS max send

        last_behavior = None

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame = cv2.resize(frame, (640, 480))
            _, buffer = cv2.imencode(".jpg", frame)

            now = time.time()

            # =========================
            # SEND ONLY LATEST FRAME
            # =========================
            if now - last_send > SEND_INTERVAL:
                last_send = now
                await ws.send(buffer.tobytes())

            # =========================
            # RECEIVE RESULT (NON BLOCKING SAFE)
            # =========================
            try:
                response = await asyncio.wait_for(ws.recv(), timeout=0.01)
                data = json.loads(response)

                # =========================
                # CLEAN LOGGING (NO SPAM)
                # =========================
                if data.get("behavior") != last_behavior:
                    last_behavior = data.get("behavior")

                    if last_behavior:
                        print("🚨 ALERT:", last_behavior)

            except:
                pass

            cv2.imshow("RoadGuard AI", frame)

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

            await asyncio.sleep(0.001)

        cap.release()
        cv2.destroyAllWindows()


asyncio.run(run())