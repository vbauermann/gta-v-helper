// Worker thread for biz-scanner.cjs: reads the business screens off the main process.
const { parentPort, workerData } = require('node:worker_threads');
const { read } = require('./biz-read.js');
// Templates come from the main process: data/ stays inside app.asar, which workers can't read.
const templates = workerData.templates;

// msg: { data (BGRA or RGB bytes), width, height, bgra }
parentPort.on('message', msg => {
  let data = msg.data;
  if (msg.bgra) {
    const n = msg.width * msg.height, rgb = new Uint8Array(n * 3);
    for (let i = 0, p = 0, q = 0; i < n; i++, p += 4, q += 3) { rgb[q] = data[p + 2]; rgb[q + 1] = data[p + 1]; rgb[q + 2] = data[p]; }
    data = rgb;
  }
  parentPort.postMessage(read({ data, width: msg.width, height: msg.height, channels: 3 }, templates));
});
