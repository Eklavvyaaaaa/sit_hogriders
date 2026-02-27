const { getDB } = require('../config/db');

// Start submission (already done in joinExamByCode if you used it)
// Now we handle answer submission

exports.submitAnswer = async (req, res) => {
  const { submission_id, question_id, answer_text } = req.body;
  const user_id = req.user.id;

  try {
    const db = getDB();

    // Verify ownership
    const submission = await db.get('SELECT student_id FROM submissions WHERE id = ?', [submission_id]);

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    if (submission.student_id !== user_id) {
      return res.status(403).json({ message: 'Forbidden: You do not own this submission' });
    }

    const result = await db.run(
      `INSERT INTO answers (submission_id, question_id, answer_text)
       VALUES (?,?,?)`,
      [submission_id, question_id, answer_text]
    );

    const insertedAnswer = await db.get('SELECT * FROM answers WHERE id = ?', [result.lastID]);

    res.json(insertedAnswer);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.finishSubmission = async (req, res) => {
  const { submission_id } = req.body;
  const user_id = req.user.id;

  try {
    const db = getDB();

    // Verify ownership
    const submission = await db.get('SELECT student_id, status FROM submissions WHERE id = ?', [submission_id]);

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    if (submission.student_id !== user_id) {
      return res.status(403).json({ message: 'Forbidden: You do not own this submission' });
    }

    if (submission.status === 'submitted' || submission.status === 'finalized') {
      return res.status(400).json({ message: 'Submission already finalized' });
    }

    await db.run('BEGIN TRANSACTION');

    try {
      await db.run(
        `UPDATE submissions
         SET submitted_at = CURRENT_TIMESTAMP, status = 'submitted'
         WHERE id=?`,
        [submission_id]
      );

      // Now trigger grading logic
      await calculateScores(db, submission_id);

      await db.run('COMMIT');
      res.json({ message: "Exam submitted successfully" });

    } catch (txErr) {
      await db.run('ROLLBACK');
      throw txErr;
    }

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
async function calculateScores(db, submission_id) {

  const answers = await db.all(
    `SELECT * FROM answers WHERE submission_id=?`,
    [submission_id]
  );

  let baseScore = 0;

  for (let ans of answers) {

    // MOCK NLP score
    const semantic = Math.random();
    const reasoning = Math.random();

    // MOCK PAC score
    const pac = Math.random();

    // Calculate ATI
    const ati = (0.5 * semantic) + (0.3 * reasoning) + (0.2 * pac);

    await db.run(
      `INSERT OR IGNORE INTO nlp_evaluations (answer_id, semantic_score, reasoning_score)
       VALUES (?,?,?)`,
      [ans.id, semantic, reasoning]
    );

    await db.run(
      `INSERT OR IGNORE INTO pac_scores (answer_id, similarity_score)
       VALUES (?,?)`,
      [ans.id, pac]
    );

    await db.run(
      `INSERT OR IGNORE INTO ati_scores (answer_id, ati_value)
       VALUES (?,?)`,
      [ans.id, ati]
    );

    baseScore += semantic * 10; // demo scoring
  }

  const trustFactor = 0.8; // simplified for demo
  const finalScore = baseScore * trustFactor;

  await db.run(
    `INSERT OR IGNORE INTO final_grades (submission_id, base_score, trust_factor, final_score)
     VALUES (?,?,?,?)`,
    [submission_id, baseScore, trustFactor, finalScore]
  );
}