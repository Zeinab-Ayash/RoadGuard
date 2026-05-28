"""Phase 4 — BehaviorTracker (duration filter).

Takes per-frame behavior flags and decides when a behavior has been
sustained long enough to fire an alarm. One instance per driving session.

Logic per behavior (time-based, NOT frame-count):
  - Flag True  → start/continue streak; check elapsed time vs threshold
  - Flag False → reset streak (start_time = None, fired = False)
  - Gap > max_gap → reset streak (outage protection)
  - Fires ONCE per streak (cooldown layer in Phase 6 handles re-firing)

Configuration locked from memory `project-phase4-config`:
  Drowsiness            2.0 s / 5.0 s gap
  Eyes Off Road         1.0 s / 5.0 s gap
  Phone Usage           1.0 s / 5.0 s gap
  Eating While Driving  1.0 s / 5.0 s gap
  No Seatbelt           1.0 s / 5.0 s gap
"""

import time


# Per-behavior config — tuned for the 1 fps CPU deployment.
# Drowsiness stays at 2.0 s (safety-critical, highest severity, must filter
# out blinks). Other four lowered to 1.0 s because their intensity thresholds
# already do most of the filtering — duration is just confirmation, and at
# 1 fps the duration layer has less filtering power than the industry's
# 30-fps assumptions. Saves ~1 s of perceived alarm latency in the demo.
BEHAVIOR_CONFIG = {
    "Drowsiness":           {"duration": 2.0, "max_gap": 5.0},
    "Eyes Off Road":        {"duration": 1.0, "max_gap": 5.0},
    "Phone Usage":          {"duration": 1.0, "max_gap": 5.0},
    "Eating While Driving": {"duration": 1.0, "max_gap": 5.0},
    "No Seatbelt":          {"duration": 1.0, "max_gap": 5.0},
}


# Priority ladder — Policy C, safety first
PRIORITY_ORDER = [
    "Drowsiness",
    "Phone Usage",
    "Eating While Driving",
    "Eyes Off Road",
    "No Seatbelt",
]


# Map analyze_frame's raw flag keys to public behavior names
FLAG_TO_BEHAVIOR = {
    "drowsy":       "Drowsiness",
    "phone":        "Phone Usage",
    "eating":       "Eating While Driving",
    "looking_away": "Eyes Off Road",
    "no_seatbelt":  "No Seatbelt",
}


class BehaviorTracker:
    """Per-session duration filter."""

    def __init__(self):
        self.state = {
            name: {"start_time": None, "last_seen": None, "fired": False}
            for name in BEHAVIOR_CONFIG
        }

    def update(self, named_flags, now=None):
        """Called per frame with raw flags BY BEHAVIOR NAME.

        named_flags: dict — keys are behavior names ("Drowsiness", etc.),
                     values are True/False from per-frame detectors.
        now: optional timestamp (seconds). If omitted, time.time() is used.

        Returns: list of behavior names whose streak just crossed the
                 duration threshold THIS frame (empty list if none).
        """
        if now is None:
            now = time.time()

        fired = []

        for behavior, cfg in BEHAVIOR_CONFIG.items():
            is_true = named_flags.get(behavior, False)
            s = self.state[behavior]

            if not is_true:
                # Behavior not detected — reset everything
                s["start_time"] = None
                s["last_seen"] = None
                s["fired"] = False
                continue

            # Behavior is True. Check for outage gap first.
            if s["last_seen"] is not None and (now - s["last_seen"]) > cfg["max_gap"]:
                # Gap too big — lost continuity, restart streak
                s["start_time"] = now
                s["fired"] = False
            elif s["start_time"] is None:
                # First frame of a fresh streak
                s["start_time"] = now
                s["fired"] = False

            s["last_seen"] = now

            # Check if duration threshold crossed (and not already fired)
            elapsed = now - s["start_time"]
            if elapsed >= cfg["duration"] and not s["fired"]:
                s["fired"] = True
                fired.append(behavior)

        return fired

    def update_from_flags(self, raw_flags, now=None):
        """Convenience: take analyze_frame's raw_flags dict (with keys
        like 'drowsy', 'phone', etc.) and translate to behavior names.
        """
        named = {behavior: raw_flags.get(key, False)
                 for key, behavior in FLAG_TO_BEHAVIOR.items()}
        return self.update(named, now=now)

    @staticmethod
    def pick_winner(fired_list):
        """Apply Policy C priority ladder — return the highest-priority
        behavior from a list of newly-fired behaviors, or None.
        """
        for behavior in PRIORITY_ORDER:
            if behavior in fired_list:
                return behavior
        return None

    def reset(self):
        """Reset all state — e.g., at the start of a new driving session."""
        for s in self.state.values():
            s["start_time"] = None
            s["last_seen"] = None
            s["fired"] = False
