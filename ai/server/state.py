# state.py

from collections import deque
import threading

# =========================
# SINGLE LATEST FRAME ONLY
# =========================
latest_frame = None

# Thread lock (critical for safety)
frame_lock = threading.Lock()

# Debug buffer only (NOT used for AI)
frame_buffer = deque(maxlen=5)

# Connected clients
clients = set()