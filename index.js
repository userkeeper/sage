const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const WALLET = 'TNnCZrgSQwEgWKViC1eci2MxCMdsoqTWVu';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const usedTxids = new Set();

const RU_PERSONAS = [
  "Mellstroy: в декабре 2025 сам признался что находится в розыске Интерпола по запросу Казахстана, застрял на Кипре и не может выехать, его контент признан экстремистским в Беларуси, следствие хочет арестовать его машины на 1 млрд рублей по делу об отмывании денег через казино",
  "Моргенштерн: в январе 2025 объявлен в федеральный розыск в России, его недвижимость на 200 млн рублей арестована, в марте 2026 начался заочный суд за уклонение от обязанностей иноагента, из-за страха задержания готов выступать только в трёх странах и только на частных вечеринках за $150 тысяч минимум",
  "Братишкин (Bratishkinoff): в декабре 2025 получил 7-й бан на Twitch — из-за картины с голой женщиной которая висела у него на стене за спиной, в 2025 году сам сказал 'я уже даже в свой онлайн не верю', обвинён в накрутке зрителей ботами, в ноябре 2025 посетил Госдуму",
  "Хованский: вышел из СИЗО в 2021, уехал в Сербию спасаясь от мобилизации, женился, развёлся, расстался с новой девушкой за 9 месяцев, в 2025 году пьяный плакал разговаривая с нейросетью на стриме, до сих пор не может продать квартиру в Петербурге где его арестовали",
  "Михаил Литвин: в июне 2025 прокуратура Москвы установила что он купил военный билет незаконно — сам пошутил об этом публично, шутку заметили и аннулировали отсрочку, теперь ему грозит уголовное дело за уклонение от армии, при этом снимает влоги о продуктивности и дисциплине каждый день",
  "Evelone192: в мае 2025 Twitch забанил его и в письме посоветовал обратиться к врачу по поводу психического здоровья, в 2023 году Steam заблокировал его аккаунт со скинами на 150 тысяч долларов по подозрению в краже — разблокировал только через год переговоров, в 2020 году получил бан за слово 'жадина' которое платформа посчитала антисемитским",
  "Анар Абдуллаев (anarabdullaev): в декабре 2025 стал лучшим IRL-стримером и прорывом года на SLAY 2025, вырос до миллионов подписчиков на мотивационном контенте о простой жизни в СНГ",
  "Gensyxa: в декабре 2025 стала SLAY Queen — королевой русского Twitch второй раз, при этом в том же году рассталась уже со вторым публичным парнем — сначала с Evelone, потом с рэпером Toxi$, выпустила трек 'Френдзона'",
  "StRoGo: в декабре 2025 признан лучшим CS-стримером на SLAY 2025, но в медиа упоминается в основном в контексте конфликтов с другими стримерами а не за содержание стримов",
  "Амиран Сардаров: делает интервью больше 10 лет, его гости регулярно говорят после эфира что он их не слушает и постоянно перебивает, считает себя главным интеллектуалом рунета",
  "Данила Поперечный: уехал из России, стендап в эмиграции не взлетел так же как дома, снялся вместе с Моргенштерном в видео где они насмехались над патриотической песней, злится когда его называют политическим эмигрантом а не комиком",
  "Влад Бумага: стал миллионером благодаря алгоритмам YouTube ещё в подростковом возрасте и до сих пор не может внятно объяснить почему он популярен",
  "Wylsacom: 15 лет распаковывает телефоны на YouTube, купил яхту, продолжает считать это серьёзной журналистикой",
  "Лолзер: публичные скандалы с девушками, сливы переписок, каждый раз делает вид что ничего не было",
  "Egor Kreed: позиционировал себя как серьёзный рэпер, превратился в попсу для подростков, обижается когда это говорят вслух",
  "Эльдар Джарахов: из топового блогера пытался стать рэпером — не взлетело, вернулся обратно в блогинг",
  "renatko: живёт на донаты подписчиков годами, называет это независимостью и свободой",
  "Bratishkinoff, Evelone, Buster и другие топ-стримеры: все попали в скандал с накруткой ботами в 2025 году когда Twitch внедрил антибот-систему и у них резко упала аудитория, Братишкин сам признался что не верит в собственный онлайн"
];

