const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
app.use(cors());
app.use(express.json());

const WALLET = 'TNnCZrgSQwEgWKViC1eci2MxCMdsoqTWVu';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const TG_TOKEN = process.env.TG_BOT_TOKEN;
const TG_CHANNEL = process.env.TG_CHANNEL || '@mudrets_on';
const TG_VIDEO_CHANNEL = process.env.TG_VIDEO_CHANNEL || TG_CHANNEL;

const usedTxids = new Set();
const freeByIP = new Map();
const angerByIP = new Map();
const dailyWisdomSent = { date: '', sent: false };

const RU_PERSONAS = [
  { id: "mellstroy",    name: "Mellstroy",          fact: "в декабре 2025 сам признался что в розыске Интерпола по запросу Казахстана, застрял на Кипре, его контент признан экстремистским в Беларуси, следствие хочет арестовать его имущество на 1 млрд рублей по делу об отмывании денег через казино" },
  { id: "morgenshtern", name: "Моргенштерн",         fact: "в марте 2026 начался заочный суд за уклонение от обязанностей иноагента, его недвижимость на 200 млн рублей арестована в январе 2025, из-за страха задержания выступает только в США, Испании и на Кипре за $150k минимум" },
  { id: "bratishkin",   name: "Братишкин",           fact: "в декабре 2025 получил 7-й бан на Twitch из-за картины с голой женщиной на стене за спиной, в 2025 сам признался 'я уже даже в свой онлайн не верю', обвинён в накрутке зрителей ботами, в ноябре 2025 посетил Госдуму" },
  { id: "khovansky",    name: "Хованский",           fact: "вышел из СИЗО в 2021, уехал в Сербию спасаясь от мобилизации, женился, развёлся, расстался с новой девушкой за 9 месяцев, в 2025 году пьяный плакал разговаривая с нейросетью на стриме" },
  { id: "litvin",       name: "Михаил Литвин",       fact: "пошутил публично что купил военный билет — прокуратура Москвы это проверила и аннулировала отсрочку в июне 2025, теперь грозит уголовка за уклонение от армии, при этом каждый день снимает влоги о дисциплине и продуктивности" },
  { id: "evelone",      name: "Evelone",             fact: "в мае 2025 Twitch забанил его канал и в официальном письме посоветовал обратиться к врачу по поводу психического здоровья, в 2023 Steam заблокировал его аккаунт со скинами на $150 тысяч по подозрению в краже — разблокировали только через год переговоров" },
  { id: "buster",       name: "Buster",              fact: "в мае 2025 выяснилось что его компания задолжала налоговой 4.5 млн рублей, в 2025 расстался с Диларой — бывшей женой Моргенштерна с которой встречался больше года, в декабре 2025 закрыл киберспортивную команду GUN5 по CS2 заявив что потерял интерес" },
  { id: "zubarefff",    name: "Zubarefff",           fact: "получил уже 6 банов на Twitch включая бан за сексуальный контент в июле 2025, живёт без постоянного места жительства — после Китая скитается между Дубаем и Казахстаном, его участие в фильме Скуф вызвало скандал из-за старых шуток про русских младенцев и доната Слава ВСУ" },
  { id: "zloy",         name: "Злой",                fact: "10 лет стримит казино, сам придумал термин бурмалда для зависимых от казино, рекламирует азартные игры но открыто говорит что это его основной заработок" },
  { id: "gensyxa",      name: "Gensyxa",             fact: "в декабре 2025 стала SLAY Queen второй раз, в том же году рассталась с двумя парнями подряд — сначала с Evelone потом с рэпером Toxi$, выпустила трек Френдзона" },
  { id: "poperechny",   name: "Данила Поперечный",   fact: "уехал из России, стендап в эмиграции не взлетел как дома, снялся вместе с Моргенштерном в видео где они высмеивали патриотическую песню" },
  { id: "egor_kreed",   name: "Egor Kreed",          fact: "позиционировал себя как серьёзный рэпер, стал попсой для подростков, обижается когда это говорят вслух" },
  { id: "renatko",      name: "renatko",             fact: "живёт на донаты подписчиков годами, называет это независимостью и свободой от работодателей" },
  { id: "ivan_zolo",    name: "Иван Золо",           fact: "в декабре 2025 выиграл номинацию Человек-мем года на SLAY 2025, стал одним из самых быстрорастущих стримеров рунета 2025 года" },
  { id: "anar",         name: "Анар Абдуллаев",      fact: "в декабре 2025 выиграл два SLAY подряд — прорыв года и лучший IRL-стример, вырос до миллионов подписчиков на мотивационном контенте" },
];

