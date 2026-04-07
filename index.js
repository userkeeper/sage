const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const WALLET = 'TNnCZrgSQwEgWKViC1eci2MxCMdsoqTWVu';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const TG_TOKEN = process.env.TG_BOT_TOKEN;
const TG_CHANNEL = process.env.TG_CHANNEL || '@mudrets_on';

// In-memory storage
const usedTxids = new Set();
const freeByIP = new Map(); // ip -> { date, count }
const angerByIP = new Map(); // ip -> total usd donated today
const dailyWisdomSent = { date: '', sent: false };

const RU_PERSONAS = [
  "Mellstroy: в декабре 2025 сам признался что находится в розыске Интерпола по запросу Казахстана, застрял на Кипре, его контент признан экстремистским в Беларуси, следствие хочет арестовать его имущество на 1 млрд рублей",
  "Моргенштерн: в январе 2025 объявлен в федеральный розыск, недвижимость на 200 млн арестована, в марте 2026 начался заочный суд, выступает только в 3 странах за $150k минимум",
  "Братишкин: в декабре 2025 получил 7-й бан на Twitch из-за картины с голой женщиной на стене, сам сказал 'я уже даже в свой онлайн не верю', обвинён в накрутке ботами",
  "Хованский: вышел из СИЗО в 2021, уехал в Сербию, женился, развёлся, расстался с новой девушкой за 9 месяцев, в 2025 пьяный плакал разговаривая с нейросетью, не может продать квартиру где его арестовали",
  "Михаил Литвин: в 2025 прокуратура установила что он купил военный билет — сам пошутил об этом публично, шутку заметили, аннулировали отсрочку, грозит уголовка, при этом снимает влоги о дисциплине каждый день",
  "Evelone192: в мае 2025 Twitch забанил его и в письме посоветовал обратиться к психиатру, Steam заблокировал его аккаунт со скинами на $150k по подозрению в краже — разблокировали через год",
  "Gensyxa: в декабре 2025 стала SLAY Queen второй раз, в том же году рассталась с двумя парнями подряд — сначала с Evelone потом с рэпером Toxi$, выпустила трек Френдзона",
  "Данила Поперечный: уехал из России, стендап в эмиграции не взлетел, злится когда его называют политическим эмигрантом а не комиком",
  "Egor Kreed: позиционировал себя как серьёзный рэпер, стал попсой для подростков, обижается когда это говорят",
  "Эльдар Джарахов: из топового блогера пытался стать рэпером — не взлетело, вернулся в блогинг",
  "renatko: живёт на донаты годами, называет это независимостью",
  "RavshanN (Равшан): узбекский блогер с миллионами подписчиков, снимает контент о простой жизни и деньгах, один из самых быстрорастущих СНГ блогеров 2024-2025",
  "Иван Золо: в декабре 2025 получил приз Человек-мем года на SLAY 2025, стал вирусным мемом рунета",
  "Samvel Steel (Стил): мотивационный спикер и бизнес-блогер, продаёт курсы по успеху и финансовой независимости",
];

