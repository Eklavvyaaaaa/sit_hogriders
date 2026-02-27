from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import re

import logging
import sys

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load model once at startup
try:
    model = SentenceTransformer("all-MiniLM-L6-v2", local_files_only=True)
except Exception as e:
    logger.error(
        "CRITICAL ERROR: Failed to load the SentenceTransformer model 'all-MiniLM-L6-v2'. "
        "The model must be pre-downloaded and cached locally because 'local_files_only=True' is set. "
        "To download the model, run the following command in your terminal:\n"
        "python3 -c \"from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')\""
    )
    # Re-raise to prevent the engine from starting in a broken state
    raise RuntimeError("SentenceTransformer model 'all-MiniLM-L6-v2' is not pre-cached locally. See logs for download instructions.") from e


def preprocess_text(text):
    text = text.lower()
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def compute_semantic_similarity(student_answer, model_answer):
    embeddings = model.encode([student_answer, model_answer])
    similarity = cosine_similarity(
        [embeddings[0]],
        [embeddings[1]]
    )[0][0]
    return float(similarity)


def compute_concept_coverage(student_answer, key_points):
    if not key_points:
        return 0.0

    student_embedding = model.encode(student_answer)
    coverage_scores = []

    for concept in key_points:
        concept_embedding = model.encode(concept)
        similarity = cosine_similarity(
            [student_embedding],
            [concept_embedding]
        )[0][0]
        coverage_scores.append(similarity)

    return float(np.mean(coverage_scores))


def calculate_cis(student_answer, model_answer, key_points):
    student_answer = preprocess_text(student_answer)
    model_answer = preprocess_text(model_answer)
    key_points = [preprocess_text(k) for k in key_points]

    student_word_count = len(student_answer.split())
    model_word_count = len(model_answer.split())

    semantic_score = compute_semantic_similarity(
        student_answer,
        model_answer
    )

    concept_score = compute_concept_coverage(
        student_answer,
        key_points
    )

    base_score = (0.7 * semantic_score) + (0.3 * concept_score)

    # Relative length safeguard
    if model_word_count > 0:
        length_ratio = student_word_count / model_word_count
        if length_ratio < 0.4:
            base_score *= 0.75

    # Semantic floor safeguard
    if semantic_score < 0.45:
        base_score = min(base_score, 0.4)

    base_score = max(0.0, min(base_score, 1.0))

    cis_score = base_score * 100

    return {
        "semantic_similarity": round(semantic_score, 3),
        "concept_coverage": round(concept_score, 3),
        "word_count": student_word_count,
        "content_integrity_score": round(cis_score, 2)
    }