const EN_PERSONAS = [
  "Dr Disrespect: banned from Twitch in June 2020 and spent 4 years publicly claiming he had no idea why — in June 2024 it emerged he had sent inappropriate messages to a minor on the platform, he still has millions of YouTube subscribers and never properly addressed it",
  "MrBeast: in 2024 a former employee accused him of grooming, several collaborators distanced themselves publicly. His philanthropy videos were criticized for exploiting people in them as props without providing long-term help",
  "Logan Paul: launched CryptoZoo NFT in 2021, raised millions from fans, the game never worked. Coffeezilla exposed him in 2022. Logan sued Coffeezilla for defamation then quietly dropped the lawsuit months later after massive backlash",
  "Jake Paul: fought 58-year-old Mike Tyson on Netflix in November 2024, the fight was universally mocked — both fighters moved at walking pace for 8 rounds, Netflix servers crashed, still got 60 million viewers",
  "Andrew Tate: arrested in Romania in December 2022 on human trafficking and rape charges, spent months under house arrest, trial still ongoing in 2025 while he continues making content about being a persecuted alpha male",
  "xQc: admitted in 2023 to losing millions gambling on his own stream, Twitch banned gambling, he moved to Kick specifically for gambling sponsorship money, lost millions more on stream, his audience watched and donated while he spiraled",
  "Pokimane: announced retirement from full-time streaming in 2024 citing burnout, returned months later, sued a content creator for making a face reveal video calling it harassment, her entire career is built on parasocial fans who believe she sees them personally",
  "KSI: lost his boxing rematch against Tommy Fury in 2023 and blamed the judges, released albums the same year calling himself a multi-hyphenate artist, neither the boxing nor the music career is as good as he presents them",
  "Dream: built his entire career hiding his face, did a face reveal in October 2022 that disappointed millions and he lost subscribers rapidly, was accused of cheating in a Minecraft speedrun in 2020 — the controversy was never cleanly resolved",
  "Kai Cenat: organized a PlayStation giveaway event in New York in August 2023 that turned into a full riot with arrests, was himself charged with inciting a riot, broke Twitch viewership records the same year",
  "IShowSpeed: fainted live on stream in 2023 during a horror game, has been banned from multiple platforms including YouTube, built entire brand on screaming and chaos rather than any actual skill",
  "Trisha Paytas: monetized every personal crisis including mental health breakdowns and relationship collapses into viral YouTube content, had multiple public meltdowns that she then profited from",
  "Ninja: dropped by Adidas and major sponsors in 2024, cried publicly about it, announced retirement then returned within months — has retired and come back multiple times claiming each time it is final"
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

app.get('/health', (req, res) => res.json({ ok: true }));

async function getWisdom(amount, lang, seed) {
  const isRu = lang === 'ru';
  const persona = isRu ? pickRandom(RU_PERSONAS) : pickRandom(EN_PERSONAS);

  const tones = isRu
    ? ['с матом и злостью', 'сухо и беспощадно', 'с иронией и презрением', 'коротко и в точку', 'издевательски спокойно']
    : ['with profanity and rage', 'dry and merciless', 'with cold irony', 'short and precise', 'mockingly calm'];

  const tone = tones[Math.floor(Math.random() * tones.length)];

  const system = isRu
    ? `Ты — древний озлобленный мудрец. Каждая твоя мудрость абсолютно уникальна. Сегодня говоришь ${tone}. Используй ТОЛЬКО реальный факт о конкретном человеке из контекста который тебе дадут. Проводи параллель с тем кто пожертвовал. Никаких предисловий. Одно-два предложения максимум. Разнообразь форму: иногда начинай с имени стримера, иногда с факта, иногда с обращения к пользователю. Случайность: ${seed}`
    : `You are an ancient bitter sage. Every wisdom you give is completely unique. Today you speak ${tone}. Use ONLY the real fact about a specific person from the context given. Draw a parallel with the person who donated. No preamble. One or two sentences max. Vary the form each time. Randomness: ${seed}`;

  const prompt = isRu
    ? `Пользователь пожертвовал ${amount.toFixed(1)} USDT. ${amount >= 10 ? 'Много денег — дай самую жёсткую и унизительную мудрость.' : amount >= 5 ? 'Неплохо — дай злую точную мудрость.' : 'Дай колкую обидную мудрость.'}

Используй ЭТОТ реальный факт (только его, не выдумывай): ${persona}

Сравни ситуацию с судьбой пользователя. Одно-два предложения. Без вступлений.`
    : `The user donated ${amount.toFixed(1)} USDT. ${amount >= 10 ? 'Big money — give the most brutal and humiliating wisdom.' : amount >= 5 ? 'Decent — give a sharp cutting wisdom.' : 'Give an offensive cutting wisdom.'}

Use ONLY THIS real fact (do not invent anything): ${persona}

Compare to the user's situation. One or two sentences. No intro.`;

  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01'
    },
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

app.post('/wisdom', async (req, res) => {
  const { txid, lang } = req.body;
  if (!txid) return res.status(400).json({ error: 'no_txid' });

  const seed = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

  if (txid === process.env.TEST_PASSWORD) {
    const wisdom = await getWisdom(1.0, lang, seed);
    if (!wisdom) return res.status(500).json({ error: 'ai_failed' });
    return res.json({ wisdom, amount: 1.0 });
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
    const wisdom = await getWisdom(amount, lang, seed);
    if (!wisdom) return res.status(500).json({ error: 'ai_failed' });
    usedTxids.add(txid);
    res.json({ wisdom, amount });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sage backend running on port ${PORT}`));
