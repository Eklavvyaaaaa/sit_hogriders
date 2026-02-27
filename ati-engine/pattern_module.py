import re
from collections import Counter


def preprocess_text(text):
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s]', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def calculate_pcs(student_answer, model_answer):
    student_answer = preprocess_text(student_answer)
    model_answer = preprocess_text(model_answer)

    student_words = student_answer.split()
    model_words = model_answer.split()

    if len(student_words) == 0:
        return 0

    # 1️⃣ Length Consistency
    length_ratio = len(student_words) / max(len(model_words), 1)

    if 0.4 <= length_ratio <= 1.5:
        length_score = 1.0
    else:
        length_score = 0.6

    # 2️⃣ Lexical Diversity
    unique_words = len(set(student_words))
    diversity = unique_words / len(student_words)

    if diversity >= 0.6:
        diversity_score = 1.0
    elif diversity >= 0.4:
        diversity_score = 0.8
    elif diversity >= 0.3:
        diversity_score = 0.5
    else:
        diversity_score = 0.3  # strong penalty

    # 3️⃣ Repetition Detection
    word_counts = Counter(student_words)
    most_common_count = word_counts.most_common(1)[0][1]
    repetition_ratio = most_common_count / len(student_words)

    if repetition_ratio < 0.3:
        repetition_score = 1.0
    elif repetition_ratio < 0.5:
        repetition_score = 0.7
    else:
        repetition_score = 0.2  # strong penalty

    base_score = (
        0.4 * length_score +
        0.3 * diversity_score +
        0.3 * repetition_score
    )

    # Hard cap for obvious spam
    if diversity < 0.3 and repetition_ratio > 0.5:
        base_score = min(base_score, 0.4)

    return round(base_score * 100, 2)