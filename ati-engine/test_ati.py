"""
Test suite for the Non-Compensatory ATI Scoring Architecture.

Validates three critical scenarios:
  1. Weak content + strong visual + strong pattern → Weak-answer cap triggers
  2. Strong content + weak integrity              → Integrity multiplier drags score down
  3. Strong content + strong everything            → Near-full score, minimal reduction

Usage:
  cd d:\sit_hogriders\ati-engine
  python test_ati.py
"""

from content_module import calculate_cis
from pattern_module import calculate_pcs


def evaluate_ati_local(student_answer, model_answer, key_points, visual_score=100):
    """
    Non-compensatory ATI calculation — mirrors app.py logic.
    
    Architecture:
      1. Base = Content Score (academic quality is the anchor)
      2. Integrity Multiplier = visual / 100 (can only REDUCE, never inflate)
      3. Pattern Gate = caps score for anomalous writing patterns
      4. Weak Answer Protection = hard cap if content < 35
    """
    cis_result = calculate_cis(student_answer, model_answer, key_points)
    content_score = cis_result["content_integrity_score"]
    pattern_score = calculate_pcs(student_answer, model_answer)

    # 1. Base = Content Score
    base = content_score

    # 2. Integrity Multiplier
    integrity_multiplier = max(0.0, min(float(visual_score) / 100.0, 1.0))
    ati_score = base * integrity_multiplier

    # 3. Pattern Gate
    pattern_gate_applied = False
    if pattern_score < 30:
        ati_score = min(ati_score, 20)
        pattern_gate_applied = True
    elif pattern_score < 50:
        ati_score = min(ati_score, 40)
        pattern_gate_applied = True

    # 4. Weak Answer Protection
    weak_answer_cap_applied = False
    if content_score < 50:
        ati_score = min(ati_score, 30)
        weak_answer_cap_applied = True

    ati_score = round(ati_score, 2)

    if ati_score >= 80:
        trust_level = "Highly Trustworthy"
    elif ati_score >= 55:
        trust_level = "Moderately Trustworthy"
    else:
        trust_level = "Low Trust"

    return {
        "ati_score": ati_score,
        "content_score": content_score,
        "pattern_score": pattern_score,
        "visual_score": visual_score,
        "integrity_multiplier": integrity_multiplier,
        "pattern_gate_applied": pattern_gate_applied,
        "weak_answer_cap_applied": weak_answer_cap_applied,
        "trust_level": trust_level,
    }


# ── Common test data ──
MODEL_ANSWER = "Newton's Second Law states that force is equal to mass multiplied by acceleration."
KEY_POINTS = ["Newton's Second Law", "F = ma", "Force equals mass times acceleration"]


def print_result(label, result):
    print(f"\n{'='*60}")
    print(f"  SCENARIO: {label}")
    print(f"{'='*60}")
    for k, v in result.items():
        print(f"  {k:30s} = {v}")
    print()


# ══════════════════════════════════════════════════════════════
# SCENARIO 1: Weak content + strong visual + strong pattern
#   The student writes spam, but sits perfectly still.
#   OLD system: high ATI (visual inflates the score)
#   NEW system: ATI ≤ 30 (weak-answer cap triggers)
# ══════════════════════════════════════════════════════════════
def test_weak_content_strong_behavior():
    result = evaluate_ati_local(
        student_answer="force force force force force force force",
        model_answer=MODEL_ANSWER,
        key_points=KEY_POINTS,
        visual_score=100,
    )
    print_result("Weak content + Strong visual + Strong pattern", result)

    assert result["ati_score"] <= 30, (
        f"FAIL: Weak answer should be capped at ≤30, got {result['ati_score']}"
    )
    assert result["weak_answer_cap_applied"] or result["pattern_gate_applied"], (
        "FAIL: At least one safety gate should have triggered"
    )
    assert result["trust_level"] == "Low Trust", (
        f"FAIL: Expected 'Low Trust', got '{result['trust_level']}'"
    )
    print("  ✅ PASS — Weak answer correctly capped despite perfect behavior\n")


# ══════════════════════════════════════════════════════════════
# SCENARIO 2: Strong content + weak integrity (proctoring)
#   The student writes a great answer but was caught cheating.
#   NEW system: integrity_multiplier reduces the score.
# ══════════════════════════════════════════════════════════════
def test_strong_content_weak_integrity():
    result = evaluate_ati_local(
        student_answer="Force equals mass times acceleration, as described by Newton's Second Law F = ma.",
        model_answer=MODEL_ANSWER,
        key_points=KEY_POINTS,
        visual_score=40,  # Very poor proctoring score
    )
    print_result("Strong content + Weak integrity", result)

    assert result["ati_score"] < result["content_score"], (
        f"FAIL: ATI ({result['ati_score']}) should be less than content ({result['content_score']})"
    )
    assert result["integrity_multiplier"] == 0.4, (
        f"FAIL: Integrity multiplier should be 0.4, got {result['integrity_multiplier']}"
    )
    assert result["trust_level"] != "Highly Trustworthy", (
        f"FAIL: Should NOT be Highly Trustworthy with 40% visual score"
    )
    print("  ✅ PASS — Integrity multiplier correctly reduced a strong answer\n")


# ══════════════════════════════════════════════════════════════
# SCENARIO 3: Strong content + strong everything
#   Honest student, good answer, no violations.
#   NEW system: near-full score (content * 1.0, no caps).
# ══════════════════════════════════════════════════════════════
def test_strong_everything():
    result = evaluate_ati_local(
        student_answer="According to Newton's Second Law, force is equal to mass multiplied by acceleration, commonly written as F = ma.",
        model_answer=MODEL_ANSWER,
        key_points=KEY_POINTS,
        visual_score=95,
    )
    print_result("Strong content + Strong everything", result)

    assert result["ati_score"] >= 55, (
        f"FAIL: Honest strong answer should score ≥55, got {result['ati_score']}"
    )
    assert not result["pattern_gate_applied"], (
        "FAIL: Pattern gate should NOT have triggered for a legitimate answer"
    )
    assert not result["weak_answer_cap_applied"], (
        "FAIL: Weak answer cap should NOT have triggered for a strong answer"
    )
    print("  ✅ PASS — Strong honest answer correctly scored high\n")


if __name__ == "__main__":
    print("\n" + "▓" * 60)
    print("  ATI NON-COMPENSATORY MODEL — TEST SUITE")
    print("▓" * 60)

    test_weak_content_strong_behavior()
    test_strong_content_weak_integrity()
    test_strong_everything()

    print("=" * 60)
    print("  ALL TESTS PASSED ✅")
    print("=" * 60)