const EN_PERSONAS = [
  { id: "dr_disrespect", name: "Dr Disrespect",   fact: "banned from Twitch in June 2020 and spent 4 years claiming he had no idea why — in June 2024 it emerged he had sent inappropriate messages to a minor, still has millions of YouTube subscribers and never properly addressed it" },
  { id: "mrbeast",       name: "MrBeast",          fact: "in 2024 a former employee accused him of grooming, several collaborators distanced themselves, his philanthropy videos criticized for exploiting people as props without long-term help" },
  { id: "logan_paul",    name: "Logan Paul",        fact: "launched CryptoZoo NFT in 2021, raised millions from fans, game never worked, Coffeezilla exposed him in 2022, Logan sued Coffeezilla then quietly dropped the lawsuit after massive backlash" },
  { id: "jake_paul",     name: "Jake Paul",         fact: "fought 58-year-old Mike Tyson on Netflix in November 2024, both moved at walking pace for 8 rounds, Netflix servers crashed, still got 60 million viewers" },
  { id: "andrew_tate",   name: "Andrew Tate",       fact: "arrested in Romania in December 2022 on human trafficking charges, trial still ongoing in 2025 while he continues making content about being a persecuted alpha male" },
  { id: "xqc",           name: "xQc",               fact: "admitted in 2023 to losing millions gambling on his own stream, moved to Kick for gambling money, lost millions more on stream while his audience cheered" },
  { id: "pokimane",      name: "Pokimane",          fact: "announced retirement from streaming in 2024 citing burnout, returned months later, career built on parasocial fans who believe she notices them personally" },
  { id: "ksi",           name: "KSI",               fact: "lost boxing rematch against Tommy Fury in 2023 and blamed judges, releases music calling himself multi-hyphenate, neither career is as good as he claims" },
  { id: "dream",         name: "Dream",             fact: "built career hiding his face, face reveal in 2022 disappointed millions, accused of Minecraft speedrun cheating in 2020 never cleanly resolved" },
  { id: "kai_cenat",     name: "Kai Cenat",         fact: "organized giveaway in NYC in 2023 that turned into a riot, charged with inciting a riot, broke Twitch records the same year" },
  { id: "ninja",         name: "Ninja",             fact: "dropped by Adidas in 2024, cried publicly, announced retirement then returned months later — has done this multiple times" },
  { id: "trisha_paytas", name: "Trisha Paytas",     fact: "monetized every personal crisis including breakdowns and relationship collapses into viral content, profited from every public meltdown" },
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

function getAngerLevel(ip, extraAmount = 0) {
  const today = getTodayKey();
  const data = angerByIP.get(ip) || { date: '', total: 0 };
  if (data.date !== today) return extraAmount;
  return data.total + extraAmount;
}

function addAnger(ip, amount) {
  const today = getTodayKey();
  const data = angerByIP.get(ip) || { date: today, total: 0 };
  if (data.date !== today) { data.date = today; data.total = 0; }
  data.total += amount;
  angerByIP.set(ip, data);
}

function angerLevelFromTotal(total) {
  if (total <= 0) return 1;
  if (total < 5) return 2;
  if (total < 20) return 3;
  if (total < 50) return 4;
  return 5;
}

async function getWisdom(amount, lang, seed, type = 'paid') {
  const isRu = lang === 'ru';
  let system, prompt, personaId = null, personaName = null;

  if (type === 'free') {
    system = isRu
      ? `Ты — древний суровый мудрец с чёрным юмором. Когда к тебе приходят без пожертвования, ты даёшь короткую горькую мудрость о том что бесплатный сыр бывает только в мышеловке, что скупость — это тоже черта характера которая многое говорит о человеке, и намекаешь что те кто жертвуют получают нечто особенное. Говори иронично, с сарказмом. 1-2 предложения. Без предисловий.`
      : `You are an ancient sage with dark humor. When someone comes without a donation, give a short bitter wisdom about how free cheese only exists in mousetraps, how stinginess reveals character, hint that those who donate receive something special. Speak ironically, with sarcasm. 1-2 sentences. No preamble.`;
    prompt = isRu ? 'Дай ироничную мудрость человеку который пришёл без пожертвования.' : 'Give ironic wisdom to someone who came without a donation.';
  } else if (type === 'daily') {
    system = isRu
      ? `Ты — древний мудрец. Дай мудрость дня — короткую, горькую, универсальную. Можешь использовать мат к месту. Без предисловий.`
      : `You are an ancient sage. Give the wisdom of the day — short, bitter, universal. Profanity welcome if it fits. No preamble.`;
    prompt = isRu ? 'Мудрость дня для всех.' : 'Wisdom of the day for everyone.';
  } else {
    const pool = isRu ? RU_PERSONAS : EN_PERSONAS;
    const persona = pool[Math.floor(Math.random() * pool.length)];
    personaId = persona.id;
    personaName = persona.name;
    const tones = isRu
      ? ['с матом и злостью', 'сухо и беспощадно', 'с иронией и презрением', 'издевательски спокойно']
      : ['with profanity and rage', 'dry and merciless', 'with cold irony', 'mockingly calm'];
    const tone = tones[Math.floor(Math.random() * tones.length)];
    const angerLevel = angerLevelFromTotal(amount);
    const angerDesc = isRu
      ? ['слегка недоволен', 'раздражён', 'разозлён', 'яростен', 'в абсолютной ярости'][angerLevel - 1]
      : ['slightly displeased', 'irritated', 'angered', 'furious', 'in absolute rage'][angerLevel - 1];

    system = isRu
      ? `Ты — древний озлобленный мудрец. Сейчас ты ${angerDesc}. Говоришь ${tone}. Каждая мудрость уникальна. Используй ТОЛЬКО реальный факт из контекста. Никаких предисловий. 1-2 предложения. Случайность: ${seed}`
      : `You are an ancient bitter sage. Right now you are ${angerDesc}. Speak ${tone}. Every wisdom is unique. Use ONLY the real fact from context. No preamble. 1-2 sentences. Seed: ${seed}`;

    prompt = isRu
      ? `Пользователь пожертвовал ${amount.toFixed(1)} USDT.\n\nФакт о ${persona.name}: ${persona.fact}\n\nПроведи параллель между жизнью ${persona.name} и донатером. 1-2 предложения. Без вступлений.`
      : `The user donated ${amount.toFixed(1)} USDT.\n\nFact about ${persona.name}: ${persona.fact}\n\nDraw parallel between ${persona.name}'s life and the donor. 1-2 sentences. No intro.`;
  }

  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const ai = await aiRes.json();
  const text = ai.content?.[0]?.text || null;
  return { text, personaId, personaName };
}

async function getAudio(text) {
  try {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({ model: 'tts-1-hd', input: text, voice: 'onyx', speed: 0.9 })
    });
    if (!res.ok) { console.log('[TTS] error:', await res.text()); return null; }
    const buffer = await res.buffer();
    return buffer.toString('base64');
  } catch(e) { console.log('[TTS] exception:', e.message); return null; }
}

