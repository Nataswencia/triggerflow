/**
 * TriggerFlow - Quick Scan Demo UI
 * Handles quick scan demo experience on product pages.
 * User clicks demo button -> enters URL -> sees progress -> gets results inline.
 */
(function () {
  'use strict';

  var API_ENDPOINT = '/api/quick-scan';
  var CSS_INJECTED = false;

  var SCAN_CONFIG = {
    'sitemoney': {
      title: 'Экспресс-анализ сайта',
      cta: 'Полный аудит (21 критерий) за 79\u20ac',
      price: '79',
      resultType: 'criteria'
    },
    'sitemoney-pro': {
      title: 'Экспресс-анализ PRO',
      cta: 'Полный PRO аудит + PDF за 149\u20ac',
      price: '149',
      resultType: 'criteria'
    },
    'firstscreen': {
      title: 'Оценка первого экрана',
      cta: 'Полный разбор First Screen за 79\u20ac',
      price: '79',
      resultType: 'firstscreen'
    },
    'seo-text': {
      title: 'SEO экспресс-проверка',
      cta: 'Полный SEO Text Reality Check за 69\u20ac',
      price: '69',
      resultType: 'seo'
    },
    'one-page': {
      title: 'Экспресс-анализ страницы',
      cta: 'Полный One Page Breakdown за 249\u20ac',
      price: '249',
      resultType: 'problems'
    }
  };

  var LOADING_MESSAGES = [
    { text: 'Читаем контент страницы...', at: 0 },
    { text: 'Анализируем структуру...', at: 5000 },
    { text: 'AI оценивает критерии...', at: 10000 },
    { text: 'Формируем результат...', at: 20000 }
  ];

  // --- Helpers ---

  function scoreColor(score) {
    var n = parseInt(score, 10);
    if (n <= 2) return '#ef4444';
    if (n === 3) return '#f59e0b';
    if (n === 4) return '#3b82f6';
    return '#00d084';
  }

  function severityColor(severity) {
    var s = (severity || '').toLowerCase();
    if (s.indexOf('критич') !== -1) return '#ef4444';
    if (s.indexOf('важн') !== -1) return '#f59e0b';
    return '#3b82f6';
  }

  function normalizeUrl(url) {
    var trimmed = (url || '').trim();
    if (!trimmed) return '';
    if (trimmed.indexOf('http://') !== 0 && trimmed.indexOf('https://') !== 0) {
      trimmed = 'https://' + trimmed;
    }
    return trimmed;
  }

  function el(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  function esc(str) {
    var d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  // --- CSS Injection ---

  function injectCSS() {
    if (CSS_INJECTED) return;
    CSS_INJECTED = true;
    var style = document.createElement('style');
    style.textContent = [
      '.qs-overlay{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.8);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;transition:opacity .25s ease}',
      '.qs-overlay.qs-visible{opacity:1}',
      '.qs-modal{position:relative;width:100%;max-width:640px;background:#111827;border-radius:20px;padding:32px;max-height:85vh;overflow-y:auto;color:#fff;font-family:Arial,sans-serif;box-shadow:0 24px 80px rgba(0,0,0,0.5)}',
      '.qs-close{position:absolute;top:12px;right:12px;width:40px;height:40px;background:none;border:none;color:#fff;font-size:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:10px;transition:background .2s}',
      '.qs-close:hover{background:rgba(255,255,255,0.1)}',
      '.qs-hidden{display:none!important}',
      '.qs-title{font-size:1.4rem;font-weight:700;color:#fff;margin:0 0 8px}',
      '.qs-subtitle{color:#94a3b8;font-size:0.95rem;margin:0}',
      '.qs-input-wrap{display:flex;gap:8px;margin-top:20px}',
      '.qs-url-input{flex:1;background:#1e293b;border:1px solid rgba(255,255,255,0.1);color:#fff;padding:12px 16px;border-radius:10px;font-size:1rem;outline:none;transition:border-color .2s}',
      '.qs-url-input:focus{border-color:#1e6fff}',
      '.qs-url-input::placeholder{color:#64748b}',
      '.qs-submit-btn,.qs-cta-btn{background:linear-gradient(135deg,#1e6fff,#00b4ff);color:#fff;border:none;padding:12px 24px;border-radius:10px;font-weight:600;cursor:pointer;font-size:1rem;transition:opacity .2s}',
      '.qs-submit-btn:hover,.qs-cta-btn:hover{opacity:0.9}',
      '.qs-submit-btn:disabled{opacity:0.5;cursor:not-allowed}',
      '.qs-spinner{width:40px;height:40px;border:3px solid rgba(255,255,255,0.15);border-top-color:#1e6fff;border-radius:50%;animation:qsSpin 1s linear infinite;margin:0 auto 16px}',
      '@keyframes qsSpin{to{transform:rotate(360deg)}}',
      '.qs-progress-bar{height:4px;background:rgba(255,255,255,0.1);border-radius:2px;margin-top:20px;overflow:hidden}',
      '.qs-progress-fill{height:100%;background:linear-gradient(90deg,#1e6fff,#00b4ff);width:0%;transition:width 0.5s ease}',
      '.qs-loading-text{min-height:1.3em}',
      '.qs-error-msg{color:#ef4444;font-size:0.9rem;margin-top:12px}',

      /* Results common */
      '.qs-result-title{font-size:1.3rem;font-weight:700;color:#fff;margin:0 0 12px}',
      '.qs-score-badge{display:inline-block;background:linear-gradient(135deg,#1e6fff,#00b4ff);color:#fff;font-size:1.6rem;font-weight:800;padding:8px 20px;border-radius:14px;margin-bottom:16px}',

      /* Criteria */
      '.qs-criteria-list{display:flex;flex-direction:column;gap:8px}',
      '.qs-criterion{display:flex;gap:12px;padding:16px;background:rgba(255,255,255,0.03);border-radius:12px}',
      '.qs-criterion-score{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.1rem;color:#fff;flex-shrink:0}',
      '.qs-criterion-body{flex:1;min-width:0}',
      '.qs-criterion-name{font-weight:600;font-size:0.95rem;margin-bottom:4px}',
      '.qs-criterion-summary{color:#94a3b8;font-size:0.85rem;margin-bottom:4px}',
      '.qs-criterion-issue{color:#f59e0b;font-size:0.85rem}',

      /* First screen */
      '.qs-big-score{display:flex;align-items:baseline;gap:4px;margin-bottom:16px}',
      '.qs-big-number{font-size:3rem;font-weight:800;color:#fff}',
      '.qs-big-max{font-size:1.4rem;color:#64748b;font-weight:600}',
      '.qs-verdict-badge{font-size:0.85rem;font-weight:700;padding:4px 12px;border-radius:8px;color:#fff;margin-left:12px;align-self:center}',
      '.qs-details{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}',
      '.qs-detail-item{padding:10px 14px;background:rgba(255,255,255,0.03);border-radius:10px;font-size:0.9rem;color:#cbd5e1}',
      '.qs-detail-item strong{color:#fff}',
      '.qs-top-fix{padding:12px 16px;background:rgba(30,111,255,0.1);border-radius:12px;color:#60a5fa;font-size:0.9rem;margin-bottom:16px}',

      /* SEO metrics */
      '.qs-metrics-list{display:flex;flex-direction:column;gap:10px}',
      '.qs-metric{padding:14px;background:rgba(255,255,255,0.03);border-radius:12px}',
      '.qs-metric-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}',
      '.qs-metric-name{font-weight:600;font-size:0.95rem}',
      '.qs-metric-score{padding:2px 10px;border-radius:8px;font-weight:700;font-size:0.85rem;color:#fff}',
      '.qs-metric-current{color:#94a3b8;font-size:0.85rem;margin-bottom:4px}',
      '.qs-metric-current code{background:rgba(255,255,255,0.08);padding:1px 6px;border-radius:4px;font-size:0.82rem}',
      '.qs-metric-issue{color:#f59e0b;font-size:0.85rem;margin-bottom:2px}',
      '.qs-metric-fix{color:#00d084;font-size:0.85rem}',

      /* Problems */
      '.qs-problems-list{display:flex;flex-direction:column;gap:8px}',
      '.qs-problem{display:flex;gap:12px;padding:14px;background:rgba(255,255,255,0.03);border-radius:12px}',
      '.qs-severity{padding:4px 10px;border-radius:8px;font-weight:700;font-size:0.8rem;color:#fff;white-space:nowrap;align-self:flex-start}',
      '.qs-problem-body{flex:1;min-width:0}',
      '.qs-problem-name{font-weight:600;font-size:0.95rem;margin-bottom:4px}',
      '.qs-problem-issue{color:#94a3b8;font-size:0.85rem;margin-bottom:2px}',
      '.qs-problem-fix{color:#60a5fa;font-size:0.85rem}',

      /* Locked / blurred */
      '.qs-locked{position:relative;margin-top:16px}',
      '.qs-locked-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:8px;background:rgba(17,24,39,0.7);border-radius:12px;z-index:2;color:#94a3b8;font-weight:600;font-size:0.95rem;text-align:center;padding:12px}',
      '.qs-blurred{filter:blur(6px);pointer-events:none;user-select:none}',
      '.qs-remaining-tags{display:flex;flex-wrap:wrap;gap:6px;padding:12px}',
      '.qs-remaining-tag{background:rgba(255,255,255,0.06);color:#64748b;padding:4px 10px;border-radius:6px;font-size:0.8rem}',

      /* CTA */
      '.qs-cta{text-align:center;margin-top:24px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.08)}',
      '.qs-cta-text{color:#94a3b8;font-size:0.9rem;margin:0 0 14px}',
      '.qs-cta-btn{padding:14px 32px;font-size:1.05rem;border-radius:12px}',
      '.qs-cta-note{color:#64748b;font-size:0.8rem;margin:10px 0 0}',

      /* Mobile */
      '@media(max-width:640px){.qs-modal{padding:20px;border-radius:16px}.qs-input-wrap{flex-direction:column}.qs-submit-btn{width:100%}.qs-big-number{font-size:2.2rem}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  // --- Modal State ---

  var currentOverlay = null;
  var currentScanType = null;
  var loadingTimers = [];

  function destroyModal() {
    if (!currentOverlay) return;
    currentOverlay.classList.remove('qs-visible');
    var ov = currentOverlay;
    setTimeout(function () {
      if (ov.parentNode) ov.parentNode.removeChild(ov);
    }, 260);
    currentOverlay = null;
    currentScanType = null;
    clearLoadingTimers();
    document.body.style.overflow = '';
  }

  function clearLoadingTimers() {
    for (var i = 0; i < loadingTimers.length; i++) {
      clearTimeout(loadingTimers[i]);
    }
    loadingTimers = [];
  }

  // --- Build Modal ---

  function openModal(scanType) {
    injectCSS();

    var config = SCAN_CONFIG[scanType];
    if (!config) return;

    if (currentOverlay) destroyModal();

    currentScanType = scanType;
    document.body.style.overflow = 'hidden';

    // Overlay
    var overlay = el('div', 'qs-overlay');
    var modal = el('div', 'qs-modal');

    // Close button
    var closeBtn = el('button', 'qs-close', '&times;');
    closeBtn.setAttribute('aria-label', 'Закрыть');
    closeBtn.addEventListener('click', destroyModal);
    modal.appendChild(closeBtn);

    // Step 1: Input
    var stepInput = el('div', 'qs-step');
    stepInput.id = 'qsInput';
    stepInput.innerHTML = [
      '<h3 class="qs-title">' + esc(config.title) + '</h3>',
      '<p class="qs-subtitle">Введите URL сайта для бесплатного экспресс-анализа</p>',
      '<div class="qs-input-wrap">',
      '  <input type="url" class="qs-url-input" placeholder="yoursite.com">',
      '  <button class="qs-submit-btn">Анализировать \u2192</button>',
      '</div>',
      '<div class="qs-error-msg qs-hidden" id="qsInputError"></div>'
    ].join('');
    modal.appendChild(stepInput);

    // Step 2: Loading
    var stepLoading = el('div', 'qs-step qs-hidden');
    stepLoading.id = 'qsLoading';
    stepLoading.innerHTML = [
      '<div class="qs-spinner"></div>',
      '<h3 class="qs-title" style="text-align:center">Анализируем сайт...</h3>',
      '<p class="qs-subtitle qs-loading-text" style="text-align:center">Читаем контент страницы...</p>',
      '<div class="qs-progress-bar"><div class="qs-progress-fill"></div></div>'
    ].join('');
    modal.appendChild(stepLoading);

    // Step 3: Results (empty, filled later)
    var stepResults = el('div', 'qs-step qs-hidden');
    stepResults.id = 'qsResults';
    modal.appendChild(stepResults);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    currentOverlay = overlay;

    // Fade in
    requestAnimationFrame(function () {
      overlay.classList.add('qs-visible');
    });

    // Close on overlay click
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) destroyModal();
    });

    // Focus input
    var urlInput = stepInput.querySelector('.qs-url-input');
    setTimeout(function () { urlInput.focus(); }, 100);

    // Submit
    var submitBtn = stepInput.querySelector('.qs-submit-btn');
    var errorEl = stepInput.querySelector('#qsInputError');

    function doSubmit() {
      var rawUrl = urlInput.value;
      var url = normalizeUrl(rawUrl);
      if (!url || url.length < 10) {
        errorEl.textContent = 'Введите корректный URL сайта';
        errorEl.classList.remove('qs-hidden');
        urlInput.focus();
        return;
      }
      errorEl.classList.add('qs-hidden');
      submitBtn.disabled = true;
      startScan(url, scanType, stepInput, stepLoading, stepResults);
    }

    submitBtn.addEventListener('click', doSubmit);
    urlInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') doSubmit();
    });
  }

  // --- Loading Animation ---

  function startLoadingAnimation(stepLoading) {
    var textEl = stepLoading.querySelector('.qs-loading-text');
    var fillEl = stepLoading.querySelector('.qs-progress-fill');

    // Progress bar: 0% -> 90% over 30s
    var startTime = Date.now();
    var progressInterval = setInterval(function () {
      var elapsed = Date.now() - startTime;
      var pct = Math.min(90, (elapsed / 30000) * 90);
      fillEl.style.width = pct + '%';
      if (pct >= 90) clearInterval(progressInterval);
    }, 200);
    loadingTimers.push(progressInterval);

    // Cycle messages
    for (var i = 0; i < LOADING_MESSAGES.length; i++) {
      (function (msg) {
        var tid = setTimeout(function () {
          if (textEl) textEl.textContent = msg.text;
        }, msg.at);
        loadingTimers.push(tid);
      })(LOADING_MESSAGES[i]);
    }

    return fillEl;
  }

  // --- API Call & Render ---

  function startScan(url, scanType, stepInput, stepLoading, stepResults) {
    // Switch to loading step
    stepInput.classList.add('qs-hidden');
    stepLoading.classList.remove('qs-hidden');

    var fillEl = startLoadingAnimation(stepLoading);

    var xhr = new XMLHttpRequest();
    xhr.open('POST', API_ENDPOINT, true);
    xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');

    xhr.onload = function () {
      clearLoadingTimers();
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var data = JSON.parse(xhr.responseText);
          fillEl.style.width = '100%';
          setTimeout(function () {
            stepLoading.classList.add('qs-hidden');
            renderResults(data, scanType, stepResults);
            stepResults.classList.remove('qs-hidden');
          }, 400);
        } catch (e) {
          showError(stepLoading, stepInput, 'Ошибка обработки ответа. Попробуйте ещё раз.');
        }
      } else {
        var msg = 'Ошибка сервера (' + xhr.status + '). Попробуйте позже.';
        try {
          var errData = JSON.parse(xhr.responseText);
          if (errData.error) msg = errData.error;
        } catch (e) { /* ignore */ }
        showError(stepLoading, stepInput, msg);
      }
    };

    xhr.onerror = function () {
      clearLoadingTimers();
      showError(stepLoading, stepInput, 'Ошибка сети. Проверьте подключение и попробуйте снова.');
    };

    xhr.send(JSON.stringify({ url: url, type: scanType }));
  }

  function showError(stepLoading, stepInput, message) {
    stepLoading.classList.add('qs-hidden');
    stepInput.classList.remove('qs-hidden');
    var errorEl = stepInput.querySelector('#qsInputError');
    var submitBtn = stepInput.querySelector('.qs-submit-btn');
    errorEl.textContent = message;
    errorEl.classList.remove('qs-hidden');
    submitBtn.disabled = false;
  }

  // --- Results Rendering ---

  function renderResults(data, scanType, container) {
    var config = SCAN_CONFIG[scanType];
    var html = '';

    switch (config.resultType) {
      case 'criteria':
        html = renderCriteria(data);
        break;
      case 'firstscreen':
        html = renderFirstscreen(data);
        break;
      case 'seo':
        html = renderSeo(data);
        break;
      case 'problems':
        html = renderProblems(data);
        break;
      default:
        html = '<p class="qs-subtitle">Результат получен</p>';
    }

    // Append CTA
    html += renderCTA(scanType, config);

    container.innerHTML = html;

    // Bind CTA button to forms.js modal
    var ctaBtn = container.querySelector('.qs-cta-btn');
    if (ctaBtn) {
      ctaBtn.addEventListener('click', function () {
        destroyModal();
        // Trigger forms.js modal via click simulation on a temp element
        var tmpBtn = document.createElement('button');
        tmpBtn.setAttribute('data-tf-form', ctaBtn.getAttribute('data-tf-form'));
        tmpBtn.setAttribute('data-tf-service', ctaBtn.getAttribute('data-tf-service'));
        tmpBtn.setAttribute('data-tf-price', ctaBtn.getAttribute('data-tf-price'));
        tmpBtn.style.display = 'none';
        document.body.appendChild(tmpBtn);
        tmpBtn.click();
        setTimeout(function () {
          if (tmpBtn.parentNode) tmpBtn.parentNode.removeChild(tmpBtn);
        }, 500);
      });
    }
  }

  function renderCriteria(data) {
    var criteria = data.criteria || [];
    var parts = [];

    parts.push('<h3 class="qs-result-title">' + esc(data.one_liner || 'Результат анализа') + '</h3>');
    parts.push('<div class="qs-score-badge">' + esc(String(data.total_score || 0)) + '/' + esc(String(data.max_score || 100)) + '</div>');
    parts.push('<div class="qs-criteria-list">');

    for (var i = 0; i < criteria.length; i++) {
      var c = criteria[i];
      var color = scoreColor(c.score);
      parts.push('<div class="qs-criterion">');
      parts.push('  <div class="qs-criterion-score" style="background:' + color + '">' + esc(String(c.score)) + '</div>');
      parts.push('  <div class="qs-criterion-body">');
      parts.push('    <div class="qs-criterion-name">' + esc(c.name) + '</div>');
      parts.push('    <div class="qs-criterion-summary">' + esc(c.summary) + '</div>');
      if (c.key_issue) {
        parts.push('    <div class="qs-criterion-issue">\u26A0 ' + esc(c.key_issue) + '</div>');
      }
      parts.push('  </div>');
      parts.push('</div>');
    }

    parts.push('</div>');

    // Locked section
    var remaining = data.remaining_count || 0;
    if (remaining > 0) {
      parts.push('<div class="qs-locked">');
      parts.push('  <div class="qs-locked-overlay"><i class="fa-solid fa-lock"></i> <span>Ещё ' + esc(String(remaining)) + ' критериев в полном аудите</span></div>');
      for (var j = 0; j < Math.min(remaining, 3); j++) {
        parts.push('  <div class="qs-criterion qs-blurred">');
        parts.push('    <div class="qs-criterion-score" style="background:#475569">?</div>');
        parts.push('    <div class="qs-criterion-body">');
        parts.push('      <div class="qs-criterion-name">\u2588\u2588\u2588\u2588 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588</div>');
        parts.push('      <div class="qs-criterion-summary">\u2588\u2588\u2588\u2588 \u2588\u2588\u2588\u2588 \u2588\u2588\u2588\u2588\u2588\u2588 \u2588\u2588\u2588 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588 \u2588\u2588\u2588\u2588\u2588\u2588</div>');
        parts.push('    </div>');
        parts.push('  </div>');
      }
      parts.push('</div>');
    }

    return parts.join('\n');
  }

  function renderFirstscreen(data) {
    var parts = [];
    var color = scoreColor(data.score);

    parts.push('<h3 class="qs-result-title">' + esc(data.one_liner || 'Результат анализа') + '</h3>');
    parts.push('<div class="qs-big-score">');
    parts.push('  <span class="qs-big-number">' + esc(String(data.score || 0)) + '</span>');
    parts.push('  <span class="qs-big-max">/' + esc(String(data.max_score || 10)) + '</span>');
    if (data.verdict) {
      parts.push('  <span class="qs-verdict-badge" style="background:' + color + '">' + esc(data.verdict) + '</span>');
    }
    parts.push('</div>');

    parts.push('<div class="qs-details">');
    if (data.h1_analysis) {
      parts.push('  <div class="qs-detail-item"><strong>H1:</strong> ' + esc(data.h1_analysis) + '</div>');
    }
    if (data.cta_analysis) {
      parts.push('  <div class="qs-detail-item"><strong>CTA:</strong> ' + esc(data.cta_analysis) + '</div>');
    }
    if (data.hierarchy_note) {
      parts.push('  <div class="qs-detail-item"><strong>Иерархия:</strong> ' + esc(data.hierarchy_note) + '</div>');
    }
    parts.push('</div>');

    if (data.top_fix) {
      parts.push('<div class="qs-top-fix"><i class="fa-solid fa-wrench"></i> ' + esc(data.top_fix) + '</div>');
    }

    parts.push('<div class="qs-locked">');
    parts.push('  <div class="qs-locked-overlay"><i class="fa-solid fa-lock"></i> Полный разбор: типографика, цвета, mobile, скорость</div>');
    parts.push('  <div class="qs-detail-item qs-blurred" style="margin-top:0">\u2588\u2588\u2588\u2588 \u2588\u2588\u2588\u2588\u2588 \u2588\u2588\u2588\u2588\u2588\u2588\u2588</div>');
    parts.push('  <div class="qs-detail-item qs-blurred">\u2588\u2588\u2588\u2588 \u2588\u2588\u2588\u2588\u2588\u2588 \u2588\u2588\u2588\u2588</div>');
    parts.push('</div>');

    return parts.join('\n');
  }

  function renderSeo(data) {
    var metrics = data.metrics || [];
    var parts = [];

    parts.push('<h3 class="qs-result-title">' + esc(data.one_liner || 'Результат SEO-анализа') + '</h3>');
    parts.push('<div class="qs-score-badge">' + esc(String(data.total_score || 0)) + '/' + esc(String(data.max_score || 50)) + '</div>');
    parts.push('<div class="qs-metrics-list">');

    for (var i = 0; i < metrics.length; i++) {
      var m = metrics[i];
      var color = scoreColor(m.score);
      parts.push('<div class="qs-metric">');
      parts.push('  <div class="qs-metric-header">');
      parts.push('    <span class="qs-metric-name">' + esc(m.name) + '</span>');
      parts.push('    <span class="qs-metric-score" style="background:' + color + '">' + esc(String(m.score)) + '/5</span>');
      parts.push('  </div>');
      if (m.current_value) {
        parts.push('  <div class="qs-metric-current">Текущее: <code>' + esc(m.current_value) + '</code></div>');
      }
      if (m.issue) {
        parts.push('  <div class="qs-metric-issue">\u26A0 ' + esc(m.issue) + '</div>');
      }
      if (m.fix) {
        parts.push('  <div class="qs-metric-fix">\u2713 ' + esc(m.fix) + '</div>');
      }
      parts.push('</div>');
    }

    parts.push('</div>');

    // Locked
    parts.push('<div class="qs-locked">');
    parts.push('  <div class="qs-locked-overlay"><i class="fa-solid fa-lock"></i> Ещё 8 SEO-проверок в полном анализе</div>');
    var remaining = data.remaining_checks || [];
    if (remaining.length > 0) {
      parts.push('  <div class="qs-remaining-tags qs-blurred">');
      for (var j = 0; j < remaining.length; j++) {
        parts.push('    <span class="qs-remaining-tag">' + esc(remaining[j]) + '</span>');
      }
      parts.push('  </div>');
    } else {
      parts.push('  <div class="qs-remaining-tags qs-blurred">');
      var placeholders = ['Keyword Density', 'Readability', 'Internal Links', 'Schema Markup', 'Page Speed', 'Mobile UX', 'Alt Tags', 'Canonical'];
      for (var k = 0; k < placeholders.length; k++) {
        parts.push('    <span class="qs-remaining-tag">' + placeholders[k] + '</span>');
      }
      parts.push('  </div>');
    }
    parts.push('</div>');

    return parts.join('\n');
  }

  function renderProblems(data) {
    var problems = data.problems || [];
    var parts = [];

    parts.push('<h3 class="qs-result-title">' + esc(data.one_liner || 'Результат анализа') + '</h3>');
    parts.push('<p class="qs-subtitle">Найдено ' + esc(String(data.total_found || problems.length)) + ' из ~' + esc(String(data.estimated_total || '?')) + ' проблем</p>');
    parts.push('<div class="qs-problems-list">');

    for (var i = 0; i < problems.length; i++) {
      var p = problems[i];
      var sColor = severityColor(p.severity);
      parts.push('<div class="qs-problem">');
      parts.push('  <span class="qs-severity" style="background:' + sColor + '">' + esc(p.severity) + '</span>');
      parts.push('  <div class="qs-problem-body">');
      parts.push('    <div class="qs-problem-name">' + esc(p.name) + '</div>');
      if (p.issue) {
        parts.push('    <div class="qs-problem-issue">' + esc(p.issue) + '</div>');
      }
      if (p.fix) {
        parts.push('    <div class="qs-problem-fix">\u2192 ' + esc(p.fix) + '</div>');
      }
      parts.push('  </div>');
      parts.push('</div>');
    }

    parts.push('</div>');

    // Locked
    var remaining = data.remaining || 0;
    if (remaining > 0) {
      parts.push('<div class="qs-locked">');
      parts.push('  <div class="qs-locked-overlay"><i class="fa-solid fa-lock"></i> ~' + esc(String(remaining)) + ' проблем в полном анализе</div>');
      for (var j = 0; j < Math.min(3, remaining); j++) {
        parts.push('  <div class="qs-problem qs-blurred">');
        parts.push('    <span class="qs-severity" style="background:#475569">?</span>');
        parts.push('    <div class="qs-problem-body">');
        parts.push('      <div class="qs-problem-name">\u2588\u2588\u2588\u2588 \u2588\u2588\u2588\u2588\u2588\u2588\u2588</div>');
        parts.push('      <div class="qs-problem-issue">\u2588\u2588\u2588\u2588 \u2588\u2588\u2588 \u2588\u2588\u2588\u2588\u2588\u2588 \u2588\u2588\u2588\u2588\u2588</div>');
        parts.push('    </div>');
        parts.push('  </div>');
      }
      parts.push('</div>');
    }

    return parts.join('\n');
  }

  function renderCTA(scanType, config) {
    var parts = [];
    parts.push('<div class="qs-cta">');
    parts.push('  <p class="qs-cta-text">Это экспресс-анализ. Полная версия включает детальные рекомендации и план действий.</p>');
    parts.push('  <button class="qs-cta-btn" data-tf-form="express" data-tf-service="' + esc(scanType) + '" data-tf-price="' + esc(config.price) + '">');
    parts.push('    ' + esc(config.cta) + ' \u2192');
    parts.push('  </button>');
    parts.push('  <p class="qs-cta-note">Результат за 24 часа. Гарантия возврата.</p>');
    parts.push('</div>');
    return parts.join('\n');
  }

  // --- Keyboard handler ---

  function onKeydown(e) {
    if (e.key === 'Escape' && currentOverlay) {
      destroyModal();
    }
  }

  // --- Init ---

  function init() {
    document.addEventListener('keydown', onKeydown);
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-quick-scan]');
      if (!btn) return;
      e.preventDefault();
      var scanType = btn.getAttribute('data-quick-scan');
      if (SCAN_CONFIG[scanType]) {
        openModal(scanType);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();