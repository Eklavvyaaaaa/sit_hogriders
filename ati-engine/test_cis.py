from content_module import calculate_cis

def test_calculate_cis_happy_path():
    """
    Validates calculate_cis with a typical correct answer.
    """
    student_answer = "Force equals mass times acceleration."
    model_answer = "Newton's Second Law states that force is equal to mass multiplied by acceleration."
    key_points = [
        "Newton's Second Law",
        "Force equals mass times acceleration",
        "F = ma"
    ]

    result = calculate_cis(student_answer, model_answer, key_points)
    
    # Assert expected fields exist
    assert "content_integrity_score" in result
    assert "semantic_similarity" in result
    assert "concept_coverage" in result
    assert "word_count" in result
    
    # Assert values are within realistic ranges for this model and logic
    # Note: 5/13 words triggers a 0.75x length penalty as ratio < 0.4
    assert result["content_integrity_score"] > 50
    assert result["word_count"] == 5
    assert result["semantic_similarity"] > 0.7
    assert result["concept_coverage"] > 0.6
    
    print("test_calculate_cis_happy_path passed!")

if __name__ == "__main__":
    test_calculate_cis_happy_path()