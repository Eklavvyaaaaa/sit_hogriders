const { getDB } = require('../config/db');
const generateCode = require('../utils/generateCode');

exports.generateClassroom = async (req, res) => {
    try {
        const { examId } = req.body;
        const teacherId = req.user.id; // From authMiddleware

        if (!examId) {
            return res.status(400).json({ message: 'Exam ID is required' });
        }

        const db = getDB();

        // Verify exam belongs to teacher
        const exam = await db.get('SELECT * FROM exams WHERE id = ? AND teacher_id = ?', [examId, teacherId]);
        if (!exam) {
            return res.status(404).json({ message: 'Exam not found or unauthorized' });
        }

        let code;
        let isUnique = false;

        while (!isUnique) {
            code = generateCode();
            const existing = await db.get('SELECT * FROM classrooms WHERE code = ?', [code]);
            if (!existing) {
                isUnique = true;
            }
        }

        const result = await db.run(
            'INSERT INTO classrooms (code, exam_id, teacher_id) VALUES (?, ?, ?)',
            [code, examId, teacherId]
        );

        res.status(201).json({ message: 'Classroom generated successfully', code, classroomId: result.lastID });
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

        const db = getDB();

        const classroom = await db.get('SELECT * FROM classrooms WHERE code = ?', [code]);
        if (!classroom) {
            return res.status(404).json({ message: 'Invalid classroom code' });
        }

        const exam = await db.get('SELECT * FROM exams WHERE id = ?', [classroom.exam_id]);

        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        // You might want to check if the student already submitted
        const existingSubmission = await db.get('SELECT * FROM submissions WHERE student_id = ? AND exam_id = ?', [studentId, exam.id]);
        if (existingSubmission) {
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
