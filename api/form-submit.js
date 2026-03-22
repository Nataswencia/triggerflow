/**
 * TriggerFlow Forms — Vercel Serverless Function
 *
 * POST /api/form-submit
 * Receives form data, sends to Telegram @TriggerFlow_analyse_bot
 * n8n Telegram Trigger picks up the message and routes by form_type
 */

const TELEGRAM_BOT_TOKEN = '8156493526:AAHC3QdxEKAXn1_fW0hxrllw7TChzQSK6BQ';
const TELEGRAM_CHAT_ID = '1039655518';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const data = req.body;

    if (!data || !data.email || !data.form_type) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Generate unique ID
    const id = generateId();

    // Build Telegram message
    // First line: machine-readable for n8n routing
    // Rest: human-readable notification
    const formLabels = {
      'express': 'Заявка на услугу',
      'consult': 'Запрос консультации',
      'bot-onboarding': 'Подключение бота',
      'subscription': 'Подписка'
    };

    const label = formLabels[data.form_type] || data.form_type;
    const service = data.service_name || data.service || '-';
    const price = data.service_price || data.price || '-';

    const lines = [
      `FORM|${id}|${data.form_type}|${service}|${price}`,
      '',
      label,
      `Услуга: ${service} (${price})`,
      `Имя: ${data.name || '-'}`,
      `Email: ${data.email || '-'}`
    ];

    if (data.website_url) lines.push(`Сайт: ${data.website_url}`);
    if (data.phone) lines.push(`Тел: ${data.phone}`);
    if (data.company) lines.push(`Компания: ${data.company}`);
    if (data.message) lines.push(`Сообщение: ${data.message}`);
    if (data.niche) lines.push(`Ниша: ${data.niche}`);
    if (data.geography) lines.push(`Гео: ${data.geography}`);
    if (data.tg_username) lines.push(`Telegram: ${data.tg_username}`);
    if (data.selected_plan) lines.push(`Тариф: ${data.selected_plan}`);
    lines.push('');
    lines.push(`Страница: ${data.source_page || '-'}`);
    lines.push(`Язык: ${data.source_language || '-'}`);

    // Send to Telegram
    const tgResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: lines.join('\n')
        })
      }
    );

    if (!tgResponse.ok) {
      const err = await tgResponse.text();
      console.error('Telegram error:', err);
      return res.status(500).json({ success: false, error: 'Telegram send failed' });
    }

    return res.status(200).json({ success: true, id: id });

  } catch (err) {
    console.error('Form submit error:', err);
    return res.status(500).json({ success: false, error: 'Internal error' });
  }
}

function generateId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}