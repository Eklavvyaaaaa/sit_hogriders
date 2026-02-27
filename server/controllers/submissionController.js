const { query, pool } = require('../config/db');

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

    // Use a client for transaction support
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE submissions SET submitted_at = CURRENT_TIMESTAMP, status = 'submitted' WHERE id = $1`,
        [submission_id]
      );

      // Trigger grading logic
      await calculateScores(client, submission_id);

      await client.query('COMMIT');
      res.json({ message: "Exam submitted successfully" });
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Calculate scores for a submission using mock NLP/PAC scoring.
 * Uses a dedicated client for transaction safety.
 */
async function calculateScores(client, submission_id) {
  const answersResult = await client.query(
    'SELECT * FROM answers WHERE submission_id = $1',
    [submission_id]
  );

  let baseScore = 0;

  for (let ans of answersResult.rows) {
    // MOCK NLP score
    const semantic = Math.random();
    const reasoning = Math.random();

    // MOCK PAC score
    const pac = Math.random();

    // Calculate ATI
    const ati = (0.5 * semantic) + (0.3 * reasoning) + (0.2 * pac);

    await client.query(
      `INSERT INTO nlp_evaluations (answer_id, semantic_score, reasoning_score)
       VALUES ($1, $2, $3) ON CONFLICT (answer_id) DO NOTHING`,
      [ans.id, semantic, reasoning]
    );

    await client.query(
      `INSERT INTO pac_scores (answer_id, similarity_score)
       VALUES ($1, $2) ON CONFLICT (answer_id) DO NOTHING`,
      [ans.id, pac]
    );

    await client.query(
      `INSERT INTO ati_scores (answer_id, ati_value)
       VALUES ($1, $2) ON CONFLICT (answer_id) DO NOTHING`,
      [ans.id, ati]
    );

    baseScore += semantic * 10; // demo scoring
  }

  const trustFactor = 0.8; // simplified for demo
  const finalScore = baseScore * trustFactor;

  await client.query(
    `INSERT INTO final_grades (submission_id, base_score, trust_factor, final_score)
     VALUES ($1, $2, $3, $4) ON CONFLICT (submission_id) DO NOTHING`,
    [submission_id, baseScore, trustFactor, finalScore]
  );
}