const EN_PERSONAS = [
  "Dr Disrespect: banned from Twitch in 2020 and spent 4 years claiming he had no idea why — turned out he sent inappropriate messages to a minor, still has millions of subscribers",
  "MrBeast: in 2024 a former employee accused him of grooming, his philanthropy videos were criticized for exploiting people as props without long-term help",
  "Logan Paul: launched CryptoZoo NFT in 2021, raised millions, game never worked, Coffeezilla exposed him, Logan sued then quietly dropped the lawsuit",
  "Jake Paul: fought 58-year-old Mike Tyson on Netflix in November 2024, both moved at walking pace, Netflix crashed, still got 60 million viewers",
  "Andrew Tate: arrested in Romania in December 2022 on human trafficking charges, trial still ongoing in 2025, continues making content about being a persecuted alpha male",
  "xQc: admitted losing millions gambling on his own stream, moved to Kick for gambling money, lost millions more while his audience cheered",
  "Pokimane: announced retirement citing burnout in 2024, returned months later, career built on parasocial fans who believe she notices them personally",
  "KSI: lost boxing rematch against Tommy Fury in 2023 and blamed judges, releases music calling himself multi-hyphenate, neither career is as good as he claims",
  "Dream: built career hiding his face, face reveal in 2022 disappointed millions, accused of Minecraft speedrun cheating never cleanly resolved",
  "Kai Cenat: organized giveaway in NYC in 2023 that turned into a riot, charged with inciting a riot, broke Twitch records the same year",
  "Ninja: dropped by Adidas in 2024, cried publicly, announced retirement then returned months later — has done this multiple times",
  "Trisha Paytas: monetized every personal crisis and mental health breakdown into viral content, profited from every public meltdown"
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

// 0-100 anger scale mapped to level 1-5
function angerLevelFromTotal(total) {
  if (total <= 0) return 1;
  if (total < 5) return 2;
  if (total < 20) return 3;
  if (total < 50) return 4;
  return 5;
}

async function getWisdom(amount, lang, seed, type = 'paid') {
  const isRu = lang === 'ru';
  const angerLevel = angerLevelFromTotal(amount);

  let system, prompt;

  if (type === 'free') {
    system = isRu
      ? `Ты — древний суровый мудрец с чёрным юмором. Когда к тебе приходят без пожертвования, ты даёшь короткую горькую мудрость о том что бесплатный сыр бывает только в мышеловке, что скупость — это тоже черта характера которая многое говорит о человеке, и намекаешь что те кто жертвуют получают нечто особенное. Говори иронично, с сарказмом, но без прямых оскорблений. 1-2 предложения. Без предисловий.`
      : `You are an ancient sage with dark humor. When someone comes without a donation, you give a short bitter wisdom about how free cheese only exists in mousetraps, how stinginess reveals character, and hint that those who donate receive something special. Speak ironically, with sarcasm, without direct insults. 1-2 sentences. No preamble.`;
    prompt = isRu ? 'Дай ироничную мудрость человеку который пришёл без пожертвования.' : 'Give ironic wisdom to someone who came without a donation.';
  } else if (type === 'daily') {
    system = isRu
      ? `Ты — древний мудрец. Дай мудрость дня — короткую, горькую, универсальную. Можешь использовать мат к месту. Без предисловий.`
      : `You are an ancient sage. Give the wisdom of the day — short, bitter, universal. Profanity welcome if it fits. No preamble.`;
    prompt = isRu ? 'Мудрость дня для всех.' : 'Wisdom of the day for everyone.';
  } else {
    const persona = isRu ? pickRandom(RU_PERSONAS) : pickRandom(EN_PERSONAS);
    const tones = isRu
      ? ['с матом и злостью', 'сухо и беспощадно', 'с иронией и презрением', 'издевательски спокойно']
      : ['with profanity and rage', 'dry and merciless', 'with cold irony', 'mockingly calm'];
    const tone = tones[Math.floor(Math.random() * tones.length)];

    const angerDesc = isRu
      ? ['слегка недоволен', 'раздражён', 'разозлён', 'яростен', 'в абсолютной ярости — мудрость максимально мерзкая и беспощадная'][angerLevel - 1]
      : ['slightly displeased', 'irritated', 'angered', 'furious', 'in absolute rage — wisdom is maximally vile and merciless'][angerLevel - 1];

    system = isRu
      ? `Ты — древний озлобленный мудрец. Сейчас ты ${angerDesc}. Говоришь ${tone}. Каждая мудрость уникальна. Используй ТОЛЬКО реальный факт из контекста. Никаких предисловий. 1-2 предложения. Случайность: ${seed}`
      : `You are an ancient bitter sage. Right now you are ${angerDesc}. Speak ${tone}. Every wisdom is unique. Use ONLY the real fact from context. No preamble. 1-2 sentences. Seed: ${seed}`;

    prompt = isRu
      ? `Пользователь пожертвовал ${amount.toFixed(1)} USDT.\n\nФакт: ${persona}\n\nПроведи параллель. 1-2 предложения. Без вступлений.`
      : `The user donated ${amount.toFixed(1)} USDT.\n\nFact: ${persona}\n\nDraw parallel. 1-2 sentences. No intro.`;
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
  return ai.content?.[0]?.text || null;
}

async function getAudio(text) {
  try {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({ model: 'tts-1-hd', input: text, voice: 'ash', speed: 0.9 })
    });
    if (!res.ok) { console.log('[TTS] error:', await res.text()); return null; }
    const buffer = await res.buffer();
    return buffer.toString('base64');
  } catch(e) { console.log('[TTS] exception:', e.message); return null; }
}

