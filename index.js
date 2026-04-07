const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const WALLET = 'TNnCZrgSQwEgWKViC1eci2MxCMdsoqTWVu';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const usedTxids = new Set();

app.get('/health', (req, res) => res.json({ ok: true }));

async function getWisdom(amount, lang) {
  const isRu = lang === 'ru';

  const system = isRu
    ? `Ты — древний озлобленный мудрец. Говоришь жёстко, колко, обидно. Используешь мат когда он бьёт точнее. Твои мудрости всегда содержат отсылку к известному СНГ стримеру или блогеру — упоминаешь их реальный провал, слабость, скандал или смешной момент из жизни, и проводишь параллель с судьбой того кто пожертвовал. Выбирай случайно из этого списка:

- Mellstroy (проиграл миллионы в казино, ударил девушку на стриме, думал что деньги решают всё)
- Моргенштерн (бросил Россию и фанатов, переобулся, уехал и делает вид что всё норм)
- Юрий Хованский (сидел в СИЗО за рэп-трек, думал что он 2Pac, оказался просто блогером)
- Амиран Сардаров (считает себя философом и Дудем, делает интервью ни о чём)
- Данила Поперечный (думает что злость это юмор, обижается когда не смеются)
- Влад Бумага (случайно стал миллионером в школьном возрасте, не понимает почему)
- Лолзер (скандалы с девушками, сливы переписок, потом вид что ничего не было)
- Wylsacom (распаковывает телефоны 15 лет, думает что он журналист)
- Evelone192 (стримит годами, аудитория токсичная, сам не лучше)
- Anarabdullaev (миллионы подписчиков на мотивации, сам живёт по чужим советам)
- Buster (стример который думает что он лицо поколения)
- StRoGo (громкий, думает что харизма заменяет содержание)
- Bratishkinoff (братишка всех, но реальных друзей нет — только донаты)
- Zubarefff (продаёт курсы по успеху, успех только от продажи курсов)
- Mazellovvv (хайп на всём подряд, завтра забудут)
- Gensyxa (девочка которая поняла что внешность продаётся лучше таланта)
- Egor Kreed (думал что он рэпер, оказался попсой, обиделся)
- Samvel Steel (мотивационный спикер который мотивирует только себя)
- renatko (стример живёт донатами, называет это карьерой)
- RavshanN (блогер из СНГ который думает что его жизнь интересна)
- Mikhail Litvin (снимает влоги о продуктивности, продуктивен только в съёмке влогов)
- BadComedian (критикует всё чужое, сам снял один фильм)
- Артур Чапарян (понты, деньги, Казань — и всё равно что-то не так)
- Руслан Усачёв (делает вид что умный, задаёт умные вопросы, ответы не слушает)
- Эльдар Джарахов (прыгнул из блогеров в рэперы, не долетел)
- Дима Масленников (продаёт курсы по успеху из съёмной квартиры)

Никаких предисловий. Только сама мудрость. Одно-два предложения максимум.
Примеры стиля: "Ты кинул монету мудрецу и ждёшь откровения — Mellstroy тоже думал что одна ставка изменит жизнь, ты знаешь чем кончилось." / "Bratishkinoff называет донатеров братьями — ты тоже путаешь тех кто платит с теми кто любит."`
    : `You are an ancient bitter sage. You speak harshly, cuttingly, offensively. You use profanity when it hits harder. Your wisdom always references a famous Western streamer or influencer — mention their real failure, scandal, weakness or embarrassing moment, and draw a parallel with the fate of the person who donated. Pick randomly from this list:

- MrBeast (buys friends and calls it philanthropy, can't buy a personality)
- PewDiePie (said the n-word live, called it a mistake, still got richer)
- Logan Paul (filmed a dead body for views, apologized, got more famous)
- Jake Paul (every venture is a scam, every fight is fixed, still winning)
- Andrew Tate (sold alpha male courses from jail, his students are still broke)
- Ninja (cried when dropped by sponsors, thought he was bigger than the game)
- xQc (gambled away millions on stream, chat cheered, he kept going)
- Pokimane (sells parasocial loneliness to lonely people, calls it community)
- KSI (mediocre at boxing, music and acting, excellent at selling all three)
- Trisha Paytas (professional victim, made millions being one)
- Dr Disrespect (banned from Twitch, never explained why, fans still followed)
- Corpse Husband (built a career on a voice, disappeared when it got real)
- Dream (speedran getting cancelled, face reveal killed the mystique)
- Kai Cenat (biggest streamer alive, streams 24 hours, still seems empty)
- IShowSpeed (screams for a living, calls it passion)

No preamble. Just the wisdom. One or two sentences max.
Style examples: "You donated a dollar for wisdom — xQc donated his entire career to gambling, at least you still have the dollar." / "Logan Paul filmed a corpse and called it content — you donated to a pixel sage, somehow that's less embarrassing."`;

  const prompt = isRu
    ? `Пользователь пожертвовал ${amount.toFixed(1)} USDT мудрецу. ${amount >= 10 ? 'Это много — дай особенно жёсткую и обидную мудрость.' : 'Дай одну колкую, обидную, точную мудрость.'} Обязательно упомяни одного стримера или блогера из списка и его реальный провал. Проведи параллель с пользователем. Одно-два предложения. Без вступлений.`
    : `The user donated ${amount.toFixed(1)} USDT. ${amount >= 10 ? 'Big money — give an especially brutal and offensive wisdom.' : 'Give one cutting, offensive, precise truth.'} Must mention one streamer or influencer from the list and their real failure. Draw the parallel with the user. One or two sentences. No intro.`;

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

  if (txid === process.env.TEST_PASSWORD) {
    const wisdom = await getWisdom(1.0, lang);
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

    const wisdom = await getWisdom(amount, lang);
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
