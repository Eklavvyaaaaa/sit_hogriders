const { query, pool } = require('../config/db');
const { evaluateATI } = require('../utils/atiService');

// Submit an individual answer for a given submission
exports.submitAnswer = async (req, res) => {
  const { submission_id, question_id, answer_text } = req.body;
  const user_id = req.user.id;

  try {
    // Verify ownership and status simultaneously
    const subResult = await query('SELECT student_id, status FROM submissions WHERE id = $1', [submission_id]);
    if (subResult.rows.length === 0) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    const submission = subResult.rows[0];

    if (submission.student_id !== user_id) {
      return res.status(403).json({ message: 'Forbidden: You do not own this submission' });
    }

    if (submission.status === 'submitted' || submission.status === 'finalized') {
      return res.status(400).json({ message: 'Submission already finalized' });
    }

    const result = await query(
      'INSERT INTO answers (submission_id, question_id, answer_text) VALUES ($1, $2, $3) RETURNING *',
      [submission_id, question_id, answer_text]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Finalize a submission: mark as submitted and calculate scores
exports.finishSubmission = async (req, res) => {
  const { submission_id } = req.body;
  const user_id = req.user.id;

  try {
    // Verify ownership
    const subResult = await query('SELECT student_id, status, exam_id FROM submissions WHERE id = $1', [submission_id]);
    if (subResult.rows.length === 0) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    const submission = subResult.rows[0];

    if (submission.student_id !== user_id) {
      return res.status(403).json({ message: 'Forbidden: You do not own this submission' });
    }

    if (submission.status === 'submitted' || submission.status === 'finalized') {
      return res.status(400).json({ message: 'Submission already finalized' });
    }

    // Use a client for transaction support
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE submissions SET submitted_at = CURRENT_TIMESTAMP, status = 'submitted' WHERE id = $1`,
        [submission_id]
      );

      // Trigger real ATI grading
      await calculateScores(client, submission_id, submission.exam_id);

      await client.query('COMMIT');
      res.json({ message: "Exam submitted successfully" });
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('finishSubmission error:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Calculate scores for a submission using the real ATI engine.
 * For each answer, fetches the corresponding question's model_answer and key_points,
 * then calls the ATI engine for evaluation.
 */
async function calculateScores(client, submission_id, exam_id) {
  // Get the exam's questions to retrieve model answers and key points
  const examResult = await client.query('SELECT questions_json FROM exams WHERE id = $1', [exam_id]);
  if (examResult.rows.length === 0) {
    throw new Error(`Exam ${exam_id} not found`);
  }

  let questions;
  try {
    questions = JSON.parse(examResult.rows[0].questions_json);
  } catch (e) {
    throw new Error('Failed to parse exam questions JSON');
  }

  // Get all answers for this submission
  const answersResult = await client.query(
    'SELECT * FROM answers WHERE submission_id = $1',
    [submission_id]
  );

  let totalATI = 0;
  let answerCount = 0;

  for (const ans of answersResult.rows) {
    // Find the matching question by question_id
    const question = questions.find(q => q.id === ans.question_id || q.question_id === ans.question_id);

    // Extract model_answer and key_points from the question, with fallbacks
    const modelAnswer = question?.model_answer || question?.answer || '';
    const keyPoints = question?.key_points || [];

    let atiResult;

    if (modelAnswer && ans.answer_text) {
      try {
        atiResult = await evaluateATI(ans.answer_text, modelAnswer, keyPoints);
      } catch (err) {
        console.error(`ATI engine call failed for answer ${ans.id}:`, err.message);
        // Fallback to zero scores if the ATI engine is unreachable
        atiResult = {
          content_score: 0,
          pattern_score: 0,
          ati_score: 0,
          trust_level: 'Low Trust'
        };
      }
    } else {
      // No model answer or empty student answer
      atiResult = {
        content_score: 0,
        pattern_score: 0,
        ati_score: 0,
        trust_level: 'Low Trust'
      };
    }

    // Store content_score as semantic_score, pattern_score as reasoning_score
    await client.query(
      `INSERT INTO nlp_evaluations (answer_id, semantic_score, reasoning_score)
       VALUES ($1, $2, $3) ON CONFLICT (answer_id) DO UPDATE SET semantic_score = $2, reasoning_score = $3`,
      [ans.id, atiResult.content_score / 100, atiResult.pattern_score / 100]
    );

    // Store pattern_score as PAC similarity
    await client.query(
      `INSERT INTO pac_scores (answer_id, similarity_score)
       VALUES ($1, $2) ON CONFLICT (answer_id) DO UPDATE SET similarity_score = $2`,
      [ans.id, atiResult.pattern_score / 100]
    );

    // Store the full ATI score
    await client.query(
      `INSERT INTO ati_scores (answer_id, ati_value)
       VALUES ($1, $2) ON CONFLICT (answer_id) DO UPDATE SET ati_value = $2`,
      [ans.id, atiResult.ati_score]
    );

    totalATI += atiResult.ati_score;
    answerCount++;
  }

  // Calculate final grade
  const avgATI = answerCount > 0 ? totalATI / answerCount : 0;
  const trustFactor = avgATI >= 80 ? 1.0 : avgATI >= 55 ? 0.85 : 0.6;
  const finalScore = avgATI * trustFactor;

  await client.query(
    `INSERT INTO final_grades (submission_id, base_score, trust_factor, final_score)
     VALUES ($1, $2, $3, $4) ON CONFLICT (submission_id) DO UPDATE SET base_score = $2, trust_factor = $3, final_score = $4`,
    [submission_id, avgATI, trustFactor, finalScore]
  );
}