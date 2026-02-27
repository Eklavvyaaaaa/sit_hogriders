from content_module import calculate_cis

student_answer = "Force equals mass times acceleration."
model_answer = "Newton's Second Law states that force is equal to mass multiplied by acceleration."
key_points = [
    "Newton's Second Law",
    "Force equals mass times acceleration",
    "F = ma"
]

result = calculate_cis(student_answer, model_answer, key_points)

print(result)