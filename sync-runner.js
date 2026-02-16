// sync-runner.js
const https = require('https');

const SYNC_URL = 'https://automation.easyk.in/api/cron/sync';

function triggerSync() {
  https.get(SYNC_URL, (res) => {
    console.log(`[${new Date().toISOString()}] Sync status: ${res.statusCode}`);
  }).on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Error: ${err.message}`);
  });
}

// Run every 1000ms (1 second)
setInterval(triggerSync, 1000);

console.log("🚀 Sync Runner started: Executing every 1 second.");