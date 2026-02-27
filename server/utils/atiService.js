const ATI_ENGINE_URL = process.env.ATI_ENGINE_URL; // No localhost default — avoids unnecessary external calls

// ─── Text Preprocessing ────────────────────────────────────────────────────────
function preprocess(text) {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function tokenize(text) {
    return preprocess(text).split(/\s+/).filter(Boolean);
}

// ─── TF-IDF Cosine Similarity (Content Score) ──────────────────────────────────
function buildTFVector(tokens) {
    const tf = {};
    for (const t of tokens) tf[t] = (tf[t] || 0) + 1;
    // Normalize by total token count
    const len = tokens.length || 1;
    for (const t in tf) tf[t] /= len;
    return tf;
}

function cosineSimilarity(vecA, vecB) {
    const allKeys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
    let dot = 0, magA = 0, magB = 0;
    for (const key of allKeys) {
        const a = vecA[key] || 0;
        const b = vecB[key] || 0;
        dot += a * b;
        magA += a * a;
        magB += b * b;
    }
    if (magA === 0 || magB === 0) return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function computeSemanticSimilarity(studentAnswer, modelAnswer) {
    const studentTokens = tokenize(studentAnswer);
    const modelTokens = tokenize(modelAnswer);
    const tfStudent = buildTFVector(studentTokens);
    const tfModel = buildTFVector(modelTokens);
    return cosineSimilarity(tfStudent, tfModel);
}

function computeConceptCoverage(studentAnswer, keyPoints) {
    if (!keyPoints || keyPoints.length === 0) return 0;

    const studentTokens = new Set(tokenize(studentAnswer));
    let covered = 0;

    for (const kp of keyPoints) {
        const kpTokens = tokenize(kp);
        // Fractional coverage: accumulates the proportion of matched key point words
        const matchCount = kpTokens.filter(t => studentTokens.has(t)).length;
        const coverage = kpTokens.length > 0 ? matchCount / kpTokens.length : 0;
        covered += coverage;
    }

    return covered / keyPoints.length;
}

/**
 * Content Integrity Score (CIS) — mirrors ati-engine/content_module.py
 * Uses TF-IDF cosine similarity instead of SentenceTransformer embeddings.
 */
function calculateCIS(studentAnswer, modelAnswer, keyPoints = []) {
    const student = preprocess(studentAnswer);
    const model = preprocess(modelAnswer);
    const kps = keyPoints.map(k => preprocess(k));

    const studentWordCount = student.split(/\s+/).filter(Boolean).length;
    const modelWordCount = model.split(/\s+/).filter(Boolean).length;

    const semanticScore = computeSemanticSimilarity(student, model);
    const conceptScore = computeConceptCoverage(student, kps);

    // Weight: 70% semantic, 30% concept (same as Python)
    let baseScore = kps.length > 0
        ? (0.7 * semanticScore) + (0.3 * conceptScore)
        : semanticScore;  // If no key points, use only semantic similarity

    // Relative length safeguard (same as Python)
    if (modelWordCount > 0) {
        const lengthRatio = studentWordCount / modelWordCount;
        if (lengthRatio < 0.4) {
            baseScore *= 0.75;
        }
    }

    // Semantic floor safeguard (same as Python)
    if (semanticScore < 0.45) {
        baseScore = Math.min(baseScore, 0.4);
    }

    baseScore = Math.max(0.0, Math.min(baseScore, 1.0));
    return Math.round(baseScore * 10000) / 100; // Return as 0-100 score
}

// ─── Pattern Consistency Score (PCS) — mirrors ati-engine/pattern_module.py ─────
function calculatePCS(studentAnswer, modelAnswer) {
    const student = preprocess(studentAnswer);
    const model = preprocess(modelAnswer);

    const studentWords = student.split(/\s+/).filter(Boolean);
    const modelWords = model.split(/\s+/).filter(Boolean);

    if (studentWords.length === 0) return 0;

    // 1. Length Consistency
    const lengthRatio = studentWords.length / Math.max(modelWords.length, 1);
    const lengthScore = (lengthRatio >= 0.4 && lengthRatio <= 1.5) ? 1.0 : 0.6;

    // 2. Lexical Diversity
    const uniqueWords = new Set(studentWords).size;
    const diversity = uniqueWords / studentWords.length;
    let diversityScore;
    if (diversity >= 0.6) diversityScore = 1.0;
    else if (diversity >= 0.4) diversityScore = 0.8;
    else if (diversity >= 0.3) diversityScore = 0.5;
    else diversityScore = 0.3;

    // 3. Repetition Detection
    const wordCounts = {};
    for (const w of studentWords) wordCounts[w] = (wordCounts[w] || 0) + 1;
    const mostCommonCount = Math.max(...Object.values(wordCounts));
    const repetitionRatio = mostCommonCount / studentWords.length;
    let repetitionScore;
    if (repetitionRatio < 0.3) repetitionScore = 1.0;
    else if (repetitionRatio < 0.5) repetitionScore = 0.7;
    else repetitionScore = 0.2;

    let baseScore = (0.4 * lengthScore) + (0.3 * diversityScore) + (0.3 * repetitionScore);

    // Hard cap for obvious spam
    if (diversity < 0.3 && repetitionRatio > 0.5) {
        baseScore = Math.min(baseScore, 0.4);
    }

    return Math.round(baseScore * 10000) / 100; // Return as 0-100 score
}

// ─── Main ATI Evaluator ─────────────────────────────────────────────────────────
/**
 * Evaluate ATI locally. Falls back to the external engine if ATI_ENGINE_URL is set
 * and reachable, otherwise uses the built-in Node.js implementation.
 *
 * ATI formula (same as Python):
 *   ATI = 0.5 * content_score + 0.3 * visual_score + 0.2 * pattern_score
 */
async function evaluateATI(studentAnswer, modelAnswer, keyPoints = [], visualScore = 100) {
    // Try external engine only if URL is configured
    if (ATI_ENGINE_URL) {
        let timeoutId;
        try {
            const controller = new AbortController();
            timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

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

            if (response.ok) {
                return await response.json();
            }
        } catch (_) {
            // External engine unreachable — fall through to local evaluation
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
        }
    }

    // ── Local evaluation (Node.js implementation) ──
    const contentScore = calculateCIS(studentAnswer, modelAnswer, keyPoints);
    const patternScore = calculatePCS(studentAnswer, modelAnswer);

    const atiScore = Math.round(
        (0.5 * contentScore + 0.3 * visualScore + 0.2 * patternScore) * 100
    ) / 100;

    let trustLevel;
    if (atiScore >= 80) trustLevel = 'Highly Trustworthy';
    else if (atiScore >= 55) trustLevel = 'Moderately Trustworthy';
    else trustLevel = 'Low Trust';

    return {
        ati_score: atiScore,
        content_score: contentScore,
        pattern_score: patternScore,
        visual_score: visualScore,
        trust_level: trustLevel
    };
}

module.exports = { evaluateATI };
