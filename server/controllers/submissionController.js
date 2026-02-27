const { query, pool } = require('../config/db');
const { evaluateATI } = require('../utils/atiService');

/**
 * Shared helper: finalizes a submission (ownership, time check, scoring, exam completion).
 * Used by both finishSubmission and submitExam to eliminate duplication.
 */
async function finalizeSubmission(submissionId, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the submission row to prevent TOCTOU race conditions
    const subResult = await client.query(
      'SELECT student_id, status, exam_id FROM submissions WHERE id = $1 FOR UPDATE',
      [submissionId]
    );
    if (subResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { statusCode: 404, body: { message: 'Submission not found' } };
    }

    const submission = subResult.rows[0];

    if (submission.student_id !== userId) {
      await client.query('ROLLBACK');
      return { statusCode: 403, body: { message: 'Forbidden: You do not own this submission' } };
    }

    if (submission.status === 'submitted' || submission.status === 'finalized') {
      await client.query('ROLLBACK');
      return { statusCode: 400, body: { message: 'Submission already finalized' } };
    }

    // Time-based guard: if submission_time >= end_time, mark as auto-submitted
    let isAutoSubmitted = false;
    const examResult = await client.query('SELECT end_time FROM exams WHERE id = $1', [submission.exam_id]);
    if (examResult.rows.length > 0 && examResult.rows[0].end_time) {
      const endTime = new Date(examResult.rows[0].end_time);
      if (new Date() >= endTime) {
        isAutoSubmitted = true;
      }
    }

    // Use explicit WHERE status = 'in_progress' to prevent concurrent double-submits
    const updateResult = await client.query(
      `UPDATE submissions SET submitted_at = CURRENT_TIMESTAMP, status = 'submitted' WHERE id = $1 AND status = 'in_progress' RETURNING id`,
      [submissionId]
    );

    if (updateResult.rowCount === 0) {
      // Another concurrent request already submitted this
      await client.query('ROLLBACK');
      return { statusCode: 400, body: { message: 'Submission already finalized' } };
    }

    // Trigger real ATI grading
    await calculateScores(client, submissionId, submission.exam_id);

    // Check if all students have submitted for this exam; if so, mark exam completed
    await checkAndCompleteExam(client, submission.exam_id);

    await client.query('COMMIT');
    return {
      statusCode: 200,
      body: {
        message: isAutoSubmitted
          ? 'Exam auto-submitted (time expired)'
          : 'Exam submitted successfully',
        autoSubmitted: isAutoSubmitted
      }
    };
  } catch (txErr) {
    await client.query('ROLLBACK');
    throw txErr;
  } finally {
    client.release();
  }
}

