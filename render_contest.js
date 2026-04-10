// render_contest.js — рендерит кадр конкурсного видео 1080x1920
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');

async function renderContestFrame(data) {
  const W = 1080, H = 1920;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#08080f';
  ctx.fillRect(0, 0, W, H);

  // Starfield
  const rng = (n) => Math.abs(Math.sin(n * 127.1 + n * 311.7)) * 2 - 1;
  ctx.fillStyle = '#c8a84b';
  for (let i = 0; i < 120; i++) {
    const sx = Math.abs(rng(i) * 0.5 + 0.5) * W;
    const sy = Math.abs(rng(i + 100) * 0.5 + 0.5) * H;
    const ss = Math.abs(rng(i + 200)) * 2.5 + 0.5;
    const alpha = (Math.abs(rng(i + 300)) * 0.5 + 0.15) * (data.frame_alpha || 1);
    ctx.globalAlpha = alpha;
    ctx.fillRect(Math.floor(sx), Math.floor(sy), ss, ss);
  }
  ctx.globalAlpha = 1;

  // Mudrets portrait top half
  try {
    const portrait = await loadImage(data.portrait_path);
    ctx.drawImage(portrait, 0, 0, W, W);
    const grad = ctx.createLinearGradient(0, W * 0.5, 0, W);
    grad.addColorStop(0, 'rgba(8,8,15,0)');
    grad.addColorStop(1, 'rgba(8,8,15,1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, W);
  } catch(e) {}

  // Scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.07)';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);

  // Gold border
  ctx.strokeStyle = '#c8a84b';
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, W - 12, H - 12);

  // Inner decorative border
  ctx.strokeStyle = 'rgba(200,168,75,0.2)';
  ctx.lineWidth = 2;
  ctx.strokeRect(22, 22, W - 44, H - 44);

  // Corner decorations
  const corners = [[30,30],[W-30,30],[30,H-30],[W-30,H-30]];
  corners.forEach(([cx2, cy2]) => {
    ctx.fillStyle = '#c8a84b';
    ctx.fillRect(cx2-8, cy2-8, 16, 16);
    ctx.fillStyle = '#08080f';
    ctx.fillRect(cx2-4, cy2-4, 8, 8);
  });

  // "МУДРЕЦ ПУСТОТЫ"
  ctx.fillStyle = '#c8a84b';
  ctx.font = 'bold 42px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('— МУДРЕЦ ПУСТОТЫ —', W / 2, W + 70);

  // Divider
  ctx.fillStyle = '#c8a84b';
  ctx.fillRect(W/2 - 200, W + 90, 400, 3);

  // РОЗЫГРЫШ title
  ctx.fillStyle = '#e8e0c8';
  ctx.font = 'bold 96px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('РОЗЫГРЫШ', W / 2, W + 200);

  // Pixel iPhone
  drawPixelIphone(ctx, W/2 - 90, W + 230, 180);

  // Prize text
  ctx.fillStyle = '#c8a84b';
  ctx.font = 'bold 78px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('iPHONE 17', W / 2, W + 600);
  ctx.fillText('PRO MAX', W / 2, W + 690);

  // Conditions
  const conds = [
    '1. Получи платное предсказание',
    '2. Скачай видео кнопкой ниже',
    '3. Выложи в TikTok / Instagram',
    '4. Поставь хештег #mudrets17',
  ];
  ctx.font = '38px monospace';
  ctx.fillStyle = '#a090b0';
  ctx.textAlign = 'center';
  conds.forEach((line, i) => {
    ctx.fillText(line, W / 2, W + 800 + i * 60);
  });

  // Hashtag
  ctx.fillStyle = '#c8a84b';
  ctx.font = 'bold 64px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('#mudrets17', W / 2, W + 1080);

  // Site
  ctx.fillStyle = '#3a3020';
  ctx.font = '36px monospace';
  ctx.fillText('mudrets.online · @mudrets_on', W / 2, H - 50);

  const buf = canvas.toBuffer('image/png');
  fs.writeFileSync(data.output_path, buf);
}

function drawPixelIphone(ctx, x, y, size) {
  const S = size / 22;
  const P = (px, py, pw, ph, col, alpha=1) => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = col;
    ctx.fillRect(x + px*S, y + py*S, pw*S, ph*S);
    ctx.globalAlpha = 1;
  };
  // Body
  P(2, 0, 18, 40, '#1a1a2e');
  P(3, 1, 16, 38, '#0d0d1a');
  // Screen
  P(3, 3, 16, 30, '#0a1020');
  // Screen glow
  P(4, 4, 14, 28, '#0d1828', 0.8);
  P(5, 5, 4, 2, 'rgba(100,180,255,0.4)');
  P(5, 6, 3, 1, 'rgba(100,180,255,0.2)');
  // Dynamic island
  P(8, 2, 6, 2, '#0a0a14');
  P(9, 2, 4, 1, '#0d0d1a');
  P(10, 2, 2, 1, '#2a2a3a');
  // Pixel content on screen - tiny trophy
  P(9, 10, 4, 3, '#c8a84b');
  P(8, 13, 6, 1, '#c8a84b');
  P(10, 14, 2, 2, '#c8a84b');
  P(7, 16, 8, 1, '#c8a84b');
  // Bottom home area
  P(8, 34, 6, 1, '#2a2a3a');
  // Side buttons
  P(1, 7, 1, 4, '#c8a84b');
  P(1, 13, 1, 3, '#c8a84b');
  P(20, 9, 1, 7, '#c8a84b');
  // Shine
  P(4, 4, 3, 22, 'rgba(255,255,255,0.04)');
  // Corner masks
  P(2, 0, 1, 1, '#08080f');
  P(19, 0, 1, 1, '#08080f');
  P(2, 39, 1, 1, '#08080f');
  P(19, 39, 1, 1, '#08080f');
}

const data = JSON.parse(process.argv[2]);
renderContestFrame(data).catch(e => { console.error(e); process.exit(1); });
