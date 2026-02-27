const electron = require('electron');
console.log("Is app defined?", !!electron.app);
console.log("Type of electron:", typeof electron);
console.log("Electron object keys:", Object.keys(electron));
let exitCode = 0;
try {
    const fs = require('fs');
    const path = require('path');
    const logPath = electron.app ? path.join(electron.app.getPath('userData'), 'electron-debug-log.txt') : path.resolve(__dirname, 'electron-debug-log.txt');
    fs.writeFileSync(logPath, JSON.stringify({
        appDefined: !!electron.app,
        type: typeof electron,
        keys: Object.keys(electron)
    }));
} catch (e) {
    console.error("Failed to write debug log:", e.message);
    console.error("Stack:", e.stack);
    exitCode = 1;
}
process.exit(exitCode);
