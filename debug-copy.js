const fs = require('fs');
const path = require('path');
const source = "C:\\Users\\patil\\.gemini\\antigravity\\brain\\59e02872-4d93-4a70-80d9-215401a8fbbb\\ati_secure_premium_logo_base_1772219383865.png";
const dest = "c:\\Users\\patil\\OneDrive\\Desktop\\sit_hogriders\\electron-app\\client\\src\\assets\\logo.png";

const logFile = "c:\\Users\\patil\\OneDrive\\Desktop\\sit_hogriders\\copy_log.txt";

try {
    if (!fs.existsSync(source)) {
        fs.writeFileSync(logFile, "Source does not exist: " + source);
    } else {
        fs.copyFileSync(source, dest);
        fs.writeFileSync(logFile, "Success copying to " + dest);
    }
} catch (err) {
    fs.writeFileSync(logFile, "Error: " + err.message + "\nStack: " + err.stack);
}
