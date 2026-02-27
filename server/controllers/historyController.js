const { query } = require('../config/db');

// Student: get their own exam history
exports.getStudentHistory = async (req, res) => {
    try {
        const studentId = req.user.id;

        const result = await query(`
            SELECT
                s.id as submission_id,
                s.exam_id,
                s.score as mcq_score,
                s.status,
                s.submitted_at,
                e.title as exam_title,
                e.duration,
                e.status as exam_status,
                fg.base_score,
                fg.trust_factor,
                fg.final_score,
                se.violation_count,
                se.flagged
            FROM submissions s
            JOIN exams e ON s.exam_id = e.id
            LEFT JOIN final_grades fg ON fg.submission_id = s.id
            LEFT JOIN students_exam se ON se.student_id = s.student_id AND se.exam_id = s.exam_id
            WHERE s.student_id = $1
            ORDER BY s.submitted_at DESC NULLS LAST
        `, [studentId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Student history error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Student: get detailed results for a specific submission
exports.getSubmissionDetail = async (req, res) => {
    try {
        const { submissionId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        // Get submission
        const subResult = await query('SELECT * FROM submissions WHERE id = $1', [submissionId]);
        if (subResult.rows.length === 0) {
            return res.status(404).json({ message: 'Submission not found' });
        }
        const submission = subResult.rows[0];

        // Authorization: student can only see their own, teacher can see their exam's submissions
        if (userRole === 'student' && submission.student_id !== userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        if (userRole === 'teacher') {
            const examCheck = await query('SELECT id FROM exams WHERE id = $1 AND teacher_id = $2', [submission.exam_id, userId]);
            if (examCheck.rows.length === 0) {
                return res.status(403).json({ message: 'Unauthorized' });
            }
        }

        // Get exam info
        const examResult = await query('SELECT * FROM exams WHERE id = $1', [submission.exam_id]);
        if (!examResult.rows || examResult.rows.length === 0) {
            return res.status(404).json({ message: 'Exam not found' });
        }
        const exam = examResult.rows[0];
        let questions = [];
        try {
            questions = JSON.parse(exam.questions_json);
        } catch (err) {
            console.error('Failed to parse questions_json', err);
        }

        // Get individual answers with scores
        const answersResult = await query(`
            SELECT
                a.id as answer_id,
                a.question_id,
                a.answer_text,
                ne.semantic_score,
                ne.reasoning_score,
                ati.ati_value as ati_score,
                pac.similarity_score
            FROM answers a
            LEFT JOIN nlp_evaluations ne ON ne.answer_id = a.id
            LEFT JOIN ati_scores ati ON ati.answer_id = a.id
            LEFT JOIN pac_scores pac ON pac.answer_id = a.id
            WHERE a.submission_id = $1
            ORDER BY a.question_id
        `, [submissionId]);

        // Get final grade
        const gradeResult = await query('SELECT * FROM final_grades WHERE submission_id = $1', [submissionId]);

        // Get student info
        const studentResult = await query('SELECT id, name, email FROM users WHERE id = $1', [submission.student_id]);

        res.json({
            submission,
            student: studentResult.rows[0],
            exam: { id: exam.id, title: exam.title, duration: exam.duration, status: exam.status },
            questions,
            answers: answersResult.rows,
            finalGrade: gradeResult.rows[0] || null
        });
    } catch (error) {
        console.error('Submission detail error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Teacher: get all student results for an exam
exports.getExamResults = async (req, res) => {
    try {
        const { examId } = req.params;
        const teacherId = req.user.id;

        // Verify teacher owns this exam
        const examResult = await query('SELECT * FROM exams WHERE id = $1 AND teacher_id = $2', [examId, teacherId]);
        if (examResult.rows.length === 0) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const results = await query(`
            SELECT
                s.id as submission_id,
                s.score as mcq_score,
                s.status,
                s.submitted_at,
                u.id as student_id,
                u.name as student_name,
                u.email as student_email,
                fg.base_score,
                fg.trust_factor,
                fg.final_score,
                se.violation_count,
                se.flagged
            FROM submissions s
            JOIN users u ON s.student_id = u.id
            LEFT JOIN final_grades fg ON fg.submission_id = s.id
            LEFT JOIN students_exam se ON se.student_id = s.student_id AND se.exam_id = s.exam_id
            WHERE s.exam_id = $1
            ORDER BY fg.final_score DESC NULLS LAST
        `, [examId]);

        res.json({
            exam: examResult.rows[0],
            results: results.rows
        });
    } catch (error) {
        console.error('Exam results error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
