const electron = require('electron');
console.log("Is app defined?", !!electron.app);
console.log("Type of electron:", typeof electron);
console.log("Electron object keys:", Object.keys(electron));
try {
    const fs = require('fs');
    fs.writeFileSync('electron-debug-log.txt', JSON.stringify({
        appDefined: !!electron.app,
        type: typeof electron,
        keys: Object.keys(electron)
    }));
} catch (e) { }
process.exit(1);
