/**
 * TriggerFlow - Modal Forms System
 * Lead capture via modal forms with webhook submission
 * Double validation (client + server), GDPR, anti-spam
 */
(function () {
  'use strict';

  var WEBHOOK_URL = 'https://nataswencia.app.n8n.cloud/webhook/tf-website-lead';

  // Form field configurations per type
  var FORM_CONFIGS = {
    express: {
      title: 'Оставить заявку',
      fields: [
        { name: 'name', label: 'Имя', type: 'text', placeholder: 'Ваше имя', required: true },
        { name: 'email', label: 'Email', type: 'email', placeholder: 'email@example.com', required: true },
        { name: 'website_url', label: 'URL сайта', type: 'url', placeholder: 'https://example.com', required: true },
        { name: 'phone', label: 'Телефон', type: 'tel', placeholder: '+33 6 12 34 56 78', required: false }
      ],
      submitText: function (price) { return price ? 'Заказать за ' + price + '\u20ac' : 'Отправить заявку'; }
    },
    consult: {
      title: 'Обсудить проект',
      fields: [
        { name: 'name', label: 'Имя', type: 'text', placeholder: 'Ваше имя', required: true },
        { name: 'email', label: 'Email', type: 'email', placeholder: 'email@example.com', required: true },
        { name: 'website_url', label: 'URL сайта', type: 'url', placeholder: 'https://example.com', required: true },
        { name: 'phone', label: 'Телефон', type: 'tel', placeholder: '+33 6 12 34 56 78', required: false },
        { name: 'company', label: 'Компания', type: 'company', placeholder: 'Название компании', required: false },
        { name: 'message', label: 'Сообщение', type: 'textarea', placeholder: 'Опишите задачу (минимум 10 символов)...', required: false }
      ],
      submitText: function () { return 'Обсудить проект'; }
    },
    subscription: {
      title: 'Подобрать тариф',
      fields: [
        { name: 'name', label: 'Имя', type: 'text', placeholder: 'Ваше имя', required: true },
        { name: 'email', label: 'Email', type: 'email', placeholder: 'email@example.com', required: true },
        { name: 'website_url', label: 'URL сайта', type: 'url', placeholder: 'https://example.com', required: true },
        { name: 'phone', label: 'Телефон', type: 'tel', placeholder: '+33 6 12 34 56 78', required: false },
        { name: 'selected_plan', label: 'Тариф', type: 'select', required: true, options: [
          { value: '', label: 'Выберите тариф' },
          { value: 'Базовый 79\u20ac/мес', label: 'Базовый - 79\u20ac/мес' },
          { value: 'Приоритетный 199\u20ac/мес', label: 'Приоритетный - 199\u20ac/мес' },
          { value: 'Growth сопровождение от 990\u20ac/мес', label: 'Growth сопровождение - от 990\u20ac/мес' }
        ]}
      ],
      submitText: function () { return 'Подобрать тариф'; }
    }
  };

  // Validation patterns
  var VALIDATORS = {
    email: function (v) {
      return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(v);
    },
    url: function (v) {
      return /^https?:\/\/[a-zA-Z0-9\-]+(\.[a-zA-Z0-9\-]+)+/.test(v);
    },
    tel: function (v) {
      if (!v) return true;
      var digits = v.replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 15;
    },
    text: function (v) {
      var s = v.trim();
      return s.length >= 2 && s.length <= 50 && /^[\p{L}\s\-'.]+$/u.test(s);
    },
    textarea: function (v) {
      var s = v.trim();
      if (!s) return true;
      return s.length >= 10 && s.length <= 1000;
    },
    company: function (v) {
      var s = v.trim();
      if (!s) return true;
      return s.length <= 100;
    },
    select: function (v) { return v.length > 0; },
    checkbox: function (v, el) { return el && el.checked; }
  };

  var ERROR_MESSAGES = {
    email: 'Введите корректный email',
    url: 'Введите URL (https://example.com)',
    tel: 'Введите от 10 до 15 цифр',
    text: 'От 2 до 50 символов, только буквы',
    textarea: 'От 10 до 1000 символов',
    company: 'Максимум 100 символов',
    select: 'Выберите вариант',
    checkbox: 'Необходимо дать согласие'
  };

  // Phone formatting
  function formatPhone(value) {
    var digits = value.replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length <= 1) return '+' + digits;
    if (digits.length <= 4) return '+' + digits.substring(0, 1) + ' ' + digits.substring(1);
    if (digits.length <= 6) return '+' + digits.substring(0, 1) + ' ' + digits.substring(1, 4) + ' ' + digits.substring(4);
    if (digits.length <= 8) return '+' + digits.substring(0, 1) + ' ' + digits.substring(1, 4) + ' ' + digits.substring(4, 6) + ' ' + digits.substring(6);
    if (digits.length <= 10) return '+' + digits.substring(0, 1) + ' ' + digits.substring(1, 4) + ' ' + digits.substring(4, 6) + ' ' + digits.substring(6, 8) + ' ' + digits.substring(8);
    return '+' + digits.substring(0, 1) + ' ' + digits.substring(1, 4) + ' ' + digits.substring(4, 6) + ' ' + digits.substring(6, 8) + ' ' + digits.substring(8, 10) + (digits.length > 10 ? ' ' + digits.substring(10, 15) : '');
  }

  function normalizePhone(value) {
    var digits = value.replace(/\D/g, '');
    return digits ? '+' + digits : '';
  }

  // Anti-spam
  var FORM_OPEN_TIME = 0;
  var MIN_FILL_TIME_MS = 3000;

  function checkRateLimit() {
    try {
      var data = JSON.parse(localStorage.getItem('tf_submits') || '[]');
      var now = Date.now();
      data = data.filter(function (ts) { return now - ts < 600000; });
      localStorage.setItem('tf_submits', JSON.stringify(data));
      return data.length < 5;
    } catch (e) { return true; }
  }

  function recordSubmit() {
    try {
      var data = JSON.parse(localStorage.getItem('tf_submits') || '[]');
      data.push(Date.now());
      localStorage.setItem('tf_submits', JSON.stringify(data));
    } catch (e) { /* ignore */ }
  }

  // State
  var overlay = null;
  var submitting = false;

  // Build modal HTML
  function createModal() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'tf-modal-overlay';
    overlay.innerHTML =
      '<div class="tf-modal">' +
        '<button class="tf-modal__close" type="button" aria-label="Закрыть">&times;</button>' +
        '<div class="tf-modal__header">' +
          '<h3 class="tf-modal__title"></h3>' +
          '<p class="tf-modal__subtitle"></p>' +
          '<div class="tf-modal__price"></div>' +
        '</div>' +
        '<form class="tf-modal__form" novalidate>' +
          '<div class="tf-modal__fields"></div>' +
          '<div class="tf-modal__honeypot">' +
            '<input type="text" name="website" tabindex="-1" autocomplete="off">' +
          '</div>' +
          '<div class="tf-modal__gdpr form-group">' +
            '<label class="form-check">' +
              '<input type="checkbox" name="gdpr_consent" data-validate="checkbox" data-required="true">' +
              '<span class="form-check__label">Я соглашаюсь на обработку персональных данных</span>' +
            '</label>' +
            '<span class="form-error">' + ERROR_MESSAGES.checkbox + '</span>' +
          '</div>' +
          '<button type="submit" class="btn btn--primary btn--lg" style="width:100%"></button>' +
        '</form>' +
        '<div class="tf-modal__loading" style="display:none">' +
          '<div class="tf-modal__spinner"></div>' +
          '<p>Отправляем заявку...</p>' +
        '</div>' +
        '<div class="tf-modal__success" style="display:none">' +
          '<div style="font-size:3rem">&#10003;</div>' +
          '<h3>Заявка отправлена!</h3>' +
          '<p>Мы свяжемся с вами в ближайшее время</p>' +
        '</div>' +
        '<div class="tf-modal__error" style="display:none">' +
          '<div style="font-size:3rem">&#10007;</div>' +
          '<h3>Ошибка отправки</h3>' +
          '<p>Попробуйте ещё раз или напишите нам в Telegram</p>' +
          '<button type="button" class="btn btn--outline" style="margin-top:1rem" onclick="TFModal.retry()">Попробовать снова</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
    overlay.querySelector('.tf-modal__close').addEventListener('click', closeModal);
    overlay.querySelector('.tf-modal__form').addEventListener('submit', handleSubmit);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('active')) closeModal();
    });
  }

  function openModal(config) {
    createModal();
    if (submitting) return;

    var formType = config.form;
    var formConfig = FORM_CONFIGS[formType];
    if (!formConfig) return;

    var service = config.service || '';
    var price = config.price || '';
    var plan = config.plan || '';
    var btnText = config.btnText || '';

    // Set header
    overlay.querySelector('.tf-modal__title').textContent = formConfig.title;
    overlay.querySelector('.tf-modal__subtitle').textContent = service;
    overlay.querySelector('.tf-modal__price').textContent = price ? price + '\u20ac' : '';
    overlay.querySelector('.tf-modal__price').style.display = price ? '' : 'none';

    // Build fields
    var fieldsContainer = overlay.querySelector('.tf-modal__fields');
    fieldsContainer.innerHTML = '';

    formConfig.fields.forEach(function (field) {
      var group = document.createElement('div');
      group.className = 'form-group';

      var label = document.createElement('label');
      label.className = 'form-label';
      label.textContent = field.label + (field.required ? ' *' : '');
      label.setAttribute('for', 'tf-' + field.name);
      group.appendChild(label);

      var input;
      if (field.type === 'textarea') {
        input = document.createElement('textarea');
        input.className = 'form-textarea';
        input.rows = 3;
      } else if (field.type === 'select') {
        input = document.createElement('select');
        input.className = 'form-select';
        field.options.forEach(function (opt) {
          var option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.label;
          input.appendChild(option);
        });
        if (plan && field.name === 'selected_plan') {
          input.value = plan;
        }
      } else {
        input = document.createElement('input');
        input.className = 'form-input';
        input.type = (field.type === 'url' || field.type === 'company') ? 'text' : field.type;
      }

      input.id = 'tf-' + field.name;
      input.name = field.name;
      if (field.placeholder) input.placeholder = field.placeholder;
      if (field.required) input.setAttribute('data-required', 'true');
      input.setAttribute('data-validate', field.type);

      group.appendChild(input);

      var error = document.createElement('span');
      error.className = 'form-error';
      error.textContent = ERROR_MESSAGES[field.type] || 'Обязательное поле';
      group.appendChild(error);

      fieldsContainer.appendChild(group);
    });

    // Submit button text
    overlay.querySelector('.tf-modal__form button[type="submit"]').textContent =
      formConfig.submitText(price);

    // Store meta on form
    var form = overlay.querySelector('.tf-modal__form');
    form.setAttribute('data-service', service);
    form.setAttribute('data-price', price);
    form.setAttribute('data-form-type', formType);
    form.setAttribute('data-plan', plan);
    form.setAttribute('data-btn-text', btnText);

    // Reset states
    showSection('form');
    resetGdpr();

    // Record open time for anti-spam
    FORM_OPEN_TIME = Date.now();

    // Bind real-time validation
    bindRealtimeValidation(fieldsContainer);

    // Show
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Focus first input
    setTimeout(function () {
      var first = fieldsContainer.querySelector('input, select, textarea');
      if (first) first.focus();
    }, 350);
  }

  function resetGdpr() {
    var cb = overlay.querySelector('input[name="gdpr_consent"]');
    if (cb) {
      cb.checked = false;
      cb.classList.remove('error', 'valid');
    }
    var err = overlay.querySelector('.tf-modal__gdpr .form-error');
    if (err) err.classList.remove('visible');
  }

  function bindRealtimeValidation(container) {
    container.querySelectorAll('[data-validate]').forEach(function (input) {
      input.addEventListener('blur', function () {
        validateField(this);
      });
      input.addEventListener('input', function () {
        // Phone auto-format
        if (this.getAttribute('data-validate') === 'tel') {
          var pos = this.selectionStart;
          var oldLen = this.value.length;
          this.value = formatPhone(this.value);
          var newLen = this.value.length;
          this.selectionStart = this.selectionEnd = pos + (newLen - oldLen);
        }
        // Clear error if now valid
        clearErrorIfValid(this);
      });
    });
    // GDPR checkbox
    var gdpr = overlay.querySelector('input[name="gdpr_consent"]');
    if (gdpr) {
      gdpr.addEventListener('change', function () {
        validateField(this);
      });
    }
  }

  function clearErrorIfValid(input) {
    var type = input.getAttribute('data-validate');
    var required = input.getAttribute('data-required') === 'true';
    var value = input.value.trim();
    if (value && VALIDATORS[type] && VALIDATORS[type](value, input)) {
      input.classList.remove('error');
      input.classList.add('valid');
      var errEl = input.parentNode.querySelector('.form-error');
      if (errEl) errEl.classList.remove('visible');
    } else if (!required && !value) {
      input.classList.remove('error', 'valid');
      var errEl = input.parentNode.querySelector('.form-error');
      if (errEl) errEl.classList.remove('visible');
    }
  }

  function closeModal() {
    if (!overlay) return;
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    submitting = false;
  }

  function showSection(section) {
    var form = overlay.querySelector('.tf-modal__form');
    var loading = overlay.querySelector('.tf-modal__loading');
    var success = overlay.querySelector('.tf-modal__success');
    var error = overlay.querySelector('.tf-modal__error');
    var header = overlay.querySelector('.tf-modal__header');
    var closeBtn = overlay.querySelector('.tf-modal__close');

    form.style.display = section === 'form' ? '' : 'none';
    loading.style.display = section === 'loading' ? '' : 'none';
    success.style.display = section === 'success' ? '' : 'none';
    error.style.display = section === 'error' ? '' : 'none';
    header.style.display = (section === 'form' || section === 'loading') ? '' : 'none';
    closeBtn.style.display = section === 'loading' ? 'none' : '';
  }

  // Single field validation
  function validateField(input) {
    var type = input.getAttribute('data-validate');
    var required = input.getAttribute('data-required') === 'true';
    var isCheckbox = input.type === 'checkbox';
    var value = isCheckbox ? '' : input.value.trim();
    var container = input.closest('.form-group') || input.closest('.tf-modal__gdpr');
    var errorEl = container ? container.querySelector('.form-error') : null;

    input.classList.remove('error', 'valid');
    if (errorEl) errorEl.classList.remove('visible');

    if (isCheckbox) {
      if (required && !input.checked) {
        input.classList.add('error');
        if (errorEl) { errorEl.textContent = ERROR_MESSAGES.checkbox; errorEl.classList.add('visible'); }
        return false;
      }
      if (input.checked) input.classList.add('valid');
      return true;
    }

    if (required && !value) {
      input.classList.add('error');
      if (errorEl) { errorEl.textContent = 'Обязательное поле'; errorEl.classList.add('visible'); }
      return false;
    }

    if (value && VALIDATORS[type] && !VALIDATORS[type](value, input)) {
      input.classList.add('error');
      if (errorEl) { errorEl.textContent = ERROR_MESSAGES[type] || 'Некорректное значение'; errorEl.classList.add('visible'); }
      return false;
    }

    if (value) input.classList.add('valid');
    return true;
  }

  // Full form validation
  function validateForm(form) {
    var valid = true;
    form.querySelectorAll('[data-validate]').forEach(function (input) {
      if (!validateField(input)) valid = false;
    });
    return valid;
  }

  // Display server-side errors on fields
  function displayServerErrors(form, errors) {
    Object.keys(errors).forEach(function (fieldName) {
      var input = form.querySelector('[name="' + fieldName + '"]');
      if (input) {
        input.classList.add('error');
        input.classList.remove('valid');
        var container = input.closest('.form-group') || input.closest('.tf-modal__gdpr');
        var errorEl = container ? container.querySelector('.form-error') : null;
        if (errorEl) {
          errorEl.textContent = errors[fieldName];
          errorEl.classList.add('visible');
        }
      }
    });
    var firstErr = form.querySelector('.error');
    if (firstErr) firstErr.focus();
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    var form = e.target;

    // Honeypot
    var honeypot = form.querySelector('input[name="website"]');
    if (honeypot && honeypot.value) return;

    // Timestamp anti-bot
    if (Date.now() - FORM_OPEN_TIME < MIN_FILL_TIME_MS) return;

    // Rate limit
    if (!checkRateLimit()) {
      showSection('error');
      var errP = overlay.querySelector('.tf-modal__error p');
      if (errP) errP.textContent = 'Слишком много заявок. Попробуйте через 10 минут.';
      return;
    }

    if (!validateForm(form)) {
      var firstErr = form.querySelector('.error');
      if (firstErr) firstErr.focus();
      return;
    }

    submitting = true;
    showSection('loading');

    // Collect data
    var data = {
      form_type: form.getAttribute('data-form-type'),
      service_name: form.getAttribute('data-service'),
      service_price: form.getAttribute('data-price'),
      selected_plan: form.getAttribute('data-plan'),
      source_page: window.location.pathname.split('/').pop() || 'index.html',
      source_button: form.getAttribute('data-btn-text'),
      gdpr_consent: true,
      _timestamp: FORM_OPEN_TIME
    };

    form.querySelectorAll('.tf-modal__fields [data-validate]').forEach(function (input) {
      var val = input.value.trim();
      if (val) {
        if (input.name === 'phone') {
          data[input.name] = normalizePhone(val);
        } else if (input.name === 'email') {
          data[input.name] = val.toLowerCase();
        } else {
          data[input.name] = val;
        }
      }
    });

    var planSelect = form.querySelector('[name="selected_plan"]');
    if (planSelect && planSelect.value) {
      data.selected_plan = planSelect.value;
    }

    fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(function (response) {
      return response.json().then(function (json) {
        return { status: response.status, body: json };
      }).catch(function () {
        return { status: response.status, body: {} };
      });
    })
    .then(function (result) {
      if (result.status === 200 && result.body.success !== false) {
        recordSubmit();
        showSection('success');
        setTimeout(closeModal, 3000);
      } else if (result.body.errors) {
        showSection('form');
        displayServerErrors(form, result.body.errors);
      } else {
        showSection('error');
      }
      submitting = false;
    })
    .catch(function () {
      showSection('error');
      submitting = false;
    });
  }

  // Initialize
  function init() {
    document.querySelectorAll('[data-tf-form]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        openModal({
          form: btn.getAttribute('data-tf-form'),
          service: btn.getAttribute('data-tf-service') || '',
          price: btn.getAttribute('data-tf-price') || '',
          plan: btn.getAttribute('data-tf-plan') || '',
          btnText: btn.textContent.trim()
        });
      });
    });
  }

  // Public API
  window.TFModal = {
    open: openModal,
    close: closeModal,
    retry: function () { showSection('form'); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
