// Resolve all merge conflicts by keeping the incoming (theirs/origin/main) version
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname);

const files = [
    'electron-app/client/src/pages/TeacherDashboard.jsx',
    'electron-app/client/src/pages/CreateExam.jsx',
    'electron-app/client/src/pages/ExamPage.jsx',
    'electron-app/client/src/pages/JoinClassroom.jsx',
    'electron-app/client/src/pages/MonitorDashboard.jsx',
    'electron-app/client/src/pages/StudentHistory.jsx',
    'electron-app/client/src/pages/SubmissionResults.jsx',
    'electron-app/client/src/hooks/useMonitoring.js',
    'server/controllers/classroomController.js',
    'server/controllers/dashboardController.js',
    'server/controllers/examController.js',
    'server/controllers/submissionController.js',
    'server/routes/examRoutes.js',
    'server/utils/socketSetup.js',
    'server/config/db.js',
];

function resolveConflicts(content) {
    const lines = content.split(/\r?\n/);
    const result = [];
    let inConflict = false;
    let section = null;

    for (const line of lines) {
        if (line.startsWith('<<<<<<< ')) {
            inConflict = true;
            section = 'ours';
            continue;
        }
        if (line === '=======' && inConflict) {
            section = 'theirs';
            continue;
        }
        if (line.startsWith('>>>>>>> ') && inConflict) {
            inConflict = false;
            section = null;
            continue;
        }

        if (!inConflict) {
            result.push(line);
        } else if (section === 'theirs') {
            result.push(line);
        }
    }

    return result.join('\n');
}

let resolved = 0;
let errors = 0;

for (const relPath of files) {
    const fullPath = path.join(ROOT, relPath);
    try {
        let content = fs.readFileSync(fullPath, 'utf8');
        if (!content.includes('<<<<<<< ')) {
            console.log('OK  ' + relPath + ' (no conflicts)');
            continue;
        }
        const fixed = resolveConflicts(content);
        fs.writeFileSync(fullPath, fixed, 'utf8');
        if (fixed.includes('<<<<<<< ')) {
            console.error('WARN ' + relPath + ' still has conflicts!');
            errors++;
        } else {
            console.log('FIX ' + relPath);
            resolved++;
        }
    } catch (err) {
        console.error('ERR ' + relPath + ' - ' + err.message);
        errors++;
    }
}

console.log('\nResolved: ' + resolved + ', Errors: ' + errors);
