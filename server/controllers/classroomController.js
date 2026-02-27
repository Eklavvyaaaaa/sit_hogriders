const { query } = require('../config/db');
const generateCode = require('../utils/generateCode');
const { getIO } = require('../utils/socketSetup');

// Configurable join buffer (minutes after exam start)
const JOIN_BUFFER_MINUTES = 5;

// Fields to strip from questions before sending to students
const GRADING_FIELDS = ['correctOption', 'correct_option', 'model_answer', 'key_points', 'answer', 'correct_answer', 'grading_rubric'];

/**
 * Sanitize questions: remove grading-related fields so students don't see answer keys.
 */
function sanitizeQuestions(questionsJson) {
    let questions;
    try {
        questions = JSON.parse(questionsJson);
    } catch (err) {
        throw new Error(`sanitizeQuestions: Malformed questions payload — ${err.message}`);
    }
    if (!Array.isArray(questions)) {
        throw new Error('sanitizeQuestions: Expected questions to be an array, got ' + typeof questions);
    }

    return questions.map(q => {
        const sanitized = { ...q };
        for (const field of GRADING_FIELDS) {
            delete sanitized[field];
        }
        return sanitized;
    });
}

exports.generateClassroom = async (req, res) => {
    try {
        const { examId } = req.body;
        const teacherId = req.user.id;

        if (!examId) {
            return res.status(400).json({ message: 'Exam ID is required' });
        }

        // Verify exam belongs to teacher
        const examResult = await query('SELECT * FROM exams WHERE id = $1 AND teacher_id = $2', [examId, teacherId]);
        if (examResult.rows.length === 0) {
            return res.status(404).json({ message: 'Exam not found or unauthorized' });
        }

        const exam = examResult.rows[0];

        // Calculate expiration: now + exam duration (in minutes) + 30 min buffer
        const expiresAt = new Date(Date.now() + (exam.duration + 30) * 60 * 1000);

        let code;
        let isUnique = false;
        let insertedId;

        const maxAttempts = 10;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            code = generateCode();
            try {
                const result = await query(
                    'INSERT INTO classrooms (code, exam_id, teacher_id, expires_at) VALUES ($1, $2, $3, $4) RETURNING id',
                    [code, examId, teacherId, expiresAt.toISOString()]
                );
                isUnique = true;
                insertedId = result.rows[0].id;
                break;
            } catch (dbError) {
                if (dbError.code === '23505') {
                    continue;
                }
                throw dbError;
            }
        }

        if (!isUnique) {
            return res.status(500).json({ message: 'Failed to generate a unique classroom code' });
        }

        res.status(201).json({
            message: 'Classroom generated successfully',
            code,
            classroomId: insertedId,
            expiresAt: expiresAt.toISOString()
        });
    } catch (error) {
        console.error('Generate classroom error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.joinClassroom = async (req, res) => {
    try {
        const { code } = req.body;
        const studentId = req.user.id;

        if (!code) {
            return res.status(400).json({ message: 'Classroom code is required' });
        }

        // ── 1. Validate classroom code ──
        const classroomResult = await query(
            'SELECT * FROM classrooms WHERE code = $1',
            [code]
        );
        if (classroomResult.rows.length === 0) {
            return res.status(404).json({ message: 'Invalid classroom code' });
        }
        const classroom = classroomResult.rows[0];

        // Check if classroom code has expired (compare in DB timezone context)
        if (classroom.expires_at) {
            const expCheck = await query(
                'SELECT expires_at < NOW() AS is_expired FROM classrooms WHERE id = $1',
                [classroom.id]
            );
            if (expCheck.rows[0].is_expired) {
                return res.status(400).json({ message: 'Classroom code has expired' });
            }
        }

        // ── 2. Validate exam exists ──
        const examResult = await query('SELECT * FROM exams WHERE id = $1', [classroom.exam_id]);
        if (examResult.rows.length === 0) {
            return res.status(404).json({ message: 'Exam not found' });
        }
        const exam = examResult.rows[0];

        // ── 3. Prevent join if exam is completed ──
        if (exam.status === 'completed') {
            return res.status(403).json({ message: 'Exam has already ended' });
        }

        // ── 4. Buffer time check: if exam is active, enforce 5-min joining window ──
        if (exam.status === 'active' && exam.end_time) {
            // Calculate when the exam started: end_time - duration
            const endTime = new Date(exam.end_time);
            const startTime = new Date(endTime.getTime() - exam.duration * 60 * 1000);
            const bufferDeadline = new Date(startTime.getTime() + JOIN_BUFFER_MINUTES * 60 * 1000);
            const now = new Date();

            if (now > bufferDeadline) {
                return res.status(403).json({ message: 'Joining window has closed. You can only join within 5 minutes of exam start.' });
            }

            // Also check: if exam time is already over
            if (now >= endTime) {
                return res.status(403).json({ message: 'Exam time has already expired.' });
            }
        }

        // ── 5. Check if the student already submitted (deterministic: check for submitted/finalized) ──
        const existingSubmission = await query(
            "SELECT id, status FROM submissions WHERE student_id = $1 AND exam_id = $2 AND status IN ('submitted', 'finalized') LIMIT 1",
            [studentId, exam.id]
        );
        if (existingSubmission.rows.length > 0) {
            return res.status(403).json({ message: 'You have already submitted this exam' });
        }

        // ── 6. Check if the student is flagged/terminated ──
        const studentExamResult = await query(
            'SELECT flagged FROM students_exam WHERE student_id = $1 AND exam_id = $2',
            [studentId, exam.id]
        );
        if (studentExamResult.rows.length > 0 && studentExamResult.rows[0].flagged) {
            return res.status(403).json({ message: 'You have been flagged and cannot rejoin this exam.' });
        }

        // ── 7. Register student in students_exam junction table ──
        await query(`
            INSERT INTO students_exam (student_id, exam_id)
            VALUES ($1, $2)
            ON CONFLICT (student_id, exam_id) DO NOTHING
        `, [studentId, exam.id]);

        const io = getIO();

        // ── 8. Auto-activate exam on first student join ──
        const endTimeStr = new Date(Date.now() + exam.duration * 60 * 1000).toISOString();
        const updateResult = await query(
            "UPDATE exams SET status = 'active', end_time = $1 WHERE id = $2 AND status = 'scheduled' RETURNING end_time",
            [endTimeStr, exam.id]
        );

        if (updateResult.rowCount > 0 && io) {
            io.to(`exam:${exam.id}`).emit('exam:statusChange', {
                examId: exam.id,
                status: 'active',
                endTime: updateResult.rows[0].end_time
            });
        }

        // Emit student joined event
        if (io) {
            io.to(`exam:${exam.id}`).emit('student:joined', {
                studentId,
                examId: exam.id,
                timestamp: new Date().toISOString()
            });
        }

        // ── 9. Determine authoritative end_time (avoid stale exam.end_time) ──
        let actualEndTime;
        if (updateResult.rowCount > 0) {
            // This request activated the exam — use the freshly written end_time
            actualEndTime = updateResult.rows[0].end_time;
        } else {
            // Another request may have activated it — re-query for the latest end_time
            const freshExam = await query('SELECT end_time, status FROM exams WHERE id = $1', [exam.id]);
            if (freshExam.rows.length > 0) {
                actualEndTime = freshExam.rows[0].end_time;
                // ── Re-validate against authoritative state (guards stale-object race) ──
                if (freshExam.rows[0].status === 'completed') {
                    return res.status(403).json({ message: 'Exam has already ended' });
                }
            } else {
                actualEndTime = null;
            }
        }

        // ── 10. Re-run buffer/expiry checks against authoritative end_time ──
        if (actualEndTime) {
            const freshEndTime = new Date(actualEndTime);
            const now = new Date();

            // Reject if exam has already expired
            if (now >= freshEndTime) {
                return res.status(403).json({ message: 'Exam time has already expired.' });
            }

            // Reject if join buffer window has closed
            const freshStartTime = new Date(freshEndTime.getTime() - exam.duration * 60 * 1000);
            const freshBufferDeadline = new Date(freshStartTime.getTime() + JOIN_BUFFER_MINUTES * 60 * 1000);
            if (now > freshBufferDeadline) {
                return res.status(403).json({ message: 'Joining window has closed. You can only join within 5 minutes of exam start.' });
            }
        }

        // Calculate remaining duration for late joiners
        let remainingDuration = exam.duration;
        if (actualEndTime) {
            const msRemaining = new Date(actualEndTime).getTime() - Date.now();
            // Only apply minimum-duration if exam hasn't expired (already guarded above)
            remainingDuration = Math.max(1, Math.ceil(msRemaining / 60000));
        }

        // ── 10. Sanitize questions: strip grading fields before sending to student ──
        const sanitizedQuestions = sanitizeQuestions(exam.questions_json);

        res.json({
            message: 'Joined successfully',
            examId: exam.id,
            title: exam.title,
            duration: remainingDuration,
            questions: sanitizedQuestions,
            endTime: actualEndTime
        });

    } catch (error) {
        console.error('Join classroom error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