const GITHUB_PERSONAS = 'https://raw.githubusercontent.com/userkeeper/sage/main/personas/';
const MUDRETS_IMG = GITHUB_PERSONAS + 'mudrets.png';

async function downloadImage(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}`);
  const buf = await res.buffer();
  fs.writeFileSync(destPath, buf);
}

function execAsync(cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: 120000, ...opts }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout);
    });
  });
}

async function generateAndSendVideo(wisdomText, personaId, personaName, audioBase64) {
  setImmediate(async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mudrets-'));
    try {
      console.log('[VIDEO] start, persona:', personaId || 'mudrets');
      const personaImgUrl = personaId ? GITHUB_PERSONAS + personaId + '.png' : MUDRETS_IMG;
      const portraitPath = path.join(tmpDir, 'portrait.png');
      await downloadImage(personaImgUrl, portraitPath);
      console.log('[VIDEO] portrait downloaded:', portraitPath);

      let audioPath = null;
      let audioDuration = 7;
      if (audioBase64) {
        audioPath = path.join(tmpDir, 'audio.mp3');
        fs.writeFileSync(audioPath, Buffer.from(audioBase64, 'base64'));
        console.log('[VIDEO] audio saved, size:', fs.statSync(audioPath).size);
        try {
          const probe = await execAsync(
            `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
          );
          audioDuration = Math.ceil(parseFloat(probe.trim())) + 1;
          console.log('[VIDEO] audio duration:', audioDuration);
        } catch(e) {
          audioDuration = Math.ceil(wisdomText.length * 0.055) + 2;
          console.log('[VIDEO] ffprobe failed:', e.message, '→ fallback duration:', audioDuration);
        }
      }

      const framePath = path.join(tmpDir, 'frame.png');
      const scriptPath = path.join(__dirname, 'render_frame.js');
      console.log('[VIDEO] rendering frame, script:', scriptPath);
      const frameData = JSON.stringify({
        persona_path: portraitPath,
        wisdom_text: wisdomText,
        persona_name: personaName || 'Мудрец Пустоты',
        bar_heights: Array(20).fill(18),
        output_path: framePath
      });
      await execAsync(`node "${scriptPath}" ${JSON.stringify(frameData)}`);
      console.log('[VIDEO] frame rendered:', fs.statSync(framePath).size, 'bytes');

      const videoPath = path.join(tmpDir, 'wisdom.mp4');
      const totalDuration = audioDuration + 1.5;
      const ffCmd = [
        `ffmpeg -y`,
        `-loop 1 -framerate 1 -i "${framePath}"`,
        audioPath ? `-i "${audioPath}"` : '',
        `-c:v libx264 -preset fast -crf 28 -pix_fmt yuv420p`,
        `-t ${totalDuration}`,
        audioPath ? `-c:a aac -af "apad=pad_dur=1.5" -t ${totalDuration}` : `-an`,
        `"${videoPath}"`
      ].filter(Boolean).join(' ');

      console.log('[VIDEO] ffmpeg cmd:', ffCmd);
      await execAsync(ffCmd, { timeout: 120000 });
      console.log('[VIDEO] mp4 ready:', fs.statSync(videoPath).size, 'bytes');

      await sendVideoToTelegram(videoPath, wisdomText);

    } catch(e) {
      console.error('[VIDEO] FATAL error:', e.message);
    } finally {
      try { fs.rmSync(tmpDir, { recursive: true }); } catch(e) {}
    }
  });
}

