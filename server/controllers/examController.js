const { query, pool } = require('../config/db');
const { evaluateATI } = require('../utils/atiService');

// Create a new exam (teacher only)
exports.createExam = async (req, res) => {
    try {
        const { title, duration, questions } = req.body;
        const teacherId = req.user.id;

        if (!title || !duration || !questions) {
            return res.status(400).json({ message: 'Title, duration, and questions are required' });
        }

        const questionsJson = JSON.stringify(questions);

        const result = await query(
            `INSERT INTO exams (title, duration, questions_json, teacher_id, status, created_at)
             VALUES ($1, $2, $3, $4, 'scheduled', CURRENT_TIMESTAMP) RETURNING id`,
            [title, duration, questionsJson, teacherId]
        );

        res.status(201).json({ message: 'Exam created successfully', examId: result.rows[0].id });
    } catch (error) {
        console.error('Create exam error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get teacher's exams with optional filtering
exports.getTeacherExams = async (req, res) => {
    try {
        const teacherId = req.user.id;
        const { status, highViolations } = req.query;

        let sql = 'SELECT * FROM exams WHERE teacher_id = $1';
        const params = [teacherId];

        if (status) {
            params.push(status);
            sql += ` AND status = $${params.length}`;
        }

        sql += ' ORDER BY created_at DESC NULLS LAST';

        const result = await query(sql, params);
        let exams = result.rows;

        if (highViolations === 'true') {
            const enrichedResult = await query(`
                SELECT e.*, COUNT(m.id) as "violationCount"
                FROM exams e
                LEFT JOIN monitoring_logs m ON e.id = m.exam_id
                WHERE e.teacher_id = $1
                ${status ? `AND e.status = $2` : ''}
                GROUP BY e.id
                HAVING COUNT(m.id) > 5
                ORDER BY e.created_at DESC NULLS LAST
            `, status ? [teacherId, status] : [teacherId]);
            exams = enrichedResult.rows.map(row => ({ ...row, violationCount: parseInt(row.violationCount) }));
        }

        res.json(exams);
    } catch (error) {
        console.error('Get exams error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Submit exam — handles both MCQ and subjective questions.
 * Creates submission, individual answer rows, and triggers ATI scoring for subjective answers.
 */
exports.submitExam = async (req, res) => {
    try {
        const { examId, answers } = req.body;
        const studentId = req.user.id;

        if (!examId || !answers) {
            return res.status(400).json({ message: 'Exam ID and answers are required' });
        }

        // Check exam is not completed
        const examResult = await query('SELECT * FROM exams WHERE id = $1', [examId]);
        if (examResult.rows.length === 0) {
            return res.status(404).json({ message: 'Exam not found' });
        }
        const exam = examResult.rows[0];

        if (exam.status !== 'active') {
            return res.status(400).json({ message: 'Exam is not currently active' });
        }

        // Authorization: Verify the student is enrolled
        const enrollResult = await query('SELECT * FROM students_exam WHERE exam_id = $1 AND student_id = $2', [examId, studentId]);
        if (enrollResult.rows.length === 0) {
            return res.status(403).json({ message: 'Not enrolled in this exam' });
        }

        // Avoid double submission
        const subCheck = await query('SELECT id FROM submissions WHERE exam_id = $1 AND student_id = $2 AND status = $3', [examId, studentId, 'submitted']);
        if (subCheck.rows.length > 0) {
            return res.status(400).json({ message: 'Exam has already been submitted' });
        }

        // Parse exam questions
        let questions;
        try {
            questions = JSON.parse(exam.questions_json);
        } catch (e) {
            return res.status(500).json({ message: 'Failed to parse exam questions' });
        }

        // 1. Calculate MCQ score
        let mcqScore = 0;
        let mcqCount = 0;
        questions.forEach((q, index) => {
            if (q.type !== 'subjective') {
                mcqCount++;
                const ans = answers[index];
                if (ans && ans.selected === q.correctOption) {
                    mcqScore++;
                }
            }
        });

        // 2. ATI scoring for subjective (outside transaction to avoid hanging)
        let totalATI = 0;
        let subjectiveCount = 0;
        const atiEvaluations = [];

        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            const ans = answers[i] || answers[String(i)];

            let answerText = '';
            if (q.type === 'subjective') {
                answerText = ans?.text || '';
            } else {
                const selectedIndex = ans?.selected;
                answerText = (selectedIndex !== undefined && q.options) ? q.options[selectedIndex] || '' : '';
            }

            atiEvaluations.push({ questionIndex: i, answerText, q });

            if (q.type === 'subjective' && answerText.trim()) {
                const modelAnswer = q.model_answer || '';
                const keyPoints = q.key_points || [];

                let atiResult;
                try {
                    atiResult = await evaluateATI(answerText, modelAnswer, keyPoints);
                } catch (err) {
                    console.error(`ATI engine call failed:`, err.message);
                    atiResult = {
                        content_score: 0,
                        pattern_score: 0,
                        ati_score: 0,
                        trust_level: 'Low Trust'
                    };
                }

                atiEvaluations[i].atiResult = atiResult;
                totalATI += atiResult.ati_score;
                subjectiveCount++;
            }
        }

        // 3. Calculate final grade
        let finalScore = 0;
        let trustFactor = 1.0;
        let baseScore = 0;

        if (subjectiveCount > 0) {
            const avgATI = totalATI / subjectiveCount;
            trustFactor = avgATI >= 80 ? 1.0 : avgATI >= 55 ? 0.85 : 0.6;

            // Blend MCQ + ATI scores
            const mcqPercent = mcqCount > 0 ? (mcqScore / mcqCount) * 100 : 0;
            const totalQuestions = mcqCount + subjectiveCount;
            const mcqWeight = mcqCount / totalQuestions;
            const subjectiveWeight = subjectiveCount / totalQuestions;

            baseScore = (mcqPercent * mcqWeight + avgATI * subjectiveWeight);
            finalScore = baseScore * trustFactor;
        } else {
            // Pure MCQ exam
            baseScore = mcqCount > 0 ? (mcqScore / mcqCount) * 100 : 0;
            finalScore = baseScore;
            trustFactor = 1.0;
        }

        // Use a transaction for the entire DB save operation
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const subResult = await client.query(
                `INSERT INTO submissions (student_id, exam_id, answers_json, score, status, submitted_at)
                     VALUES ($1, $2, $3, $4, 'submitted', CURRENT_TIMESTAMP) RETURNING id`,
                [studentId, examId, JSON.stringify(answers), mcqScore]
            );
            const submissionId = subResult.rows[0].id;

            for (const evalData of atiEvaluations) {
                const { questionIndex, answerText, q, atiResult } = evalData;

                const answerResult = await client.query(
                    'INSERT INTO answers (submission_id, question_id, answer_text) VALUES ($1, $2, $3) RETURNING id',
                    [submissionId, q.id || questionIndex, answerText]
                );
                const answerId = answerResult.rows[0].id;

                if (atiResult) {
                    await client.query(
                        `INSERT INTO nlp_evaluations (answer_id, semantic_score, reasoning_score)
                             VALUES ($1, $2, $3)`,
                        [answerId, atiResult.content_score / 100, atiResult.pattern_score / 100]
                    );

                    await client.query(
                        `INSERT INTO pac_scores (answer_id, similarity_score) VALUES ($1, $2)`,
                        [answerId, atiResult.pattern_score / 100]
                    );

                    await client.query(
                        `INSERT INTO ati_scores (answer_id, ati_value) VALUES ($1, $2)`,
                        [answerId, atiResult.ati_score]
                    );
                }
            }

            await client.query(
                `INSERT INTO final_grades (submission_id, base_score, trust_factor, final_score)
                     VALUES ($1, $2, $3, $4)`,
                [submissionId, baseScore, trustFactor, finalScore]
            );

            await client.query(
                `UPDATE students_exam SET submitted = true WHERE student_id = $1 AND exam_id = $2`,
                [studentId, examId]
            );

            await client.query('COMMIT');

            res.status(201).json({
                message: 'Exam submitted successfully',
                submissionId,
                mcqScore: mcqCount > 0 ? `${mcqScore}/${mcqCount}` : 'N/A',
                subjectiveEvaluated: subjectiveCount,
                finalScore: Math.round(finalScore * 10) / 10
            });
        } catch (txErr) {
            await client.query('ROLLBACK');
            throw txErr;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Submit exam error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get exam stats (teacher only)
exports.getExamStats = async (req, res) => {
    try {
        const { id } = req.params;
        const teacherId = req.user.id;

        const examResult = await query('SELECT * FROM exams WHERE id = $1 AND teacher_id = $2', [id, teacherId]);
        if (examResult.rows.length === 0) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const studentsJoined = await query('SELECT COUNT(*) as count FROM students_exam WHERE exam_id = $1', [id]);
        const submissionsCount = await query('SELECT COUNT(*) as count FROM submissions WHERE exam_id = $1', [id]);
        const violationCount = await query('SELECT COUNT(*) as count FROM monitoring_logs WHERE exam_id = $1', [id]);
        const flaggedCount = await query('SELECT COUNT(*) as count FROM students_exam WHERE exam_id = $1 AND flagged = true', [id]);

        res.json({
            studentsJoined: parseInt(studentsJoined.rows[0].count),
            submissions: parseInt(submissionsCount.rows[0].count),
            violations: parseInt(violationCount.rows[0].count),
            flaggedStudents: parseInt(flaggedCount.rows[0].count),
            exam: examResult.rows[0]
        });
    } catch (error) {
        console.error('Exam stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get flagged students for an exam (teacher only)
exports.getExamFlagged = async (req, res) => {
    try {
        const { id } = req.params;
        const teacherId = req.user.id;

        const examResult = await query('SELECT * FROM exams WHERE id = $1 AND teacher_id = $2', [id, teacherId]);
        if (examResult.rows.length === 0) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const flagged = await query(`
            SELECT se.*, u.name, u.email
            FROM students_exam se
            JOIN users u ON se.student_id = u.id
            WHERE se.exam_id = $1 AND se.flagged = true
            ORDER BY se.violation_count DESC
        `, [id]);

        res.json(flagged.rows);
    } catch (error) {
        console.error('Flagged students error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Export exam logs as CSV (teacher only)
exports.exportExamLogs = async (req, res) => {
    try {
        const { id } = req.params;
        const teacherId = req.user.id;

        const examResult = await query('SELECT * FROM exams WHERE id = $1 AND teacher_id = $2', [id, teacherId]);
        if (examResult.rows.length === 0) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const logsResult = await query(`
            SELECT m.id, u.name as student_name, u.email as student_email,
                   m.event_type, m.severity, m.timestamp
            FROM monitoring_logs m
            JOIN users u ON m.user_id = u.id
            WHERE m.exam_id = $1
            ORDER BY m.timestamp DESC
        `, [id]);

        const escapeCSV = (field) => {
            if (field == null) return '""';
            let str = String(field);
            if (/^[=+\-@]/.test(str)) {
                str = "'" + str;
            }
            return `"${str.replace(/"/g, '""')}"`;
        };

        const headers = 'ID,Student Name,Student Email,Event Type,Severity,Timestamp\n';
        const rows = logsResult.rows.map(r =>
            `${escapeCSV(r.id)},${escapeCSV(r.student_name)},${escapeCSV(r.student_email)},${escapeCSV(r.event_type)},${escapeCSV(r.severity || 'medium')},${escapeCSV(r.timestamp)}`
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=exam_${id}_logs.csv`);
        res.send(headers + rows);
    } catch (error) {
        console.error('Export logs error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
