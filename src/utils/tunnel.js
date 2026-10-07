const { spawn } = require('child_process');

let publicUrl = null;
let tunnelProcess = null;

function getPublicUrl() {
  return publicUrl;
}

function setPublicUrl(url) {
  if (url) {
    publicUrl = url.trim().replace(/\/$/, '');
  }
}

function startTunnel(port = 3000) {
  if (tunnelProcess) return;

  try {
    const proc = spawn('ssh', [
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'ServerAliveInterval=20',
      '-o', 'ServerAliveCountMax=3',
      '-o', 'ExitOnForwardFailure=yes',
      '-R', `80:localhost:${port}`,
      'nokey@localhost.run'
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    const handleOutput = (data) => {
      const text = data.toString();
      const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.lhr\.life/);
      if (match && !match[0].includes('admin.')) {
        publicUrl = match[0];
        console.log(`\n====================================================`);
        console.log(`[Tunnel Online] Barcode Check-In Publik HP/4G: ${publicUrl}`);
        console.log(`====================================================\n`);
      }
    };

    proc.stdout.on('data', handleOutput);
    proc.stderr.on('data', handleOutput);

    proc.on('close', (code) => {
      console.log(`[Tunnel] Process exited with code ${code}, reconnecting in 3s...`);
      tunnelProcess = null;
      setTimeout(() => startTunnel(port), 3000);
    });

    proc.on('error', (err) => {
      console.error('[Tunnel] SSH process error:', err.message);
      tunnelProcess = null;
    });

    tunnelProcess = proc;
  } catch (err) {
    console.error('[Tunnel] Error starting tunnel:', err.message);
  }
}

module.exports = {
  getPublicUrl,
  setPublicUrl,
  startTunnel
};
