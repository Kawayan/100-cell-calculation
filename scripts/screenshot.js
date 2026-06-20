/**
 * スクリーンショット撮影スクリプト
 * 使い方: npm run screenshot
 *
 * ゲームの動作をシミュレートし、README.mdの画像を更新します。
 */

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = http.createServer();
    srv.listen(0, () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.map': 'application/json',
};

function startServer(port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
      const filePath = path.join(ROOT, urlPath);

      if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end();
        return;
      }

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });

    server.listen(port, () => resolve(server));
    server.on('error', reject);
  });
}

(async () => {
  const PORT = await getFreePort();
  const server = await startServer(PORT);
  console.log(`サーバー起動: http://localhost:${PORT}`);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.setViewportSize({ width: 1100, height: 900 });
    await page.goto(`http://localhost:${PORT}`);
    await page.waitForSelector('.cell.header-cell');
    console.log('ページ読み込み完了');

    // 開始ボタンをクリック
    await page.click('#startBtn');

    // タイマーを見栄えのよい値に固定
    await page.evaluate(() => {
      document.getElementById('timer').textContent = '00:21:402';
    });

    // 1行目を9問正解で埋める（10問目は空けて全問正解判定を回避）
    await page.evaluate(() => {
      function getAnswer(row, col) {
        const num1 = Number(
          document.querySelector(`.cell[data-row="${row}"][data-col="0"]`).textContent
        );
        const num2 = Number(
          document.querySelector(`.cell[data-row="0"][data-col="${col}"]`).textContent
        );
        const op = document.querySelector('.cell.op-cell').textContent.trim();
        if (op === '+') return num1 + num2;
        if (op === '−') return Math.max(num1, num2) - Math.min(num1, num2);
        return num1 * num2;
      }

      for (let col = 1; col <= 9; col++) {
        const input = document.querySelector(`.cell[data-row="1"][data-col="${col}"] input`);
        if (!input) continue;
        input.value = String(getAnswer(1, col));
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // 2行目の最初の3問を正解
      for (let col = 1; col <= 3; col++) {
        const input = document.querySelector(`.cell[data-row="2"][data-col="${col}"] input`);
        if (!input) continue;
        input.value = String(getAnswer(2, col));
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    // 4列目にフォーカスして行・列ハイライトを表示
    await page.focus('.cell[data-row="2"][data-col="4"] input');
    await page.waitForTimeout(150);

    const outPath = path.join(ROOT, 'images', '100-cell-image.png');
    await page.screenshot({ path: outPath });
    console.log(`スクリーンショット保存完了: ${outPath}`);

  } finally {
    await browser.close();
    server.close();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
