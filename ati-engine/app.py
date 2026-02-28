import os
from flask import Flask, request, jsonify  # type: ignore
from content_module import calculate_cis  # type: ignore
from pattern_module import calculate_pcs  # type: ignore
import logging

app = Flask(__name__)

logging.basicConfig(level=logging.INFO)

MAX_LENGTH = 5000
MAX_KEY_POINTS = 20
MAX_KEY_POINT_LENGTH = 500


def validate_inputs(data):
    """Validate and extract common inputs from request data.
    Returns (inputs_dict, error_response) — error_response is None on success."""
    student_answer = data.get("student_answer", "")
    model_answer = data.get("model_answer", "")
    key_points = data.get("key_points", [])

    if not isinstance(student_answer, str) or not student_answer.strip():
        return None, (jsonify({"error": "student_answer must be a non-empty string"}), 400)

    if not isinstance(model_answer, str) or not model_answer.strip():
        return None, (jsonify({"error": "model_answer must be a non-empty string"}), 400)

    if len(student_answer) > MAX_LENGTH:
        return None, (jsonify({"error": f"student_answer exceeds max length of {MAX_LENGTH}"}), 400)

    if len(model_answer) > MAX_LENGTH:
        return None, (jsonify({"error": f"model_answer exceeds max length of {MAX_LENGTH}"}), 400)

    if not isinstance(key_points, list):
        return None, (jsonify({"error": "key_points must be a list of strings"}), 400)

    if len(key_points) > MAX_KEY_POINTS:
        return None, (jsonify({"error": f"key_points exceeds max count of {MAX_KEY_POINTS}"}), 400)

    for i, kp in enumerate(key_points):
        if not isinstance(kp, str):
            return None, (jsonify({"error": f"key_points[{i}] must be a string"}), 400)
        if len(kp) > MAX_KEY_POINT_LENGTH:
            return None, (jsonify({"error": f"key_points[{i}] exceeds max length of {MAX_KEY_POINT_LENGTH}"}), 400)

    return {"student_answer": student_answer, "model_answer": model_answer, "key_points": key_points}, None


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ATI engine running"}), 200


@app.route("/evaluate-cis", methods=["POST"])
def evaluate_cis():
    try:
        data = request.get_json(silent=True)

        if not data:
            return jsonify({"error": "No input data provided"}), 400

        inputs, err = validate_inputs(data)
        if err:
            return err

        result = calculate_cis(inputs["student_answer"], inputs["model_answer"], inputs["key_points"])  # type: ignore

        return jsonify(result)

    except Exception as e:
        logging.exception("CIS processing failed")
        return jsonify({"error": "CIS processing failed"}), 500


@app.route("/evaluate-ati", methods=["POST"])
def evaluate_ati():
    try:
        logging.info("ATI evaluation requested (non-compensatory model)")

        data = request.get_json(silent=True)

        if not data:
            return jsonify({"error": "No input data provided"}), 400

        inputs, err = validate_inputs(data)
        if err:
            return err

        raw_visual_score = data.get("visual_score", 100)
        try:
            visual_score = float(raw_visual_score)
        except (ValueError, TypeError):
            return jsonify({"error": "visual_score must be a number"}), 400

        # ── Component Scores (unchanged internals) ──
        cis_result = calculate_cis(inputs["student_answer"], inputs["model_answer"], inputs["key_points"])  # type: ignore
        content_score = cis_result["content_integrity_score"]  # 0-100
        pattern_score = calculate_pcs(inputs["student_answer"], inputs["model_answer"])  # type: ignore  # 0-100

        # ══════════════════════════════════════════════════════
        # NON-COMPENSATORY ATI CALCULATION
        # Architecture: Content is the foundation.
        # Integrity can only REDUCE. Pattern acts as a GATE.
        # ══════════════════════════════════════════════════════

        # 1. Base = Content Score (academic quality is the anchor)
        base = content_score

        # 2. Integrity Multiplier (visual / 100, clamped 0.0-1.0)
        #    Perfect behavior (100) → multiplier 1.0 (no effect)
        #    Poor behavior (40)    → multiplier 0.4 (heavy reduction)
        integrity_multiplier = max(0.0, min(visual_score / 100.0, 1.0))
        ati_score = base * integrity_multiplier

        # 3. Pattern Gate — caps score for anomalous writing patterns
        pattern_gate_applied = False
        if pattern_score < 30:
            ati_score = min(ati_score, 20)
            pattern_gate_applied = True
        elif pattern_score < 50:
            ati_score = min(ati_score, 40)
            pattern_gate_applied = True

        # 4. Weak Answer Protection — if content is poor, cap ATI hard
        weak_answer_cap_applied = False
        if content_score < 50:
            ati_score = min(ati_score, 30)
            weak_answer_cap_applied = True

        ati_score = round(ati_score, 2)

        # Trust Level (unchanged thresholds)
        if ati_score >= 80:
            trust_level = "Highly Trustworthy"
        elif ati_score >= 55:
            trust_level = "Moderately Trustworthy"
        else:
            trust_level = "Low Trust"

        return jsonify({
            "ati_score": ati_score,
            "content_score": content_score,
            "pattern_score": pattern_score,
            "visual_score": visual_score,
            "integrity_multiplier": integrity_multiplier,
            "pattern_gate_applied": pattern_gate_applied,
            "weak_answer_cap_applied": weak_answer_cap_applied,
            "trust_level": trust_level
        })

    except Exception as e:
        logging.exception("ATI processing failed")
        return jsonify({"error": "ATI processing failed"}), 500


if __name__ == "__main__":
    # Derive configuration from environment variables
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", 8000))
    
    # Validate DEBUG environment variable
    debug_env = os.environ.get("DEBUG", "False").lower()
    debug_mode = debug_env in ("true", "1", "t", "yes")

    # Security safeguard: Ensure debug is False in production environments
    flask_env = os.environ.get("FLASK_ENV", "").lower()
    if flask_env == "production":
        debug_mode = False

    app.run(host=host, port=port, debug=debug_mode)