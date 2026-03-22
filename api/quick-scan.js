/**
 * TriggerFlow Quick Scan — Vercel Serverless Function
 *
 * POST /api/quick-scan
 * Body: { url: "https://site.com", type: "sitemoney|sitemoney-pro|firstscreen|seo-text|one-page" }
 *
 * Returns instant mini-audit (3 criteria / 2 metrics / 1 score)
 * as a teaser for paid full analysis.
 *
 * Stack: Jina Reader (page content) + GPT-4o-mini (analysis)
 * Cost per scan: ~$0.003
 */

const JINA_API_KEY = 'jina_f2bfaf3c0c4749dbbf88ccff8bec168bAXKIn6Nhja1p_3w8HSUiY5L50dHq';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SCAN_TYPES = {
  'sitemoney': {
    name: 'SiteMoney Scan Light',
    price: '79',
    fullUrl: '/sitemoney-scan',
    prompt: `Проведи экспресс-аудит сайта по 3 критериям из 21 (методология TriggerFlow 3.0).

Оцени ТОЛЬКО эти 3 критерия:
1. Первый экран (Above-The-Fold) — понимает ли посетитель суть за 5 секунд
2. Аудит доверия — отзывы, сертификаты, юрлицо, контакты
3. Ясность пути конверсии — один CTA, понятный следующий шаг

Шкала: 1 (критично) - 5 (отлично).

Верни JSON:
{
  "criteria": [
    {"id": 1, "name": "Первый экран", "score": 0, "summary": "1-2 предложения что хорошо/плохо", "key_issue": "главная проблема"},
    {"id": 2, "name": "Аудит доверия", "score": 0, "summary": "...", "key_issue": "..."},
    {"id": 3, "name": "Ясность CTA", "score": 0, "summary": "...", "key_issue": "..."}
  ],
  "total_score": 0,
  "max_score": 15,
  "one_liner": "Одно предложение - главный вывод",
  "remaining_count": 18
}`
  },

  'sitemoney-pro': {
    name: 'SiteMoney Scan PRO',
    price: '149',
    fullUrl: '/sitemoney-scan',
    prompt: `Проведи экспресс-аудит сайта по 3 критериям из 21 (методология TriggerFlow 3.0).

Оцени ТОЛЬКО эти 3 критерия:
1. Первый экран (Above-The-Fold) — H1, CTA, визуальная иерархия
2. Фичи vs Выгоды — говорит языком клиента или технаря
3. Матрица убеждения (Чалдини) — какие триггеры используются

Шкала: 1 (критично) - 5 (отлично).

Верни JSON:
{
  "criteria": [
    {"id": 1, "name": "Первый экран", "score": 0, "summary": "1-2 предложения", "key_issue": "главная проблема"},
    {"id": 4, "name": "Фичи vs Выгоды", "score": 0, "summary": "...", "key_issue": "..."},
    {"id": 5, "name": "Матрица убеждения", "score": 0, "summary": "...", "key_issue": "..."}
  ],
  "total_score": 0,
  "max_score": 15,
  "one_liner": "Одно предложение - главный вывод",
  "remaining_count": 18,
  "pdf_preview": true
}`
  },

  'firstscreen': {
    name: 'First Screen Verdict',
    price: '79',
    fullUrl: '/services',
    prompt: `Проведи экспресс-оценку первого экрана сайта (Above-The-Fold).

Оцени по одному комплексному критерию:
- H1 отвечает на "что это?" и "зачем мне?"
- CTA виден без скролла
- Визуальная иерархия ведёт взгляд к CTA
- Ценность очевидна без чтения всей страницы

Шкала: 1 (критично) - 10 (отлично).

Верни JSON:
{
  "score": 0,
  "max_score": 10,
  "verdict": "Слабый / Средний / Хороший / Отличный",
  "h1_analysis": "Что хорошо/плохо в H1",
  "cta_analysis": "Что хорошо/плохо в CTA",
  "hierarchy_note": "Комментарий по визуальной иерархии",
  "one_liner": "Одно предложение - главный вывод",
  "top_fix": "Что исправить в первую очередь"
}`
  },

  'seo-text': {
    name: 'SEO Text Reality Check',
    price: '69',
    fullUrl: '/services',
    prompt: `Проведи экспресс-SEO анализ текста сайта. Оцени 2 метрики:

1. Title tag — длина, ключевые слова, уникальность, CTA-элемент
2. Meta Description — длина, привлекательность, call-to-action

Шкала каждой метрики: 1 (критично) - 5 (отлично).

Верни JSON:
{
  "metrics": [
    {"name": "Title Tag", "score": 0, "current_value": "текущий title", "issue": "проблема", "fix": "как исправить"},
    {"name": "Meta Description", "score": 0, "current_value": "текущий description", "issue": "проблема", "fix": "как исправить"}
  ],
  "total_score": 0,
  "max_score": 10,
  "one_liner": "Одно предложение - главный вывод",
  "remaining_checks": ["H-теги", "Alt-тексты", "Внутренние ссылки", "Скорость загрузки", "Mobile-friendly", "Schema.org", "Canonical", "Robots.txt"]
}`
  },

  'one-page': {
    name: 'One Page Breakdown',
    price: '249',
    fullUrl: '/services',
    prompt: `Проведи экспресс-анализ страницы. Найди 3 самые критичные проблемы (из ~15 которые обычно находятся).

Для каждой проблемы:
- Название
- Серьёзность (Критично / Важно / Желательно)
- Что не так (1-2 предложения)
- Как исправить (1 предложение)

Верни JSON:
{
  "problems": [
    {"name": "название", "severity": "Критично", "issue": "что не так", "fix": "как исправить"},
    {"name": "название", "severity": "Важно", "issue": "что не так", "fix": "как исправить"},
    {"name": "название", "severity": "Желательно", "issue": "что не так", "fix": "как исправить"}
  ],
  "total_found": 3,
  "estimated_total": 12,
  "one_liner": "Одно предложение - главный вывод"
}`
  }
};

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { url, type } = req.body;

    if (!url || !type || !SCAN_TYPES[type]) {
      return res.status(400).json({ error: 'Missing url or invalid type' });
    }

    if (OPENAI_API_KEY === 'NEEDS_KEY') {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    const scanConfig = SCAN_TYPES[type];

    // 1. Fetch page content via Jina Reader
    const jinaResponse = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        'Accept': 'text/plain',
        'Authorization': `Bearer ${JINA_API_KEY}`
      }
    });
    const pageText = await jinaResponse.text();

    // Truncate to save tokens
    const truncated = pageText.substring(0, 4000);

    // 2. Call GPT-4o-mini for quick analysis
    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Ты - AI-аудитор сайтов. Отвечай ТОЛЬКО валидным JSON без markdown-обёртки. Обращение на "вы". Не используй длинное тире, только дефис. Стиль: прямой, конкретный.'
          },
          {
            role: 'user',
            content: `${scanConfig.prompt}\n\n## ТЕКСТ САЙТА:\n${truncated}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      })
    });

    const gptData = await gptResponse.json();
    const content = gptData.choices[0].message.content;

    // Parse JSON from GPT response (strip markdown if present)
    let result;
    try {
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(jsonStr);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to parse AI response', raw: content });
    }

    // Add metadata
    result.scan_type = type;
    result.scan_name = scanConfig.name;
    result.price = scanConfig.price;
    result.full_url = scanConfig.fullUrl;
    result.scanned_url = url;

    return res.status(200).json(result);

  } catch (err) {
    console.error('Quick scan error:', err);
    return res.status(500).json({ error: 'Scan failed', message: err.message });
  }
}