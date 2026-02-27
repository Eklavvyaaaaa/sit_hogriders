const pool = require('../config/db');

// Start submission (already done in joinExamByCode if you used it)
// Now we handle answer submission

exports.submitAnswer = async (req, res) => {
  const { submission_id, question_id, answer_text } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO answers (submission_id, question_id, answer_text)
       VALUES ($1,$2,$3)
       RETURNING *`,
      [submission_id, question_id, answer_text]
    );

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.finishSubmission = async (req, res) => {
  const { submission_id } = req.body;

  try {
    await pool.query(
      `UPDATE submissions
       SET submitted_at = NOW(), status = 'submitted'
       WHERE id=$1`,
      [submission_id]
    );

    // Now trigger grading logic
    await calculateScores(submission_id);

    res.json({ message: "Exam submitted successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
async function calculateScores(submission_id) {

  const answers = await pool.query(
    `SELECT * FROM answers WHERE submission_id=$1`,
    [submission_id]
  );

  let baseScore = 0;

  for (let ans of answers.rows) {

    // MOCK NLP score
    const semantic = Math.random();
    const reasoning = Math.random();

    // MOCK PAC score
    const pac = Math.random();

    // Calculate ATI
    const ati = (0.5 * semantic) + (0.3 * reasoning) + (0.2 * pac);

    await pool.query(
      `INSERT INTO nlp_evaluations (answer_id, semantic_score, reasoning_score)
       VALUES ($1,$2,$3)`,
      [ans.id, semantic, reasoning]
    );

    await pool.query(
      `INSERT INTO pac_scores (answer_id, similarity_score)
       VALUES ($1,$2)`,
      [ans.id, pac]
    );

    await pool.query(
      `INSERT INTO ati_scores (answer_id, ati_value)
       VALUES ($1,$2)`,
      [ans.id, ati]
    );

    baseScore += semantic * 10; // demo scoring
  }

  const trustFactor = 0.8; // simplified for demo
  const finalScore = baseScore * trustFactor;

  await pool.query(
    `INSERT INTO final_grades (submission_id, base_score, trust_factor, final_score)
     VALUES ($1,$2,$3,$4)`,
    [submission_id, baseScore, trustFactor, finalScore]
  );
}