// Submit an individual answer for a given submission (transactional with TOCTOU protection)
exports.submitAnswer = async (req, res) => {
  const { submission_id, question_id, answer_text } = req.body;
  const user_id = req.user.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the submission row to prevent TOCTOU race conditions
    const subResult = await client.query(
      'SELECT student_id, status, exam_id FROM submissions WHERE id = $1 FOR UPDATE',
      [submission_id]
    );
    if (subResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Submission not found' });
    }

    const submission = subResult.rows[0];

    if (submission.student_id !== user_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Forbidden: You do not own this submission' });
    }

    if (submission.status === 'submitted' || submission.status === 'finalized') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Submission already finalized' });
    }

    // Time-based guard: reject answers after exam end_time
    const examResult = await client.query('SELECT end_time FROM exams WHERE id = $1', [submission.exam_id]);
    if (examResult.rows.length > 0 && examResult.rows[0].end_time) {
      const endTime = new Date(examResult.rows[0].end_time);
      if (new Date() >= endTime) {
        await client.query('ROLLBACK');
        // Auto-submit this student's submission since time is up
        await autoForceSubmit(submission_id, submission.exam_id);
        return res.status(403).json({ message: 'Exam time has expired. Your answers have been auto-submitted.' });
      }
    }

    const result = await client.query(
      'INSERT INTO answers (submission_id, question_id, answer_text) VALUES ($1, $2, $3) RETURNING *',
      [submission_id, question_id, answer_text]
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// Finalize a submission: mark as submitted and calculate scores
exports.finishSubmission = async (req, res) => {
  const { submission_id } = req.body;
  const user_id = req.user.id;

  try {
    const result = await finalizeSubmission(submission_id, user_id);
    res.status(result.statusCode).json(result.body);
  } catch (err) {
    console.error('finishSubmission error:', err);
    res.status(500).json({ error: err.message });
  }
};

// POST /submission/submit — canonical submission endpoint
exports.submitExam = async (req, res) => {
  const { submission_id } = req.body;
  const user_id = req.user.id;

  try {
    const result = await finalizeSubmission(submission_id, user_id);
    res.status(result.statusCode).json(result.body);
  } catch (err) {
    console.error('submitExam error:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /submission/status/:examId — check submission status for current user
exports.getSubmissionStatus = async (req, res) => {
  const { examId } = req.params;
  const studentId = req.user.id;

  try {
    const examResult = await query('SELECT id, status, end_time, duration FROM exams WHERE id = $1', [examId]);
    if (examResult.rows.length === 0) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    const exam = examResult.rows[0];

    // Ownership/membership guard: verify student is enrolled or has a submission
    const enrollmentResult = await query(
      'SELECT student_id FROM students_exam WHERE student_id = $1 AND exam_id = $2',
      [studentId, examId]
    );
    const subResult = await query(
      'SELECT id, status, submitted_at FROM submissions WHERE student_id = $1 AND exam_id = $2',
      [studentId, examId]
    );

    if (enrollmentResult.rows.length === 0 && subResult.rows.length === 0) {
      return res.status(403).json({ message: 'You are not enrolled in this exam' });
    }

    const submission = subResult.rows.length > 0 ? subResult.rows[0] : null;

    // Calculate remaining time
    let remainingSeconds = null;
    let isExpired = false;
    if (exam.end_time) {
      const msRemaining = new Date(exam.end_time).getTime() - Date.now();
      remainingSeconds = Math.max(0, Math.floor(msRemaining / 1000));
      isExpired = msRemaining <= 0;
    }

    res.json({
      examId: exam.id,
      examStatus: exam.status,
      endTime: exam.end_time,
      remainingSeconds,
      isExpired,
      submission: submission ? {
        id: submission.id,
        status: submission.status,
        submittedAt: submission.submitted_at
      } : null
    });
  } catch (err) {
    console.error('getSubmissionStatus error:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Auto force-submit a student's in-progress submission when time expires.
 * Re-throws errors so callers see the failure.
 */
async function autoForceSubmit(submissionId, examId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Only update if still in_progress
    const result = await client.query(
      `UPDATE submissions SET submitted_at = CURRENT_TIMESTAMP, status = 'submitted' WHERE id = $1 AND status = 'in_progress' RETURNING id`,
      [submissionId]
    );

    if (result.rowCount > 0) {
      await calculateScores(client, submissionId, examId);
      await checkAndCompleteExam(client, examId);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('autoForceSubmit error:', err);
    throw err; // Re-throw so callers see the failure
  } finally {
    client.release();
  }
}

/**
 * Check if all students for an exam have submitted. If so, mark the exam as completed.
 */
async function checkAndCompleteExam(client, examId) {
  try {
    // Count students who haven't submitted
    const pendingResult = await client.query(`
      SELECT COUNT(*) as pending
      FROM students_exam se
      LEFT JOIN submissions s ON s.student_id = se.student_id AND s.exam_id = se.exam_id
      WHERE se.exam_id = $1 AND (s.status IS NULL OR s.status = 'in_progress')
    `, [examId]);

    const pendingCount = parseInt(pendingResult.rows[0].pending, 10);

    if (pendingCount === 0) {
      await client.query("UPDATE exams SET status = 'completed' WHERE id = $1 AND status = 'active'", [examId]);
    }
  } catch (err) {
    console.error('checkAndCompleteExam error:', err);
    // Don't throw — this is a best-effort check
  }
}

/**
 * Calculate scores for a submission using the real ATI engine.
 */
async function calculateScores(client, submission_id, exam_id) {
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

  const answersResult = await client.query(
    'SELECT * FROM answers WHERE submission_id = $1',
    [submission_id]
  );

  let totalATI = 0;
  let answerCount = 0;

  for (const ans of answersResult.rows) {
    const question = questions.find(q => q.id === ans.question_id || q.question_id === ans.question_id);

    const modelAnswer = question?.model_answer || question?.answer || '';
    const keyPoints = question?.key_points || [];

    let atiResult;

    if (modelAnswer && ans.answer_text) {
      try {
        atiResult = await evaluateATI(ans.answer_text, modelAnswer, keyPoints);
      } catch (err) {
        console.error(`ATI engine call failed for answer ${ans.id}:`, err.message);
        atiResult = {
          content_score: 0,
          pattern_score: 0,
          ati_score: 0,
          trust_level: 'Low Trust'
        };
      }
    } else {
      atiResult = {
        content_score: 0,
        pattern_score: 0,
        ati_score: 0,
        trust_level: 'Low Trust'
      };
    }

    await client.query(
      `INSERT INTO nlp_evaluations (answer_id, semantic_score, reasoning_score)
       VALUES ($1, $2, $3) ON CONFLICT (answer_id) DO UPDATE SET semantic_score = $2, reasoning_score = $3`,
      [ans.id, atiResult.content_score / 100, atiResult.pattern_score / 100]
    );

    await client.query(
      `INSERT INTO pac_scores (answer_id, similarity_score)
       VALUES ($1, $2) ON CONFLICT (answer_id) DO UPDATE SET similarity_score = $2`,
      [ans.id, atiResult.pattern_score / 100]
    );

    await client.query(
      `INSERT INTO ati_scores (answer_id, ati_value)
       VALUES ($1, $2) ON CONFLICT (answer_id) DO UPDATE SET ati_value = $2`,
      [ans.id, atiResult.ati_score]
    );

    totalATI += atiResult.ati_score;
    answerCount++;
  }

  const avgATI = answerCount > 0 ? totalATI / answerCount : 0;
  const trustFactor = avgATI >= 80 ? 1.0 : avgATI >= 55 ? 0.85 : 0.6;
  const finalScore = avgATI * trustFactor;

  await client.query(
    `INSERT INTO final_grades (submission_id, base_score, trust_factor, final_score)
     VALUES ($1, $2, $3, $4) ON CONFLICT (submission_id) DO UPDATE SET base_score = $2, trust_factor = $3, final_score = $4`,
    [submission_id, avgATI, trustFactor, finalScore]
  );
}