async function postToTelegram(text, label = '') {
  if (!TG_TOKEN) return;
  try {
    const msg = label ? `${label}\n\n${text}` : text;
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHANNEL, text: msg, parse_mode: 'HTML' })
    });
  } catch(e) { console.log('[TG] error:', e.message); }
}

async function sendDailyWisdom() {
  const today = getTodayKey();
  if (dailyWisdomSent.date === today && dailyWisdomSent.sent) return;
  const wisdom = await getWisdom(0, 'ru', 'daily', 'daily');
  if (wisdom) {
    await postToTelegram(`🌑 <b>Мудрость дня</b>\n\n${wisdom}`, '');
    dailyWisdomSent.date = today;
    dailyWisdomSent.sent = true;
  }
}

// Send daily wisdom at startup if not sent yet today
sendDailyWisdom();
// Check every hour
setInterval(sendDailyWisdom, 60 * 60 * 1000);

app.get('/health', (req, res) => res.json({ ok: true }));

// Free wisdom endpoint
app.post('/free-wisdom', async (req, res) => {
  const { lang } = req.body;
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  const today = getTodayKey();
  const data = freeByIP.get(ip) || { date: '', used: false };

  if (data.date === today && data.used) {
    return res.status(429).json({ error: 'daily_limit', message: lang === 'ru'
      ? 'Ты уже получил свою нищебродскую мудрость на сегодня. Возвращайся завтра или заплати.'
      : 'You already got your cheapskate wisdom today. Come back tomorrow or pay.' });
  }

  const wisdom = await getWisdom(0, lang, '', 'free');
  if (!wisdom) return res.status(500).json({ error: 'ai_failed' });

  freeByIP.set(ip, { date: today, used: true });

  const label = lang === 'ru'
    ? '🪙 <b>Нищебродская мудрость</b>'
    : '🪙 <b>Cheapskate wisdom</b>';
  await postToTelegram(`${label}\n\n${wisdom}`);

  // No audio for free tier
  res.json({ wisdom, free: true });
});

// Paid wisdom endpoint
app.post('/wisdom', async (req, res) => {
  const { txid, lang } = req.body;
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  if (!txid) return res.status(400).json({ error: 'no_txid' });

  const seed = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

  // Test mode
  if (txid === process.env.TEST_PASSWORD) {
    const anger = getAngerLevel(ip, 1);
    const angerLevel = angerLevelFromTotal(anger);
    const wisdom = await getWisdom(1.0, lang, seed, 'paid');
    if (!wisdom) return res.status(500).json({ error: 'ai_failed' });
    const audio = await getAudio(wisdom);
    addAnger(ip, 1);
    await postToTelegram(`🔥 <b>Мудрость мудреца</b>\n\n${wisdom}\n\n<i>— пожертвование: 1 USDT (тест)</i>`);
    return res.json({ wisdom, amount: 1.0, audio, angerLevel });
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

    const wisdom = await getWisdom(amount, lang, seed, 'paid');
    if (!wisdom) return res.status(500).json({ error: 'ai_failed' });
    const audio = await getAudio(wisdom);

    usedTxids.add(txid);
    addAnger(ip, amount);

    const emoji = ['😤', '😠', '🔥', '💀', '☠️'][angerLevel - 1];
    await postToTelegram(`${emoji} <b>Мудрость мудреца</b>\n\n${wisdom}\n\n<i>— пожертвование: ${amount.toFixed(1)} USDT</i>`);

    res.json({ wisdom, amount, audio, angerLevel });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sage backend running on port ${PORT}`));
