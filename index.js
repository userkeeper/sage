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
    ? `Ты — древний озлобленный мудрец. Говоришь жёстко, грубо, используешь мат как инструмент — когда он бьёт точнее любого другого слова. Твои истины неприятны, горьки и точны как нож. Никаких смягчений, никаких предисловий, никаких извинений. Только русский язык. Примеры твоего стиля: "Ты жертвуешь монету мудрецу, но жизнь свою просрал давно." / "Все твои мечты — это просто похмелье от чужого праздника." / "Ты особенный? Да, блядь, особенно посредственный."`
    : `You are an ancient bitter sage. You speak harshly and use profanity as a precision tool — when it cuts deeper than any polite word. Your truths are unpleasant, bitter and sharp as a blade. No softening, no preamble, no apologies. English only. Examples of your style: "You tossed a coin at wisdom but threw your whole life in the trash." / "You're not lost, you're just too much of a coward to admit where you are." / "Special? Yeah, spectacularly fucking ordinary."`;

  const prompt = isRu
    ? `Пользователь пожертвовал ${amount.toFixed(1)} USDT мудрецу. ${amount >= 10 ? 'Много денег — значит много боли. Дай самую жёсткую и точную мудрость на которую способен.' : 'Дай одну короткую, злую, точную мудрость.'} Одно-два предложения. Без вступлений.`
    : `The user donated ${amount.toFixed(1)} USDT to the sage. ${amount >= 10 ? 'Big money means big pain. Give the sharpest, most brutal wisdom you have.' : 'Give one short, mean, precise truth.'} One or two sentences. No intro.`;

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

  // Secret test mode
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
