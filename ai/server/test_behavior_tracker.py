"""Phase 4 tests — BehaviorTracker duration filter.

Simulates frame streams (with explicit timestamps) and verifies that
alarms fire exactly when expected and never when they shouldn't.
"""

from behavior_tracker import BehaviorTracker


def make_flags(**kwargs):
    """Build a named_flags dict — default all False, override what's passed."""
    flags = {
        "Drowsiness": False,
        "Eyes Off Road": False,
        "Phone Usage": False,
        "Eating While Driving": False,
        "No Seatbelt": False,
    }
    flags.update(kwargs)
    return flags


tests_run = 0
tests_passed = 0


def assert_eq(actual, expected, name):
    global tests_run, tests_passed
    tests_run += 1
    if actual == expected:
        tests_passed += 1
        print(f"  PASS  {name}")
    else:
        print(f"  FAIL  {name}: expected {expected}, got {actual}")


# ─────────────────────────────────────────────────────────────────
# Test 1: Sustained drowsiness fires exactly once at 1.5 s
# ─────────────────────────────────────────────────────────────────
print("\nTest 1: sustained drowsy fires once at 1.5 s")
t = BehaviorTracker()
assert_eq(t.update(make_flags(Drowsiness=True), now=0.0),  [], "t=0.0: streak starts, no fire yet")
assert_eq(t.update(make_flags(Drowsiness=True), now=0.5),  [], "t=0.5: still building")
assert_eq(t.update(make_flags(Drowsiness=True), now=1.0),  [], "t=1.0: still building (< 1.5)")
assert_eq(t.update(make_flags(Drowsiness=True), now=1.5),  ["Drowsiness"], "t=1.5: FIRES")
assert_eq(t.update(make_flags(Drowsiness=True), now=2.0),  [], "t=2.0: already fired, no re-fire")
assert_eq(t.update(make_flags(Drowsiness=True), now=3.0),  [], "t=3.0: still no re-fire (cooldown's job)")


# ─────────────────────────────────────────────────────────────────
# Test 2: Brief blink (drowsy True for 1 frame) — never fires
# ─────────────────────────────────────────────────────────────────
print("\nTest 2: single drowsy frame (blink) — never fires")
t = BehaviorTracker()
assert_eq(t.update(make_flags(Drowsiness=True),  now=0.0), [], "blink: True frame")
assert_eq(t.update(make_flags(Drowsiness=False), now=0.3), [], "eyes open again")
assert_eq(t.update(make_flags(Drowsiness=False), now=0.6), [], "still open")
assert_eq(t.update(make_flags(Drowsiness=True),  now=1.0), [], "new isolated True — fresh streak")
assert_eq(t.update(make_flags(Drowsiness=False), now=1.3), [], "open again")
# Never fired — correct


# ─────────────────────────────────────────────────────────────────
# Test 3: Drowsy -> False -> Drowsy — second streak fires correctly
# ─────────────────────────────────────────────────────────────────
print("\nTest 3: drowsy interrupted, second streak fires")
t = BehaviorTracker()
t.update(make_flags(Drowsiness=True), now=0.0)
t.update(make_flags(Drowsiness=True), now=0.5)
t.update(make_flags(Drowsiness=False), now=1.0)  # interrupted before threshold
assert_eq(t.update(make_flags(Drowsiness=True), now=1.5), [], "fresh streak starts")
assert_eq(t.update(make_flags(Drowsiness=True), now=2.5), [], "still building (1.0 s elapsed)")
assert_eq(t.update(make_flags(Drowsiness=True), now=3.0), ["Drowsiness"], "FIRES at 1.5 s into new streak")


# ─────────────────────────────────────────────────────────────────
# Test 4: Outage protection — gap > max_gap (5s) resets streak
# ─────────────────────────────────────────────────────────────────
print("\nTest 4: gap > max_gap (5 s) resets streak")
t = BehaviorTracker()
t.update(make_flags(Drowsiness=True), now=0.0)
t.update(make_flags(Drowsiness=True), now=1.0)  # streak building (1.0 s in)
# Big gap — server outage
result = t.update(make_flags(Drowsiness=True), now=7.0)  # gap of 6 s > 5 s max_gap
assert_eq(result, [], "after outage: streak reset, no fire")
# New streak must build fresh
assert_eq(t.update(make_flags(Drowsiness=True), now=8.0),  [], "1 s into new streak")
assert_eq(t.update(make_flags(Drowsiness=True), now=8.5),  ["Drowsiness"], "FIRES at 1.5 s into new streak")