async function sendVideoToTelegram(videoPath, caption) {
  if (!TG_TOKEN) return;
  try {
    const boundary = 'MudretsBnd' + Date.now().toString(36);
    const CRLF = '\r\n';
    const videoBuffer = fs.readFileSync(videoPath);
    const captionText = (caption || '').substring(0, 1024);

    const encodeField = (name, value) => Buffer.from(
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="${name}"${CRLF}${CRLF}` +
      `${value}${CRLF}`,
      'utf8'
    );

    const body = Buffer.concat([
      encodeField('chat_id', TG_VIDEO_CHANNEL),
      encodeField('caption', captionText),
      encodeField('supports_streaming', 'true'),
      Buffer.from(
        `--${boundary}${CRLF}` +
        `Content-Disposition: form-data; name="video"; filename="wisdom.mp4"${CRLF}` +
        `Content-Type: video/mp4${CRLF}${CRLF}`,
        'utf8'
      ),
      videoBuffer,
      Buffer.from(`${CRLF}--${boundary}--${CRLF}`, 'utf8')
    ]);

    const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendVideo`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': String(body.length)
      },
      body
    });
    const result = await res.json();
    if (result.ok) {
      console.log('[VIDEO] sent to', TG_VIDEO_CHANNEL);
    } else {
      console.error('[VIDEO TG] failed:', JSON.stringify(result));
    }
  } catch(e) { console.error('[VIDEO TG] error:', e.message); }
}

async function postToTelegram(text, photoUrl) {
  if (!TG_TOKEN) return;
  try {
    if (photoUrl) {
      await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TG_CHANNEL, photo: photoUrl, caption: text, parse_mode: 'HTML' })
      });
    } else {
      await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TG_CHANNEL, text, parse_mode: 'HTML' })
      });
    }
  } catch(e) { console.log('[TG] error:', e.message); }
}

async function sendDailyWisdom() {
  const today = getTodayKey();
  if (dailyWisdomSent.date === today && dailyWisdomSent.sent) return;
  const result = await getWisdom(0, 'ru', 'daily', 'daily');
  if (result.text) {
    await postToTelegram(`🌑 <b>Мудрость дня</b>\n\n${result.text}`, MUDRETS_IMG);
    const audio = await getAudio(result.text);
    generateAndSendVideo(result.text, null, 'Мудрец Пустоты', audio);
    dailyWisdomSent.date = today;
    dailyWisdomSent.sent = true;
  }
}

sendDailyWisdom();
setInterval(sendDailyWisdom, 60 * 60 * 1000);

app.get('/health', (req, res) => res.json({ ok: true }));

