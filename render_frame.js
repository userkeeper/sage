// render_frame.js — рендерит один кадр 1080x1920 для TikTok видео
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');

async function renderFrame(data) {
  const W = 1080, H = 1920;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#08080f';
  ctx.fillRect(0, 0, W, H);

  // Portrait
  try {
    const portrait = await loadImage(data.persona_path);
    ctx.drawImage(portrait, 0, 0, W, W);
    // dark gradient overlay bottom of portrait
    const grad = ctx.createLinearGradient(0, W * 0.6, 0, W);
    grad.addColorStop(0, 'rgba(8,8,15,0)');
    grad.addColorStop(1, 'rgba(8,8,15,0.85)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, W);
  } catch(e) {
    console.error('portrait error:', e.message);
  }

  // Scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.07)';
  for (let y = 0; y < W; y += 4) ctx.fillRect(0, y, W, 1);

  // Gold border
  ctx.strokeStyle = '#c8a84b';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, W - 10, H - 10);

  // Persona name
  ctx.fillStyle = '#c8a84b';
  ctx.font = 'bold 52px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`— ${(data.persona_name || 'МУДРЕЦ').toUpperCase()} —`, W / 2, W + 80);

  // Equalizer bars
  const bars = data.bar_heights || Array(20).fill(8);
  const barW = 32, gap = 16;
  const totalBarW = bars.length * (barW + gap) - gap;
  const barStartX = (W - totalBarW) / 2;
  const barBaseY = W + 160;
  bars.forEach((h, i) => {
    const x = barStartX + i * (barW + gap);
    ctx.fillStyle = '#c8a84b';
    ctx.fillRect(x, barBaseY - h, barW, h);
  });

  // Wisdom text
  const text = data.wisdom_text || '';
  ctx.fillStyle = '#e8c878';
  ctx.font = '54px serif';
  ctx.textAlign = 'center';

  // Word wrap
  const maxWidth = W - 120;
  const lineHeight = 72;
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line + (line ? ' ' : '') + word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  const textStartY = W + 220;
  lines.forEach((l, i) => ctx.fillText(l, W / 2, textStartY + i * lineHeight));

  // Footer
  ctx.fillStyle = '#2a2010';
  ctx.font = '36px monospace';
  ctx.fillText('mudrets.online', W / 2, H - 60);

  // Save
  const buf = canvas.toBuffer('image/png');
  fs.writeFileSync(data.output_path, buf);
}

const data = JSON.parse(process.argv[2]);
renderFrame(data).catch(e => { console.error(e); process.exit(1); });
