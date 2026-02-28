import fs from 'fs';
import path from 'path';

const ROOT = 'c:\\Users\\patil\\OneDrive\\Desktop\\sit_hogriders';

// Files where we want to keep the INCOMING (origin/main) version of conflicts
// This is the newer, redesigned code
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

function resolveConflicts(content, strategy = 'theirs') {
    // Strategy: 'theirs' keeps the incoming (after =======), 'ours' keeps HEAD
    const lines = content.split('\n');
    const result = [];
    let inConflict = false;
    let section = null; // 'ours' or 'theirs'

    for (const line of lines) {
        if (line.startsWith('<<<<<<< ')) {
            inConflict = true;
            section = 'ours';
            continue;
        }
        if (line.startsWith('=======') && inConflict) {
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
        } else if (section === strategy) {
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
            console.log(`✅ ${relPath} — no conflicts found`);
            continue;
        }
        const fixed = resolveConflicts(content, 'theirs');
        fs.writeFileSync(fullPath, fixed, 'utf8');
        // Verify no remaining markers
        if (fixed.includes('<<<<<<< ')) {
            console.error(`⚠️  ${relPath} — still has conflict markers after resolution!`);
            errors++;
        } else {
            console.log(`✅ ${relPath} — resolved`);
            resolved++;
        }
    } catch (err) {
        console.error(`❌ ${relPath} — ${err.message}`);
        errors++;
    }
}

console.log(`\nDone: ${resolved} resolved, ${errors} errors`);