app.post('/free-wisdom', async (req, res) => {
  const { lang } = req.body;
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  const today = getTodayKey();
  const data = freeByIP.get(ip) || { date: '', used: false };

  if (data.date === today && data.used) {
    return res.status(429).json({ error: 'daily_limit' });
  }

  const result = await getWisdom(0, lang, '', 'free');
  if (!result.text) return res.status(500).json({ error: 'ai_failed' });

  freeByIP.set(ip, { date: today, used: true });

  const label = lang === 'ru' ? '🪙 <b>Нищебродская мудрость</b>' : '🪙 <b>Cheapskate wisdom</b>';
  await postToTelegram(`${label}\n\n${result.text}`, MUDRETS_IMG);
  const freeAudio = await getAudio(result.text);
  generateAndSendVideo(result.text, null, 'Мудрец Пустоты', freeAudio);

  res.json({ wisdom: result.text, free: true });
});

app.post('/wisdom', async (req, res) => {
  const { txid, lang } = req.body;
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  if (!txid) return res.status(400).json({ error: 'no_txid' });

  const seed = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

  if (txid === process.env.TEST_PASSWORD) {
    const anger = getAngerLevel(ip, 1);
    const angerLevel = angerLevelFromTotal(anger);
    const result = await getWisdom(1.0, lang, seed, 'paid');
    if (!result.text) return res.status(500).json({ error: 'ai_failed' });
    const audio = await getAudio(result.text);
    addAnger(ip, 1);
    const emoji = ['😤', '😠', '🔥', '💀', '☠️'][angerLevel - 1];
    const personaLine = result.personaName ? ` · ${result.personaName}` : '';
    const photoUrl = result.personaId ? GITHUB_PERSONAS + result.personaId + '.png' : MUDRETS_IMG;
    await postToTelegram(`${emoji} <b>Мудрость мудреца${personaLine}</b>\n\n${result.text}\n\n<i>— пожертвование: 1 USDT</i>`, photoUrl);
    generateAndSendVideo(result.text, result.personaId, result.personaName, audio);
    return res.json({ wisdom: result.text, amount: 1.0, audio, angerLevel, personaId: result.personaId, personaName: result.personaName });
  }

  if (usedTxids.has(txid)) return res.status(400).json({ error: 'already_used' });

  try {
    const txRes = await fetch(`https://apilist.tronscanapi.com/api/transaction-info?hash=${encodeURIComponent(txid)}`);
    const tx = await txRes.json();
    if (!tx || tx.hash === undefined) return res.status(400).json({ error: 'not_found' });
    if (tx.confirmed !== true && tx.confirmed !== 1) return res.status(400).json({ error: 'not_confirmed' });
    if (!tx.trc20TransferInfo || !tx.trc20TransferInfo.length) return res.status(400).json({ error: 'no_usdt' });
    const tr = tx.trc20TransferInfo[0];
    const amount = parseFloat(tr.amount_str || tr.amount || 0) / 1e6;
    const toOk = (tr.to_address || '').toUpperCase() === WALLET.toUpperCase();
    const isUsdt = (tr.symbol || '').toUpperCase().includes('USDT') || tr.contract_address === 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
    if (!isUsdt) return res.status(400).json({ error: 'not_usdt' });
    if (!toOk) return res.status(400).json({ error: 'wrong_address' });
    if (amount < 1) return res.status(400).json({ error: 'too_little', amount });

    const angerTotal = getAngerLevel(ip, amount);
    const angerLevel = angerLevelFromTotal(angerTotal);
    const result = await getWisdom(amount, lang, seed, 'paid');
    if (!result.text) return res.status(500).json({ error: 'ai_failed' });
    const audio = await getAudio(result.text);
    usedTxids.add(txid);
    addAnger(ip, amount);
    const emoji = ['😤', '😠', '🔥', '💀', '☠️'][angerLevel - 1];
    const personaLine = result.personaName ? ` · ${result.personaName}` : '';
    const photoUrl = result.personaId ? GITHUB_PERSONAS + result.personaId + '.png' : MUDRETS_IMG;
    await postToTelegram(`${emoji} <b>Мудрость мудреца${personaLine}</b>\n\n${result.text}\n\n<i>— пожертвование: ${amount.toFixed(1)} USDT</i>`, photoUrl);
    generateAndSendVideo(result.text, result.personaId, result.personaName, audio);
    res.json({ wisdom: result.text, amount, audio, angerLevel, personaId: result.personaId, personaName: result.personaName });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sage backend running on port ${PORT}`));
