const fs = require('fs');
const path = require('path');
const source = "C:\\Users\\patil\\.gemini\\antigravity\\brain\\59e02872-4d93-4a70-80d9-215401a8fbbb\\ati_secure_premium_logo_base_1772219383865.png";
const dest = "c:\\Users\\patil\\OneDrive\\Desktop\\sit_hogriders\\electron-app\\client\\src\\assets\\logo.png";

try {
    fs.copyFileSync(source, dest);
    console.log("Success: Logo copied to", dest);
    const stats = fs.statSync(dest);
    console.log("File size:", stats.size);
} catch (err) {
    console.error("Error copying file:", err.message);
    process.exit(1);
}
