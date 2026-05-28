"""Phase 6 — CooldownTracker (post-fire suppression).

Sits AFTER the BehaviorTracker. Takes the list of behaviors that just
crossed their duration threshold, and only lets through the ones whose
cooldown has expired. Same behavior cannot re-emit within its cooldown
window, even if a new streak forms.

Separation of concerns:
  - BehaviorTracker owns DURATION (how long behavior must persist to fire)
  - CooldownTracker owns COOLDOWN (how long to wait before next emission)

Cooldown values locked after deep review against severity ladder + demo
needs + streak-hiccup protection:

  Drowsiness            5 s     (critical safety — re-alert aggressively)
  Eyes Off Road         8 s     (important distraction)
  Phone Usage           10 s    (#1 statistical distraction killer)
  Eating While Driving  10 s    (lowered from 15 s — matches phone cadence, keeps demo snappy)
  No Seatbelt           1800 s  (state, not event — once per session)
"""

import time


COOLDOWN_CONFIG = {
    "Drowsiness":           5.0,
    "Eyes Off Road":        8.0,
    "Phone Usage":          10.0,
    "Eating While Driving": 10.0,
    "No Seatbelt":          1800.0,
}


class CooldownTracker:
    """Per-session post-fire suppression filter."""

    def __init__(self):
        # When each behavior was last emitted (None = never emitted yet)
        self.last_emitted = {name: None for name in COOLDOWN_CONFIG}

    def filter(self, fired_list, now=None):
        """Take behaviors that fired this frame, return ones allowed to emit.

        fired_list: list of behavior names (from BehaviorTracker.update()).
        now: optional timestamp (seconds). If omitted, time.time() is used.

        Returns: list of behavior names that passed the cooldown check.
                 Emission timestamps are updated for behaviors that passed.
        """
        if now is None:
            now = time.time()

        allowed = []
        for behavior in fired_list:
            if behavior not in COOLDOWN_CONFIG:
                continue
            last = self.last_emitted[behavior]
            cooldown = COOLDOWN_CONFIG[behavior]

            if last is None or (now - last) >= cooldown:
                allowed.append(behavior)
                self.last_emitted[behavior] = now

        return allowed

    def reset(self):
        """Reset all state — e.g., at the start of a new driving session."""
        for behavior in self.last_emitted:
            self.last_emitted[behavior] = None
