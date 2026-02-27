const { query } = require('../config/db');
const generateCode = require('../utils/generateCode');
const { getIO } = require('../utils/socketSetup');

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

        const classroomResult = await query('SELECT * FROM classrooms WHERE code = $1', [code]);
        if (classroomResult.rows.length === 0) {
            return res.status(404).json({ message: 'Invalid classroom code' });
        }
        const classroom = classroomResult.rows[0];

        // Check if classroom code has expired
        if (classroom.expires_at && new Date(classroom.expires_at) < new Date()) {
            return res.status(400).json({ message: 'Classroom code has expired' });
        }

        const examResult = await query('SELECT * FROM exams WHERE id = $1', [classroom.exam_id]);
        if (examResult.rows.length === 0) {
            return res.status(404).json({ message: 'Exam not found' });
        }
        const exam = examResult.rows[0];

        // Prevent join if exam is completed
        if (exam.status === 'completed') {
            return res.status(400).json({ message: 'Exam has already ended' });
        }

        // Check if the student already submitted
        const existingSubmission = await query('SELECT * FROM submissions WHERE student_id = $1 AND exam_id = $2', [studentId, exam.id]);
        if (existingSubmission.rows.length > 0) {
            return res.status(400).json({ message: 'You have already submitted this exam' });
        }

        // Register student in students_exam junction table
        await query(`
            INSERT INTO students_exam (student_id, exam_id)
            VALUES ($1, $2)
            ON CONFLICT (student_id, exam_id) DO NOTHING
        `, [studentId, exam.id]);

        const io = getIO();

        // Auto-activate exam on first student join
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

        res.json({
            message: 'Joined successfully',
            examId: exam.id,
            title: exam.title,
            duration: exam.duration,
            questions: JSON.parse(exam.questions_json)
        });

    } catch (error) {
        console.error('Join classroom error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
