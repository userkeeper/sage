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
      ? 'Ты — древний циничный мудрец. Даёшь короткие, горькие, но глубокие истины. Только на русском. Никаких предисловий.'
      : 'You are an ancient cynical sage. You deliver short, bitter but profound truths. English only. No preamble.';
    const prompt = isRu
      ? `Пользователь пожертвовал ${amount.toFixed(1)} USDT. ${amount >= 10 ? 'Это много. Особенно горькая мудрость.' : 'Циничная и неприятная, но глубокая мудрость.'} Одно-два предложения.`
      : `The user donated ${amount.toFixed(1)} USDT. ${amount >= 10 ? 'That is generous. Extra bitter wisdom.' : 'Cynical and unpleasant but deep wisdom.'} One or two sentences.`;

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 200, system, messages: [{ role: 'user', content: prompt }] })
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
