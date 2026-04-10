// render_contest.js — конкурсное видео в стиле мудреца
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');

async function renderContestFrame(data) {
  const W = 1080, H = 1920;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#05050e';
  ctx.fillRect(0, 0, W, H);

  // Starfield
  for (let i = 0; i < 150; i++) {
    const sx = Math.abs(Math.sin(i * 127.1) * 0.5 + 0.5) * W;
    const sy = Math.abs(Math.sin(i * 311.7) * 0.5 + 0.5) * H;
    const ss = Math.abs(Math.sin(i * 200)) * 2 + 0.5;
    const alpha = Math.abs(Math.sin(i * 300)) * 0.5 + 0.1;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = i % 7 === 0 ? '#ffffff' : '#c8a84b';
    ctx.fillRect(Math.floor(sx), Math.floor(sy), ss, ss);
  }
  ctx.globalAlpha = 1;

  // Portrait top 55%
  try {
    const portrait = await loadImage(data.portrait_path);
    ctx.drawImage(portrait, 0, 0, W, W);
    const grad = ctx.createLinearGradient(0, W * 0.4, 0, W);
    grad.addColorStop(0, 'rgba(5,5,14,0)');
    grad.addColorStop(0.7, 'rgba(5,5,14,0.85)');
    grad.addColorStop(1, 'rgba(5,5,14,1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, W);
    const vL = ctx.createLinearGradient(0, 0, 120, 0);
    vL.addColorStop(0, 'rgba(5,5,14,0.6)'); vL.addColorStop(1, 'rgba(5,5,14,0)');
    ctx.fillStyle = vL; ctx.fillRect(0, 0, 120, W);
    const vR = ctx.createLinearGradient(W, 0, W-120, 0);
    vR.addColorStop(0, 'rgba(5,5,14,0.6)'); vR.addColorStop(1, 'rgba(5,5,14,0)');
    ctx.fillStyle = vR; ctx.fillRect(W-120, 0, 120, W);
  } catch(e) {}

  // Scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);

  // Border
  ctx.strokeStyle = '#c8a84b'; ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, W-6, H-6);

  // Corner decorations
  const C = 28;
  [[0,0],[W-C,0],[0,H-C],[W-C,H-C]].forEach(([cx,cy]) => {
    ctx.fillStyle = '#c8a84b';
    ctx.fillRect(cx, cy, C, 4); ctx.fillRect(cx, cy, 4, C);
    ctx.fillRect(cx+C-4, cy, 4, C); ctx.fillRect(cx, cy+C-4, C, 4);
  });

  const cX = W / 2;

  // Subtle header
  ctx.fillStyle = 'rgba(200,168,75,0.45)';
  ctx.font = '32px monospace'; ctx.textAlign = 'center';
  ctx.fillText('— МУДРЕЦ ПУСТОТЫ —', cX, 60);

  const Y = W + 90;

  // Big hook
  ctx.fillStyle = '#e8e0c8';
  ctx.font = 'bold 88px monospace';
  ctx.fillText('ПУСТОТА', cX, Y);
  ctx.fillText('УСТАЛА', cX, Y + 100);

  // Divider
  ctx.fillStyle = '#c8a84b'; ctx.globalAlpha = 0.35;
  ctx.fillRect(cX - 180, Y + 118, 360, 2); ctx.globalAlpha = 1;

  // Irony
  ctx.fillStyle = '#8a7a9a'; ctx.font = '50px monospace';
  ctx.fillText('смотреть на тебя', cX, Y + 178);
  ctx.fillText('без телефона.', cX, Y + 242);

  // Prize tease
  ctx.fillStyle = '#c8a84b'; ctx.font = 'bold 48px monospace';
  ctx.fillText('ВОЗМОЖНО ОНА ОТДАСТ', cX, Y + 350);
  ctx.fillText('ТЕБЕ ЭТО:', cX, Y + 410);

  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 94px monospace';
  ctx.fillText('iPHONE 17', cX, Y + 530);
  ctx.fillStyle = '#c8a84b'; ctx.font = 'bold 94px monospace';
  ctx.fillText('PRO MAX', cX, Y + 628);

  ctx.fillStyle = '#2a2040'; ctx.font = '30px monospace';
  ctx.fillText('(мудрец не обещает)', cX, Y + 688);

  ctx.fillStyle = '#c8a84b'; ctx.globalAlpha = 0.25;
  ctx.fillRect(cX - 300, Y + 718, 600, 1); ctx.globalAlpha = 1;

  // Steps
  const steps = ['1. Получи предсказание', '2. Скачай видео', '3. Выложи с тегом ниже'];
  ctx.fillStyle = '#6a5a7a'; ctx.font = '40px monospace';
  steps.forEach((s, i) => ctx.fillText(s, cX, Y + 790 + i * 58));

  // Hashtag
  ctx.fillStyle = '#c8a84b'; ctx.font = 'bold 82px monospace';
  ctx.fillText('#mudrets17', cX, Y + 1040);

  // Footer
  ctx.fillStyle = 'rgba(200,168,75,0.4)'; ctx.font = '34px monospace';
  ctx.fillText('▼  mudrets.online  ▼', cX, H - 46);

  fs.writeFileSync(data.output_path, canvas.toBuffer('image/png'));
}

const data = JSON.parse(process.argv[2]);
renderContestFrame(data).catch(e => { console.error(e); process.exit(1); });
