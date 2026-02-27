const ATI_ENGINE_URL = process.env.ATI_ENGINE_URL || 'http://localhost:8000';

/**
 * Call the ATI engine to evaluate a student answer.
 * @param {string} studentAnswer - The student's answer text
 * @param {string} modelAnswer - The expected model answer
 * @param {string[]} keyPoints - Key concepts to check coverage for
 * @param {number} visualScore - Visual proctoring score (0-100)
 * @returns {Promise<{ati_score, content_score, pattern_score, visual_score, trust_level}>}
 */
async function evaluateATI(studentAnswer, modelAnswer, keyPoints = [], visualScore = 100) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch(`${ATI_ENGINE_URL}/evaluate-ati`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
                student_answer: studentAnswer,
                model_answer: modelAnswer,
                key_points: keyPoints,
                visual_score: visualScore
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`ATI engine returned ${response.status}: ${errorBody}`);
        }

        return response.json();
    } catch (err) {
        if (err.name === 'AbortError') {
            throw new Error('ATI engine request timed out after 30s');
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
}

module.exports = { evaluateATI };
