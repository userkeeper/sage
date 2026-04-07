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

app.post('/wisdom', async (req, res) => {
  const { txid, lang } = req.body;

  if (!txid) return res.status(400).json({ error: 'no_txid' });
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

    const isRu = lang === 'ru';

    const system = isRu
      ? 'Ты — древний циничный мудрец. Говоришь прямо и грубо, используешь русский мат естественно и к месту — не ради эпатажа, а когда это усиливает смысл. Даёшь короткие, горькие, но глубокие жизненные истины. Только на русском языке. Никаких предисловий, никаких извинений — только сама мудрость.'
      : 'You are an ancient cynical sage. You speak directly and coarsely, using profanity naturally and where it hits hardest — not for shock value, but when it sharpens the truth. You deliver short, bitter, but genuinely profound life truths. English only. No preamble, no apologies — just the wisdom itself.';

    const prompt = isRu
      ? `Пользователь пожертвовал ${amount.toFixed(1)} USDT. ${amount >= 10 ? 'Это много. Дай особенно резкую и глубокую мудрость.' : 'Дай циничную, неприятную, но глубокую мудрость.'} Одно-два предложения. Мат уместен если усиливает смысл.`
      : `The user donated ${amount.toFixed(1)} USDT. ${amount >= 10 ? 'That is generous. Give an especially sharp and profound piece of wisdom.' : 'Give a cynical, unpleasant but deeply true piece of wisdom.'} One or two sentences. Profanity is welcome if it sharpens the point.`;

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 200,
        system,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const ai = await aiRes.json();
    const wisdom = ai.content?.[0]?.text;

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
