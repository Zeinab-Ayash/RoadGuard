# RoadGuard AI Server — API Contract (Phase 5)

This document is the source of truth for the message formats and URLs that the
AI server, the phone (frontend), the browser camera publisher, and the backend
must agree on. Any change here requires a sign-off from all three sub-teams.

---

## 1. Endpoints

| URL | Type | Direction | Who connects |
|---|---|---|---|
| `ws://<host>/upload/{session_id}` | WebSocket | client → server (frames in) | The camera source — `publish.html` running in a browser, or `test_client.py` during local testing |
| `ws://<host>/events/{session_id}` | WebSocket | server → client (alarms out) | The phone (Mira's frontend) |
| `GET  http://<host>/publish` | HTTP | server → browser | Static page that the browser opens to become the camera source |
| `GET  http://<host>/health` | HTTP | server → caller | Returns `{"status":"ok"}` for monitoring |
| `GET  http://<backend>/sessions/active` | HTTP | server → caller | Backend endpoint that returns the latest active `session_id`, or `null`. Used by `publish.html` to auto-pair when a driving session starts. |

Both WebSocket URLs are **bound by the same `session_id`** — the AI server uses
that ID to route frames from `/upload/{session_id}` into the same per-session
state as `/events/{session_id}`.

---

## 2. Upload message — phone or browser → server

Every WebSocket message on `/upload/{session_id}` is **raw binary JPEG bytes**.
No JSON envelope. No base64 encoding. The server uses its own arrival time as
the timestamp.

| Field | Value |
|---|---|
| Resolution | **640 × 480** |
| Encoding | JPEG, quality 70 |
| Approx. size per frame | ~80 KB |
| Rate from client | 1 fps |

If a malformed message arrives the server logs it and skips — the WebSocket
stays open.

---

## 3. Event message — server → phone

Every WebSocket message on `/events/{session_id}` is a **JSON text frame**:

```json
{
  "behavior": "Drowsiness",
  "ts": 1716393600.42
}
```

| Field | Type | Description |
|---|---|---|
| `behavior` | string | One of the five canonical names — see §5 |
| `ts` | float | Server-side unix timestamp (seconds) when the alarm fired |

The phone uses this payload to:
1. Play the 2-second alarm sound (locally, immediately)
2. Show a local notification
3. `POST /misbehavior` to the backend (in parallel)

---

## 4. Backend endpoint — `GET /sessions/active`

Used by `publish.html` to silently auto-pair when a session starts.

**Request:** `GET http://<backend>/sessions/active`

**Response on session active:**
```json
{ "session_id": "ab12cd34-..." }
```

**Response when no session active:**
```json
{ "session_id": null }
```

The publisher polls this endpoint every 2 seconds. When the field flips from
`null` to a UUID, it opens `/upload/{session_id}` and starts streaming frames.
When it flips back to `null` it closes the WebSocket and resumes polling.

---

## 5. Behavior name vocabulary (locked)

The server emits exactly these five strings — Mira's frontend and the backend
both must accept these spellings character-for-character:

- `Drowsiness`
- `Phone Usage`
- `Eating While Driving`
- `Eyes Off Road`
- `No Seatbelt`

(They match `behavior_tracker.py` `BEHAVIOR_CONFIG` keys and the
`misbehavior_type.behavior_name` values seeded in the database.)

---

## 6. Connection lifecycle

| When | What happens |
|---|---|
| Driver presses **Start Driving** | Phone calls `POST /driving-session` on backend → gets `session_id` → opens `ws://server/events/{session_id}` and listens |
| Browser polls and finds the new active session | Opens `ws://server/upload/{session_id}` → starts streaming frames at 1 fps |
| Server detects a behavior | Sends JSON event on `/events/{session_id}` |
| Driver presses **Finish Driving** | Phone calls `PATCH /driving-session/{id}/end` on backend → closes its `/events` WebSocket. The browser's next poll returns `null` → it closes its `/upload` WebSocket |
| Either WebSocket drops unexpectedly | The other side continues working. When the dropped side reconnects, the same `session_id` rejoins the existing per-session state |

---

## 7. Per-session state lifecycle (server-internal)

For each unique `session_id` the AI server keeps:

| Field | Meaning |
|---|---|
| `analyzer` | One `FrameAnalyzer` instance |
| `tracker` | One `BehaviorTracker` instance |
| `cooldown` | One `CooldownTracker` instance |
| `latest_frame` | Most recent JPEG bytes (overwritten each new upload — drop-stale) |
| `events_ws` | Reference to the phone's WebSocket (None until the phone connects) |
| `last_seen` | Unix timestamp updated on every upload + event |

State is **created on demand** when the first WebSocket for a `session_id`
arrives, and **garbage collected** 30 seconds after the last activity on that
session. This survives brief network drops without losing tracker streaks.

---

## 8. Error handling rules (minimum viable)

| Situation | Server behavior |
|---|---|
| Malformed JPEG arrives | Log + skip. Connection stays open. |
| Phone disconnects from `/events` | Per-session state keeps running; events queued in memory are dropped (no buffering) |
| Browser disconnects from `/upload` | Per-session state pauses (no new frames to process) |
| Two clients connect to the same `/upload/{session_id}` | Last-writer-wins on `latest_frame` — both can publish but the most recent overwrite is what gets processed |
| Server hits an unhandled exception during a frame | Logs + skips that frame, keeps that session running |

---

## 9. Out of scope for Phase 5 (deferred)

These are intentionally not part of the contract:

- Authentication on the WebSockets (the `session_id` is the only authorization — anyone with the ID can publish or subscribe). Acceptable for a demo and local network; would need real auth before production.
- Backpressure / rate-limiting beyond drop-stale.
- Reconnection logic on the client side.
- Capture-time timestamps from the phone (server timestamps frames on arrival).

---

## 10. Examples

### Browser publisher opens a session

```
GET  /publish                               ← loads the HTML page
GET  /sessions/active   →   null              (polled every 2 s)
GET  /sessions/active   →   {"session_id":"ab12-..."}
WS   /upload/ab12-...                       ← opens, begins streaming JPEGs
```

### Phone receives an alarm

```
WS   /events/ab12-...                       ← phone listening
                            ←  text {"behavior":"Drowsiness","ts":1716393600.42}
                            ←  text {"behavior":"Phone Usage","ts":1716393608.11}
                            ...
WS close                                    ← phone presses Finish Driving
```
