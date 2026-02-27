const { query } = require('../config/db');
const generateCode = require('../utils/generateCode');

exports.generateClassroom = async (req, res) => {
    try {
        const { examId } = req.body;
        const teacherId = req.user.id; // From authMiddleware

        if (!examId) {
            return res.status(400).json({ message: 'Exam ID is required' });
        }

        // Verify exam belongs to teacher
        const examResult = await query('SELECT * FROM exams WHERE id = $1 AND teacher_id = $2', [examId, teacherId]);
        if (examResult.rows.length === 0) {
            return res.status(404).json({ message: 'Exam not found or unauthorized' });
        }

        let code;
        let isUnique = false;

        while (!isUnique) {
            code = generateCode();
            const existing = await query('SELECT * FROM classrooms WHERE code = $1', [code]);
            if (existing.rows.length === 0) {
                isUnique = true;
            }
        }

        const result = await query(
            'INSERT INTO classrooms (code, exam_id, teacher_id) VALUES ($1, $2, $3) RETURNING id',
            [code, examId, teacherId]
        );

        res.status(201).json({ message: 'Classroom generated successfully', code, classroomId: result.rows[0].id });
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

        const examResult = await query('SELECT * FROM exams WHERE id = $1', [classroom.exam_id]);
        if (examResult.rows.length === 0) {
            return res.status(404).json({ message: 'Exam not found' });
        }
        const exam = examResult.rows[0];

        // Check if the student already submitted
        const existingSubmission = await query('SELECT * FROM submissions WHERE student_id = $1 AND exam_id = $2', [studentId, exam.id]);
        if (existingSubmission.rows.length > 0) {
            return res.status(400).json({ message: 'You have already submitted this exam' });
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
