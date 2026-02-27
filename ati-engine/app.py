import os
from flask import Flask, request, jsonify
from content_module import calculate_cis
from pattern_module import calculate_pcs
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

        result = calculate_cis(inputs["student_answer"], inputs["model_answer"], inputs["key_points"])

        return jsonify(result)

    except Exception as e:
        logging.exception("CIS processing failed")
        return jsonify({"error": "CIS processing failed"}), 500


@app.route("/evaluate-ati", methods=["POST"])
def evaluate_ati():
    try:
        logging.info("ATI evaluation requested")

        data = request.get_json(silent=True)

        if not data:
            return jsonify({"error": "No input data provided"}), 400

        inputs, err = validate_inputs(data)
        if err:
            return err

        visual_score = data.get("visual_score", 100)

        # Content Score
        cis_result = calculate_cis(inputs["student_answer"], inputs["model_answer"], inputs["key_points"])
        content_score = cis_result["content_integrity_score"]

        # Pattern Score
        pattern_score = calculate_pcs(inputs["student_answer"], inputs["model_answer"])

        # ATI Calculation
        ati_score = (
            0.5 * content_score +
            0.3 * visual_score +
            0.2 * pattern_score
        )

        ati_score = round(ati_score, 2)

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