# ─────────────────────────────────────────────────────────────────
# Test 5: Multiple behaviors fire at their own thresholds (different durations)
# ─────────────────────────────────────────────────────────────────
print("\nTest 5: drowsy (1.5 s) and no-seatbelt (1.0 s) fire at different times")
t = BehaviorTracker()
# Both True at t=0
t.update(make_flags(Drowsiness=True, **{"No Seatbelt": True}), now=0.0)
# Seatbelt fires at t=1.0; drowsy still building
fired_at_1 = t.update(make_flags(Drowsiness=True, **{"No Seatbelt": True}), now=1.0)
assert_eq(fired_at_1, ["No Seatbelt"],
          "t=1.0: seatbelt fires (1.0 s threshold), drowsy still building (< 1.5 s)")
# Drowsy fires at t=1.5; seatbelt already fired
fired_at_15 = t.update(make_flags(Drowsiness=True, **{"No Seatbelt": True}), now=1.5)
assert_eq(fired_at_15, ["Drowsiness"],
          "t=1.5: drowsy fires, seatbelt does not re-fire (same streak)")


# ─────────────────────────────────────────────────────────────────
# Test 6: Phone Usage at 1 fps — fires at 1.0 s
# ─────────────────────────────────────────────────────────────────
print("\nTest 6: Phone Usage threshold 1.0 s")
t = BehaviorTracker()
assert_eq(t.update(make_flags(**{"Phone Usage": True}), now=0.0), [], "first phone frame")
assert_eq(t.update(make_flags(**{"Phone Usage": True}), now=1.0), ["Phone Usage"], "FIRES at 1.0 s")


# ─────────────────────────────────────────────────────────────────
# Test 7: Eyes Off Road at 1.0 s
# ─────────────────────────────────────────────────────────────────
print("\nTest 7: Eyes Off Road threshold 1.0 s")
t = BehaviorTracker()
assert_eq(t.update(make_flags(**{"Eyes Off Road": True}), now=0.0), [], "first frame, streak starts")
assert_eq(t.update(make_flags(**{"Eyes Off Road": True}), now=0.5), [], "0.5 s elapsed, not fired yet")
assert_eq(t.update(make_flags(**{"Eyes Off Road": True}), now=1.0), ["Eyes Off Road"], "FIRES at 1.0 s")


# ─────────────────────────────────────────────────────────────────
# Test 8: pick_winner applies Policy C priority ladder
# ─────────────────────────────────────────────────────────────────
print("\nTest 8: pick_winner priority ladder")
assert_eq(BehaviorTracker.pick_winner(["Drowsiness", "Phone Usage"]), "Drowsiness", "Drowsiness > Phone")
assert_eq(BehaviorTracker.pick_winner(["Eating While Driving", "Eyes Off Road"]), "Eating While Driving", "Eating > Eyes")
assert_eq(BehaviorTracker.pick_winner(["No Seatbelt", "Eyes Off Road"]), "Eyes Off Road", "Eyes > Seatbelt")
assert_eq(BehaviorTracker.pick_winner([]), None, "empty list -> None")
assert_eq(BehaviorTracker.pick_winner(["No Seatbelt"]), "No Seatbelt", "only seatbelt -> seatbelt")


# ─────────────────────────────────────────────────────────────────
# Test 9: update_from_flags translates raw flag keys correctly
# ─────────────────────────────────────────────────────────────────
print("\nTest 9: update_from_flags translates analyze_frame's raw keys")
t = BehaviorTracker()
raw = {"drowsy": True, "phone": False, "eating": False, "looking_away": False, "no_seatbelt": False}
t.update_from_flags(raw, now=0.0)
result = t.update_from_flags(raw, now=1.5)
assert_eq(result, ["Drowsiness"], "raw key 'drowsy' mapped to 'Drowsiness'")


# ─────────────────────────────────────────────────────────────────
# Test 10: reset() wipes all state
# ─────────────────────────────────────────────────────────────────
print("\nTest 10: reset() wipes state for new session")
t = BehaviorTracker()
t.update(make_flags(Drowsiness=True), now=0.0)
t.update(make_flags(Drowsiness=True), now=1.5)  # fires
t.reset()
assert_eq(t.update(make_flags(Drowsiness=True), now=2.0), [], "after reset: streak restarts")
assert_eq(t.update(make_flags(Drowsiness=True), now=3.5), ["Drowsiness"], "FIRES at 1.5 s into new streak")


# Summary
print()
print("=" * 60)
print(f"Phase 4 tests: {tests_passed}/{tests_run} passed")
print("=" * 60)
