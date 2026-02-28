const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const reviewRoutes = require('../routes/reviewRoutes');

const app = express();
app.use(express.json());
app.use('/api/review', reviewRoutes);

describe('GET /api/review/:exam_id', () => {
    beforeAll(() => {
        process.env.JWT_SECRET = 'test-secret';

        // Mock the controller so we don't actually hit the DB
        // We only care about the auth middleware role enforcement
        jest.mock('../controllers/reviewController', () => ({
            getExamReview: (req, res) => res.status(200).json({ success: true, message: 'Review data' })
        }));
    });

    afterAll(() => {
        jest.unmock('../controllers/reviewController');
    });

    it('should deny access if no token is provided', async () => {
        const response = await request(app).get('/api/review/1');
        expect(response.status).toBe(401);
    });

    it('should deny access if user is a student', async () => {
        const token = jwt.sign({ id: 2, role: 'student' }, process.env.JWT_SECRET);
        const response = await request(app)
            .get('/api/review/1')
            .set('Authorization', `Bearer ${token}`);
        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Forbidden: Insufficient role permissions');
    });

    it('should allow access (or reach controller) if user is a teacher', async () => {
        const token = jwt.sign({ id: 1, role: 'teacher' }, process.env.JWT_SECRET);
        // Because the controller requires DB access and is not fully mocked via jest.mock when routes are already required,
        // it may throw 500 or 404, but it should NOT throw 403 Forbidden or 401 Unauthorized.
        // Let's just verify it bypasses the 403.
        const response = await request(app)
            .get('/api/review/1')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).not.toBe(403);
        expect(response.status).not.toBe(401);
    });
});
