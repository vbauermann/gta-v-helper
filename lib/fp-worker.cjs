// Worker thread for fp-scanner.cjs: runs the matcher off the main process.
const { parentPort } = require('node:worker_threads');
const { analyze } = require('./fp-match.js');

parentPort.on('message', img => parentPort.postMessage(analyze(img)));
