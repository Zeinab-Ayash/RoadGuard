"""Phase 6 tests — CooldownTracker post-fire suppression."""

from cooldown_tracker import CooldownTracker


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


# Test 1: First fire always passes
print("\nTest 1: first fire always passes")
c = CooldownTracker()
assert_eq(c.filter(["Drowsiness"], now=0.0), ["Drowsiness"], "first drowsy fire allowed")


# Test 2: Re-fire within cooldown blocked
print("\nTest 2: re-fire within cooldown blocked")
c = CooldownTracker()
c.filter(["Drowsiness"], now=0.0)
assert_eq(c.filter(["Drowsiness"], now=2.0), [], "t=2.0 within 5s cooldown")
assert_eq(c.filter(["Drowsiness"], now=4.9), [], "t=4.9 within 5s cooldown")


# Test 3: At cooldown boundary, re-fire allowed
print("\nTest 3: at cooldown boundary, re-fire allowed")
c = CooldownTracker()
c.filter(["Drowsiness"], now=0.0)
assert_eq(c.filter(["Drowsiness"], now=5.0), ["Drowsiness"], "t=5.0 exactly cooldown done")


# Test 4: After cooldown, re-fire allowed
print("\nTest 4: after cooldown, re-fire allowed")
c = CooldownTracker()
c.filter(["Drowsiness"], now=0.0)
assert_eq(c.filter(["Drowsiness"], now=6.0), ["Drowsiness"], "t=6.0 past 5s cooldown")


# Test 5: Cooldowns are per-behavior (independent)
print("\nTest 5: cooldowns are per-behavior")
c = CooldownTracker()
c.filter(["Drowsiness"], now=0.0)
assert_eq(c.filter(["Phone Usage"], now=1.0), ["Phone Usage"], "phone fires while drowsy in cooldown")


# Test 6: Multiple behaviors fire same frame, all pass first time
print("\nTest 6: multiple simultaneous fires")
c = CooldownTracker()
result = c.filter(["Drowsiness", "Phone Usage", "No Seatbelt"], now=0.0)
assert_eq(sorted(result), sorted(["Drowsiness", "Phone Usage", "No Seatbelt"]),
          "all three pass on first fire")


# Test 7: Mixed cooldown states — some allowed, some blocked
print("\nTest 7: mixed cooldown states")
c = CooldownTracker()
c.filter(["Drowsiness", "Phone Usage"], now=0.0)
assert_eq(c.filter(["Drowsiness", "Phone Usage"], now=3.0), [], "both blocked at t=3")
assert_eq(c.filter(["Drowsiness", "Phone Usage"], now=6.0), ["Drowsiness"],
          "only drowsy at t=6 (phone still in cooldown)")
assert_eq(sorted(c.filter(["Drowsiness", "Phone Usage"], now=11.0)),
          sorted(["Drowsiness", "Phone Usage"]),
          "both allowed at t=11 (drowsy 5s after t=6, phone 11s after t=0)")


# Test 8: Seatbelt 30-min cooldown
print("\nTest 8: seatbelt 1800s cooldown")
c = CooldownTracker()
c.filter(["No Seatbelt"], now=0.0)
assert_eq(c.filter(["No Seatbelt"], now=600.0), [], "blocked at t=10min")
assert_eq(c.filter(["No Seatbelt"], now=1799.9), [], "blocked just before 30min")
assert_eq(c.filter(["No Seatbelt"], now=1800.0), ["No Seatbelt"], "allowed exactly at 30min")


# Test 9: Empty input returns empty output
print("\nTest 9: empty input")
c = CooldownTracker()
assert_eq(c.filter([], now=0.0), [], "no fires in, no fires out")


# Test 10: reset() wipes cooldown state
print("\nTest 10: reset() wipes state for new session")
c = CooldownTracker()
c.filter(["Drowsiness"], now=0.0)
assert_eq(c.filter(["Drowsiness"], now=2.0), [], "still in cooldown")
c.reset()
assert_eq(c.filter(["Drowsiness"], now=2.0), ["Drowsiness"], "after reset, fires immediately")


# Test 11: Each behavior fires at exactly its own cooldown boundary
print("\nTest 11: per-behavior cooldown values are correct")
c = CooldownTracker()
all_five = ["Drowsiness", "Eyes Off Road", "Phone Usage", "Eating While Driving", "No Seatbelt"]
c.filter(all_five, now=0.0)
assert_eq(c.filter(["Drowsiness"],           now=5.0),    ["Drowsiness"],           "drowsy 5s")
assert_eq(c.filter(["Eyes Off Road"],        now=8.0),    ["Eyes Off Road"],        "eyes 8s")
assert_eq(c.filter(["Phone Usage"],          now=10.0),   ["Phone Usage"],          "phone 10s")
assert_eq(c.filter(["Eating While Driving"], now=10.0),   ["Eating While Driving"], "eating 10s")
assert_eq(c.filter(["No Seatbelt"],          now=1800.0), ["No Seatbelt"],          "seatbelt 1800s")


# Test 12: Just-below boundary is blocked, just-at boundary passes
print("\nTest 12: cooldown boundary precision")
c = CooldownTracker()
c.filter(["Eating While Driving"], now=0.0)
assert_eq(c.filter(["Eating While Driving"], now=9.99), [], "9.99 < 10.0, blocked")
assert_eq(c.filter(["Eating While Driving"], now=10.0), ["Eating While Driving"], "10.0 exact, passes")


# Test 13: Unknown behavior name is silently dropped
print("\nTest 13: unknown behavior name dropped")
c = CooldownTracker()
assert_eq(c.filter(["NotARealBehavior"], now=0.0), [], "unknown name not allowed through")


# Summary
print()
print("=" * 60)
print(f"Phase 6 tests: {tests_passed}/{tests_run} passed")
print("=" * 60)
