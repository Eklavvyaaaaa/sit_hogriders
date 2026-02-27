import logging
import sys
import re
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

model = None

def get_model():
    """
    Lazily loads the SentenceTransformer model.
    """
    global model
    if model is None:
        try:
            logger.info("Loading SentenceTransformer model...")
            model = SentenceTransformer("all-MiniLM-L6-v2", local_files_only=True)
        except Exception as e:
            logger.error(f"Failed to load model: {e}", exc_info=True)
            # Optional: Fallback or retry logic could go here
    return model


def preprocess_text(text):
    """
    Basic text cleaning.
    """
    text = text.lower()
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def compute_semantic_similarity(student_answer, model_answer):
    """
    Computes overall semantic similarity between student answer and model answer.
    """
    model_instance = get_model()
    if model_instance is None:
        raise RuntimeError("Model not loaded")

    embeddings = model_instance.encode([student_answer, model_answer])
    similarity = cosine_similarity(
        [embeddings[0]],
        [embeddings[1]]
    )[0][0]

    return float(similarity)


def compute_concept_coverage(student_answer, key_points):
    """
    Computes how well key concepts are covered in student answer.
    """
    if not key_points:
        return 0.0

    model_instance = get_model()
    if model_instance is None:
        raise RuntimeError("Model not loaded")

    student_embedding = model_instance.encode(student_answer)
    coverage_scores = []

    for concept in key_points:
        concept_embedding = model_instance.encode(concept)
        similarity = cosine_similarity(
            [student_embedding],
            [concept_embedding]
        )[0][0]
        coverage_scores.append(similarity)

    return float(np.mean(coverage_scores))


def calculate_cis(student_answer, model_answer, key_points):
    """
    Content Integrity Score (CIS v3)
    """

    # Normalize and validate key_points
    if key_points is None:
        key_points = []
    elif isinstance(key_points, (str, bytes, int, float)):
        key_points = [key_points]

    normalized_key_points = []
    try:
        for kp in key_points:
            if kp is not None:
                kp_str = str(kp).strip()
                if kp_str:
                    normalized_key_points.append(kp_str)
    except TypeError:
        # If it wasn't iterable at all (e.g. an object that's not a scalar)
        key_points = []

    # Preprocess
    student_answer = preprocess_text(student_answer)
    model_answer = preprocess_text(model_answer)
    key_points = [preprocess_text(k) for k in normalized_key_points]

    # Word counts
    student_word_count = len(student_answer.split())
    model_word_count = len(model_answer.split())

    # Core similarity scores
    semantic_score = compute_semantic_similarity(
        student_answer,
        model_answer
    )

    concept_score = compute_concept_coverage(
        student_answer,
        key_points
    )

    # Base weighted score
    base_score = (0.7 * semantic_score) + (0.3 * concept_score)

    # -------------------------
    # SAFEGUARD 1: Relative Length Penalty
    # -------------------------
    if model_word_count > 0:
        length_ratio = student_word_count / model_word_count

        # If answer is much shorter than model answer
        if length_ratio < 0.4:
            base_score *= 0.75

    # -------------------------
    # SAFEGUARD 2: Semantic Floor
    # -------------------------
    SEMANTIC_THRESHOLD = 0.45
    if semantic_score < SEMANTIC_THRESHOLD:
        base_score = min(base_score, 0.4)

    # Clamp score between 0 and 1
    base_score = max(0.0, min(base_score, 1.0))

    # Scale to 0-100
    cis_score = base_score * 100

    return {
        "semantic_similarity": round(semantic_score, 3),
        "concept_coverage": round(concept_score, 3),
        "word_count": student_word_count,
        "content_integrity_score": round(cis_score, 2)
    }