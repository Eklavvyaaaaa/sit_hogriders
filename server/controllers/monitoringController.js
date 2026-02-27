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

        const { violation_count, flagged: initiallyFlagged } = upsertResult.rows[0];
        let isFlagged = initiallyFlagged;

        // Auto-flag if >3 violations
        if (violation_count > 3 && !isFlagged) {
            await query(
                'UPDATE students_exam SET flagged = true WHERE student_id = $1 AND exam_id = $2',
                [studentId, examId]
            );
            isFlagged = true;
        }

        // Auto-submit if violation threshold exceeded
        let autoSubmitted = false;
        if (violation_count >= AUTO_SUBMIT_THRESHOLD) {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                const submission = await client.query(
                    "SELECT id, status FROM submissions WHERE student_id = $1 AND exam_id = $2 AND status = 'in_progress'",
                    [studentId, examId]
                );

                if (submission.rows.length > 0) {
                    await client.query(
                        "UPDATE submissions SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP WHERE id = $1",
                        [submission.rows[0].id]
                    );
                    await client.query(
                        'UPDATE students_exam SET submitted = true WHERE student_id = $1 AND exam_id = $2',
                        [studentId, examId]
                    );
                    autoSubmitted = true;
                }
                await client.query('COMMIT');
            } catch (err) {
                await client.query('ROLLBACK');
                console.error('Transaction error in auto-submit:', err);
                autoSubmitted = false;
            } finally {
                client.release();
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
                flagged: isFlagged,
                autoSubmitted,
                timestamp: new Date().toISOString()
            });
        }

        res.status(201).json({
            message: autoSubmitted ? 'Log recorded. Exam auto-submitted due to excessive violations.' : 'Log recorded',
            violationCount: violation_count,
            flagged: isFlagged,
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

exports.terminateSession = async (req, res) => {
    try {
        const { examId } = req.body;
        const studentId = req.user.id;

        if (!examId) {
            return res.status(400).json({ message: 'Exam ID is required for termination.' });
        }

        // Add columns if they don't exist yet (safe migration)
        try {
            await query(`ALTER TABLE students_exam ADD COLUMN IF NOT EXISTS terminated BOOLEAN DEFAULT false;`);
            await query(`ALTER TABLE students_exam ADD COLUMN IF NOT EXISTS terminated_at TIMESTAMP;`);
        } catch (e) {
            console.error('Migration notice:', e.message);
        }

        const result = await query(`
            UPDATE students_exam 
            SET terminated = true, terminated_at = CURRENT_TIMESTAMP
            WHERE student_id = $1 AND exam_id = $2
            RETURNING *
        `, [studentId, examId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Student exam session not found.' });
        }

        const io = getIO();
        if (io) {
            io.to(`exam:${examId}`).emit('student:terminated', {
                studentId,
                examId,
                timestamp: new Date().toISOString()
            });
        }

        res.json({ message: 'Session terminated successfully due to excessive alerts.' });
    } catch (error) {
        console.error('Terminate session error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.requestLastChance = async (req, res) => {
    try {
        const { examId } = req.body;
        const studentId = req.user.id;

        if (!examId) {
            return res.status(400).json({ message: 'Exam ID is required.' });
        }

        // Add column safely if missing
        try {
            await query(`ALTER TABLE students_exam ADD COLUMN IF NOT EXISTS last_chance_used BOOLEAN DEFAULT false;`);
        } catch (e) {
            console.error('Migration notice:', e.message);
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const checkResult = await client.query(`
                SELECT last_chance_used, terminated FROM students_exam 
                WHERE student_id = $1 AND exam_id = $2
                FOR UPDATE
            `, [studentId, examId]);

            if (checkResult.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ message: 'Session not found.' });
            }

            if (checkResult.rows[0].last_chance_used) {
                await client.query('ROLLBACK');
                return res.status(403).json({ message: 'Last chance attempt already used. Exam is permanently locked.' });
            }

            if (!checkResult.rows[0].terminated) {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: 'Session is not terminated yet.' });
            }

            // Wipe logs so they start fresh
            await client.query(`
                DELETE FROM monitoring_logs 
                WHERE user_id = $1 AND exam_id = $2
            `, [studentId, examId]);

            // Reset violations safely
            await client.query(`
                UPDATE students_exam 
                SET terminated = false, violation_count = 0, last_chance_used = true
                WHERE student_id = $1 AND exam_id = $2
            `, [studentId, examId]);

            await client.query('COMMIT');
            res.json({ message: 'Last chance granted. Warnings resetted to 0.' });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Last chance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
