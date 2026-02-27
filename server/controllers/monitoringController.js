const { query, pool } = require('../config/db');
const { getIO } = require('../utils/socketSetup');

const AUTO_SUBMIT_THRESHOLD = 5;

exports.logEvent = async (req, res) => {
    try {
        const { examId, eventType, severity } = req.body;
        const studentId = req.user.id;

        if (!examId || !eventType) {
            return res.status(400).json({ message: 'Exam ID and event type are required' });
        }

        const severityLevel = ['low', 'medium', 'high'].includes(severity) ? severity : 'medium';

        // Insert log with severity
        await query(
            'INSERT INTO monitoring_logs (user_id, exam_id, event_type, severity) VALUES ($1, $2, $3, $4)',
            [studentId, examId, eventType, severityLevel]
        );

        // Increment violation count in students_exam
        const upsertResult = await query(`
            INSERT INTO students_exam (student_id, exam_id, violation_count)
            VALUES ($1, $2, 1)
            ON CONFLICT (student_id, exam_id)
            DO UPDATE SET violation_count = students_exam.violation_count + 1
            RETURNING violation_count, flagged
        `, [studentId, examId]);

        const { violation_count, flagged } = upsertResult.rows[0];

        // Auto-flag if >3 violations
        if (violation_count > 3 && !flagged) {
            await query(
                'UPDATE students_exam SET flagged = true WHERE student_id = $1 AND exam_id = $2',
                [studentId, examId]
            );
        }

        // Auto-submit if violation threshold exceeded
        let autoSubmitted = false;
        if (violation_count >= AUTO_SUBMIT_THRESHOLD) {
            const submission = await query(
                "SELECT id, status FROM submissions WHERE student_id = $1 AND exam_id = $2 AND status = 'in_progress'",
                [studentId, examId]
            );
            if (submission.rows.length > 0) {
                await query(
                    "UPDATE submissions SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP WHERE id = $1",
                    [submission.rows[0].id]
                );
                await query(
                    'UPDATE students_exam SET submitted = true WHERE student_id = $1 AND exam_id = $2',
                    [studentId, examId]
                );
                autoSubmitted = true;
            }
        }

        // Emit socket event
        const io = getIO();
        if (io) {
            io.to(`exam:${examId}`).emit('violation:new', {
                studentId,
                examId,
                eventType,
                severity: severityLevel,
                violationCount: violation_count,
                flagged: violation_count > 3,
                autoSubmitted,
                timestamp: new Date().toISOString()
            });
        }

        res.status(201).json({
            message: autoSubmitted ? 'Log recorded. Exam auto-submitted due to excessive violations.' : 'Log recorded',
            violationCount: violation_count,
            flagged: violation_count > 3,
            autoSubmitted
        });
    } catch (error) {
        console.error('Log event error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getLogs = async (req, res) => {
    try {
        const { examId } = req.params;
        const teacherId = req.user.id;

        // Verify teacher owns this exam
        const examResult = await query('SELECT * FROM exams WHERE id = $1 AND teacher_id = $2', [examId, teacherId]);
        if (examResult.rows.length === 0) {
            return res.status(403).json({ message: 'Unauthorized access to these logs' });
        }

        const logsResult = await query(`
            SELECT m.*, u.name as student_name, u.email as student_email 
            FROM monitoring_logs m
            JOIN users u ON m.user_id = u.id
            WHERE m.exam_id = $1
            ORDER BY m.timestamp DESC
        `, [examId]);

        res.json(logsResult.rows);
    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
