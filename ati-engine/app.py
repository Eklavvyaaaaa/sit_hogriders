from flask import Flask, request, jsonify
from content_module import calculate_cis
from pattern_module import calculate_pcs
import logging

app = Flask(__name__)

logging.basicConfig(level=logging.INFO)

MAX_LENGTH = 5000


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ATI engine running"}), 200


@app.route("/evaluate-cis", methods=["POST"])
def evaluate_cis():
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No input data provided"}), 400

        student_answer = data.get("student_answer", "")
        model_answer = data.get("model_answer", "")
        key_points = data.get("key_points", [])

        if not student_answer or not model_answer:
            return jsonify({"error": "Missing required fields"}), 400

        if len(student_answer) > MAX_LENGTH:
            return jsonify({"error": "Answer too long"}), 400

        result = calculate_cis(student_answer, model_answer, key_points)

        return jsonify(result)

    except Exception as e:
        logging.exception("CIS processing failed")
        return jsonify({"error": "CIS processing failed"}), 500


@app.route("/evaluate-ati", methods=["POST"])
def evaluate_ati():
    try:
        logging.info("ATI evaluation requested")

        data = request.get_json()

        if not data:
            return jsonify({"error": "No input data provided"}), 400

        student_answer = data.get("student_answer", "")
        model_answer = data.get("model_answer", "")
        key_points = data.get("key_points", [])
        visual_score = data.get("visual_score", 100)

        if not student_answer or not model_answer:
            return jsonify({"error": "Missing required fields"}), 400

        if len(student_answer) > MAX_LENGTH:
            return jsonify({"error": "Answer too long"}), 400

        # Content Score
        cis_result = calculate_cis(student_answer, model_answer, key_points)
        content_score = cis_result["content_integrity_score"]

        # Pattern Score
        pattern_score = calculate_pcs(student_answer, model_answer)

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
    app.run(host="0.0.0.0", port=8000, debug=True)