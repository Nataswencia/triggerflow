/**
 * TriggerFlow Forms — Vercel Serverless Function
 *
 * POST /api/form-submit
 * 1. Sends Telegram notification to owner
 * 2. If scan service — calls n8n webhook to start pipeline
 */

const TELEGRAM_BOT_TOKEN = '8156493526:AAHC3QdxEKAXn1_fW0hxrllw7TChzQSK6BQ';
const TELEGRAM_CHAT_ID = '1039655518';
const SCAN_WEBHOOKS = {
  'SiteMoney Scan PRO': 'https://nataswencia.app.n8n.cloud/webhook/scan-pro',
  'SiteMoney Scan Light': 'https://nataswencia.app.n8n.cloud/webhook/scan-light',
  'Google Ads Scan': 'https://nataswencia.app.n8n.cloud/webhook/scan-pro',
  'Google Ads Scan PRO': 'https://nataswencia.app.n8n.cloud/webhook/scan-pro',
  'Google Ads Scan Light': 'https://nataswencia.app.n8n.cloud/webhook/scan-light'
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const data = req.body;
    if (!data || !data.email || !data.form_type) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const id = generateId();
    const service = data.service_name || data.service || '-';
    const price = data.service_price || data.price || '-';

    const formLabels = {
      'express': 'Заявка на услугу',
      'consult': 'Запрос консультации',
      'bot-onboarding': 'Подключение бота',
      'subscription': 'Подписка'
    };
    const label = formLabels[data.form_type] || data.form_type;

    // 1. Telegram notification to owner
    const lines = [
      `FORM|${id}|${data.form_type}|${service}|${price}`,
      '', label,
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
    lines.push('', `Страница: ${data.source_page || '-'}`, `Язык: ${data.source_language || '-'}`);

    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: lines.join('\n') })
    }).catch(err => console.error('Telegram error:', err));

    // 2. If scan service — trigger correct n8n pipeline via webhook
    const webhookUrl = Object.keys(SCAN_WEBHOOKS).reduce((url, key) => {
      return url || (service.indexOf(key) !== -1 ? SCAN_WEBHOOKS[key] : null);
    }, null);
    if (webhookUrl && data.website_url) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: data.website_url,
          email: data.email,
          name: data.name || 'Client',
          phone: data.phone || '',
          service: service
        })
      }).catch(err => console.error('n8n webhook error:', err));
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