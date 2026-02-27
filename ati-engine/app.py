import os
from flask import Flask, request, jsonify
from content_module import calculate_cis
from pattern_module import calculate_pcs

app = Flask(__name__)


# ----------------------------------
# Content Integrity Endpoint
# ----------------------------------
@app.route("/evaluate-cis", methods=["POST"])
def evaluate_cis():
    data = request.get_json(silent=True)

    if data is None or not isinstance(data, dict):
        return jsonify({"error": "Invalid or missing JSON payload"}), 400

    student_answer = data.get("student_answer", "")
    model_answer = data.get("model_answer", "")
    key_points = data.get("key_points", [])

    if not student_answer or not model_answer:
        return jsonify({"error": "Missing required fields"}), 400

    result = calculate_cis(student_answer, model_answer, key_points)

    return jsonify(result)


# ----------------------------------
# Full ATI Endpoint
# ----------------------------------
@app.route("/evaluate-ati", methods=["POST"])
def evaluate_ati():
    data = request.get_json(silent=True)

    if data is None or not isinstance(data, dict):
        return jsonify({"error": "Invalid or missing JSON payload"}), 400

    student_answer = data.get("student_answer", "")
    model_answer = data.get("model_answer", "")
    key_points = data.get("key_points", [])
    
    # Robust visual_score validation and clamping
    raw_visual_score = data.get("visual_score", 100)
    try:
        visual_score_validated = float(raw_visual_score)
    except (TypeError, ValueError):
        visual_score_validated = 100.0
    
    # Clamp to 0-100
    visual_score_validated = max(0.0, min(visual_score_validated, 100.0))

    if not student_answer or not model_answer:
        return jsonify({"error": "Missing required fields"}), 400

    # -------------------------
    # Step 1: Content Score
    # -------------------------
    cis_result = calculate_cis(student_answer, model_answer, key_points)
    content_score = cis_result["content_integrity_score"]

    # -------------------------
    # Step 2: Pattern Score
    # -------------------------
    pattern_score = calculate_pcs(student_answer, model_answer)

    # -------------------------
    # Step 3: ATI Calculation
    # -------------------------
    # Weights:
    # Content = 50%
    # Visual  = 30%
    # Pattern = 20%
    ati_score = (
        0.5 * content_score +
        0.3 * visual_score_validated +
        0.2 * pattern_score
    )

    ati_score = round(ati_score, 2)

    # -------------------------
    # Step 4: Trust Classification
    # -------------------------
    if ati_score >= 80:
        trust_level = "Highly Trustworthy"
    elif ati_score >= 55:
        trust_level = "Moderately Trustworthy"
    else:
        trust_level = "Low Trust"

    return jsonify({
        "ati_score": ati_score,
        "content_score": content_score,
        "visual_score": visual_score_validated,
        "pattern_score": pattern_score,
        "trust_level": trust_level
    })


# ----------------------------------
# Run Server
# ----------------------------------
if __name__ == "__main__":
    # Safe environment-based configuration
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", 8000))
    debug_mode = os.environ.get("DEBUG", "False").lower() in ("true", "1", "t")

    # Security safeguard: don't allow debug mode when binding to all interfaces
    if host == "0.0.0.0" and debug_mode:
        print("WARNING: Debug mode disabled for security (host=0.0.0.0)")
        debug_mode = False

    app.run(host=host, port=port, debug=debug_mode)