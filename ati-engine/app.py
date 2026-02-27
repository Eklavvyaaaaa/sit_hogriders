from flask import Flask, request, jsonify
from content_module import calculate_cis

app = Flask(__name__)


# -------------------------
# Content Integrity Endpoint
# -------------------------
@app.route("/evaluate-cis", methods=["POST"])
def evaluate_cis():
    data = request.get_json()

    if not data:
        return jsonify({"error": "No input data provided"}), 400

    student_answer = data.get("student_answer", "")
    model_answer = data.get("model_answer", "")
    key_points = data.get("key_points", [])

    if not student_answer or not model_answer:
        return jsonify({"error": "Missing required fields"}), 400

    result = calculate_cis(student_answer, model_answer, key_points)

    return jsonify(result)


# -------------------------
# Full ATI Endpoint
# -------------------------
@app.route("/evaluate-ati", methods=["POST"])
def evaluate_ati():
    data = request.get_json()

    if not data:
        return jsonify({"error": "No input data provided"}), 400

    student_answer = data.get("student_answer", "")
    model_answer = data.get("model_answer", "")
    key_points = data.get("key_points", [])
    visual_score = data.get("visual_score", 100)  # Default = 100 if not provided

    if not student_answer or not model_answer:
        return jsonify({"error": "Missing required fields"}), 400

    # Step 1: Compute Content Score
    cis_result = calculate_cis(student_answer, model_answer, key_points)
    content_score = cis_result["content_integrity_score"]

    # Step 2: Compute ATI
    # Current Weights:
    # Content = 50%
    # Visual  = 30%
    # 20% reserved for Pattern Consistency (future)
    ati_score = (0.5 * content_score) + (0.3 * visual_score)

    ati_score = round(ati_score, 2)

    # Step 3: Trust Classification
    if ati_score >= 80:
        trust_level = "Highly Trustworthy"
    elif ati_score >= 55:
        trust_level = "Moderately Trustworthy"
    else:
        trust_level = "Low Trust"

    return jsonify({
        "ati_score": ati_score,
        "content_score": content_score,
        "visual_score": visual_score,
        "trust_level": trust_level
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)