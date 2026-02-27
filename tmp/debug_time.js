const { query } = require('../server/config/db');

async function debugTime() {
    try {
        const dbResult = await query('SELECT CURRENT_TIMESTAMP as db_now');
        const dbNow = dbResult.rows[0].db_now;
        const sysNow = new Date();

        console.log('Database NOW (raw):', dbNow);
        console.log('Database NOW (as Date):', new Date(dbNow).toISOString());
        console.log('System NOW (local):', sysNow.toString());
        console.log('System NOW (ISO):', sysNow.toISOString());
        console.log('Diff (ms):', new Date(dbNow).getTime() - sysNow.getTime());

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debugTime();
