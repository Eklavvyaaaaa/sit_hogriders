const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';

// Mock DB or controllers before requiring routes if necessary, but we can just let it fail gracefully if it hits DB.
// The auth middleware runs BEFORE the controller. As long as it returns 403, we know it worked.
const reviewRoutes = require('./routes/reviewRoutes');

const app = express();
app.use(express.json());
app.use('/api/review', reviewRoutes);

async function runTests() {
    console.log('--- Running Tests for /api/review/:exam_id ---');
    let passed = 0;
    let failed = 0;

    // Test 1: No Token
    const res1 = await request(app).get('/api/review/1');
    if (res1.status === 401) {
        console.log('✅ Test 1 Passed: No token returns 401');
        passed++;
    } else {
        console.error(`❌ Test 1 Failed: Expected 401, got ${res1.status}`);
        failed++;
    }

    // Test 2: Student Token
    const studentToken = jwt.sign({ id: 2, role: 'student' }, process.env.JWT_SECRET);
    const res2 = await request(app)
        .get('/api/review/1')
        .set('Authorization', `Bearer ${studentToken}`);
    if (res2.status === 403) {
        console.log('✅ Test 2 Passed: Student token returns 403 Forbidden');
        passed++;
    } else {
        console.error(`❌ Test 2 Failed: Expected 403, got ${res2.status}`);
        failed++;
    }

    // Test 3: Teacher Token
    const teacherToken = jwt.sign({ id: 1, role: 'teacher' }, process.env.JWT_SECRET);
    const res3 = await request(app)
        .get('/api/review/1')
        .set('Authorization', `Bearer ${teacherToken}`);

    // It shouldn't be 401 or 403. It will likely be 500 or 404 since it attempts DB access without mocking, 
    // but the auth middleware let it through.
    if (res3.status !== 401 && res3.status !== 403) {
        console.log(`✅ Test 3 Passed: Teacher token bypassed auth (got ${res3.status})`);
        passed++;
    } else {
        console.error(`❌ Test 3 Failed: Teacher was blocked by auth with status ${res3.status}`);
        failed++;
    }

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
    process.exit(0);
}

runTests();
