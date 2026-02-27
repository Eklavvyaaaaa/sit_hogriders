import { execSync } from 'child_process';
const run = (cmd) => {
    console.log(`> ${cmd}`);
    try {
        const out = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
        if (out.trim()) console.log(out.trim());
    } catch (e) {
        console.error(e.stderr || e.stdout || e.message);
        throw e;
    }
};

try {
    run('git status');
    run('git add -A');
    run('git commit -m "fix: secure socket auth, enforce teacher role on review routes, add unique submission constraint, CSS animate-fade-in"');
    run('git push origin HEAD');
    console.log('\n✅ Push successful!');
} catch (e) {
    if (e.message && e.message.includes('nothing to commit')) {
        console.log('Nothing new to commit. Pushing existing commits...');
        try { run('git push origin HEAD'); console.log('\n✅ Push successful!'); } catch (e2) { console.error('Push failed:', e2.message); }
    } else {
        console.error('❌ Failed:', e.message);
    }
}
