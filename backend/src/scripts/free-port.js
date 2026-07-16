const { execSync } = require('child_process');

try {
  if (process.platform === 'win32') {
    const output = execSync('netstat -ano', { encoding: 'utf8' });
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes(':5000') && line.includes('LISTENING')) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0') {
          execSync(`taskkill /PID ${pid} /F`);
          console.log(`Freed port 5000 (PID ${pid})`);
        }
      }
    }
  } else {
    // Linux / macOS
    try {
      const pid = execSync('lsof -t -i:5000', { encoding: 'utf8' }).trim();
      if (pid) {
        execSync(`kill -9 ${pid}`);
        console.log(`Freed port 5000 (PID ${pid})`);
      }
    } catch (e) {}
  }
} catch (error) {
  // Silent fail
}
