/**
 * TriggerFlow™ — Main JavaScript
 * Animations, navigation, interactions
 */

document.addEventListener('DOMContentLoaded', () => {
  // ========================================
  // 0. LANGUAGE DETECTION
  // ========================================
  const LANG = document.documentElement.lang || 'ru';

  // ========================================
  // 1. MOBILE NAVIGATION
  // ========================================
  // Support both .navbar__hamburger (most pages) and .mobile-toggle (services.html)
  const mobileToggle = document.querySelector('.navbar__hamburger') || document.querySelector('.mobile-toggle');
  // Support both .navbar__links (BEM) and .nav-links (legacy)
  const navLinks = document.querySelector('.navbar__links') || document.querySelector('.nav-links');
  const navbar = document.querySelector('.navbar');

  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      mobileToggle.classList.toggle('active');
      document.body.classList.toggle('menu-open');
    });
  }

  // Close mobile menu on link click (but not dropdown parent links)
  document.querySelectorAll('.navbar__links a, .nav-links a').forEach(link => {
    link.addEventListener('click', (e) => {
      // If this is a dropdown parent link on mobile, toggle submenu instead
      const parentDropdown = link.closest('.navbar__dropdown');
      if (parentDropdown && link === parentDropdown.querySelector(':scope > a')) {
        if (window.innerWidth <= 992) {
          e.preventDefault();
          parentDropdown.classList.toggle('open');
          return;
        }
      }
      if (navLinks) navLinks.classList.remove('active');
      if (mobileToggle) mobileToggle.classList.remove('active');
      document.body.classList.remove('menu-open');
    });
  });

  // ========================================
  // 2. NAVBAR SCROLL EFFECT
  // ========================================
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 80) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
  });

  // ========================================
  // 3. SCROLL ANIMATIONS (Intersection Observer)
  // ========================================
  const animateElements = document.querySelectorAll('.animate-on-scroll');

  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animated');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  animateElements.forEach(el => observer.observe(el));

  // ========================================
  // 4. STAGGERED ANIMATIONS FOR CARDS
  // ========================================
  const cardGroups = document.querySelectorAll('.cards-grid, .pricing-grid, .steps-grid, .features-grid');

  const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const cards = entry.target.children;
        Array.from(cards).forEach((card, index) => {
          setTimeout(() => {
            card.classList.add('animated');
          }, index * 150);
        });
        cardObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  cardGroups.forEach(group => cardObserver.observe(group));

  // ========================================
  // 5. COUNTER ANIMATION
  // ========================================
  const counters = document.querySelectorAll('.counter-value');

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = entry.target;
        const value = target.getAttribute('data-value');
        const suffix = target.getAttribute('data-suffix') || '';
        const prefix = target.getAttribute('data-prefix') || '';
        const numValue = parseInt(value);
        let current = 0;
        const increment = numValue / 60;
        const duration = 1500;
        const stepTime = duration / 60;

        const timer = setInterval(() => {
          current += increment;
          if (current >= numValue) {
            current = numValue;
            clearInterval(timer);
          }
          target.textContent = prefix + Math.floor(current) + suffix;
        }, stepTime);

        counterObserver.unobserve(target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(counter => counterObserver.observe(counter));

  // ========================================
  // 6. SEGMENT TABS
  // ========================================
  const segmentTabs = document.querySelectorAll('.segment-tab');
  const segmentPanels = document.querySelectorAll('.segment-panel');

  segmentTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-segment');

      // Remove active from all tabs and panels
      segmentTabs.forEach(t => t.classList.remove('active'));
      segmentPanels.forEach(p => p.classList.remove('active'));

      // Add active to clicked tab and corresponding panel
      tab.classList.add('active');
      const panel = document.getElementById(target);
      if (panel) panel.classList.add('active');
    });
  });

  // ========================================
  // 7. SMOOTH SCROLL FOR ANCHOR LINKS
  // ========================================
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      if (this.hasAttribute('data-tf-form')) return;
      e.preventDefault();
      const href = this.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        const navHeight = navbar.offsetHeight;
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // ========================================
  // 8. SCROLL DOWN INDICATOR
  // ========================================
  // Support both .hero__scroll-indicator (BEM) and .scroll-indicator (legacy)
  const scrollIndicator = document.querySelector('.hero__scroll-indicator') || document.querySelector('.scroll-indicator');
  if (scrollIndicator) {
    scrollIndicator.addEventListener('click', () => {
      const nextSection = (document.querySelector('.hero') || document.querySelector('.page-hero')).nextElementSibling;
      if (nextSection) {
        const navHeight = navbar.offsetHeight;
        window.scrollTo({
          top: nextSection.offsetTop - navHeight,
          behavior: 'smooth'
        });
      }
    });

    // Fade out scroll indicator on scroll
    window.addEventListener('scroll', () => {
      if (window.pageYOffset > 200) {
        scrollIndicator.style.opacity = '0';
        scrollIndicator.style.pointerEvents = 'none';
      } else {
        scrollIndicator.style.opacity = '1';
        scrollIndicator.style.pointerEvents = 'auto';
      }
    });
  }

  // ========================================
  // 9. PRICING TOGGLE (monthly/annual)
  // ========================================
  const pricingToggle = document.querySelector('.pricing-toggle');
  if (pricingToggle) {
    pricingToggle.addEventListener('click', () => {
      pricingToggle.classList.toggle('annual');
      document.querySelectorAll('.price-monthly').forEach(el => el.classList.toggle('hidden'));
      document.querySelectorAll('.price-annual').forEach(el => el.classList.toggle('hidden'));
    });
  }

  // ========================================
  // 10. PARALLAX EFFECT ON HERO
  // ========================================
  const hero = document.querySelector('.hero') || document.querySelector('.page-hero');
  if (hero) {
    window.addEventListener('scroll', () => {
      const scrolled = window.pageYOffset;
      if (scrolled < window.innerHeight) {
        hero.style.transform = `translateY(${scrolled * 0.3}px)`;
        hero.style.opacity = 1 - (scrolled / window.innerHeight) * 0.5;
      }
    });
  }

  // ========================================
  // 11. TYPED EFFECT FOR HERO HEADING (optional)
  // ========================================
  const typedElement = document.querySelector('.typed-text');
  if (typedElement) {
    const text = typedElement.getAttribute('data-text');
    typedElement.textContent = '';
    let i = 0;
    const typeInterval = setInterval(() => {
      if (i < text.length) {
        typedElement.textContent += text.charAt(i);
        i++;
      } else {
        clearInterval(typeInterval);
      }
    }, 30);
  }

  // ========================================
  // 12. ACTIVE NAV LINK HIGHLIGHTING
  // ========================================
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.navbar__links a, .nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // ========================================
  // 13. FUNNEL STEP ANIMATION
  // ========================================
  const funnelSteps = document.querySelectorAll('.funnel-step');
  const funnelObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const steps = entry.target.querySelectorAll('.funnel-step');
        steps.forEach((step, index) => {
          setTimeout(() => {
            step.classList.add('animated');
          }, index * 300);
        });
        funnelObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  const funnelContainer = document.querySelector('.funnel-container');
  if (funnelContainer) funnelObserver.observe(funnelContainer);

  // ========================================
  // 14. FORM SUBMISSION HANDLING
  // ========================================
  const forms = document.querySelectorAll('.cta-form');
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.textContent = {ru:'Отправлено!', en:'Sent!', fr:'Envoyé!'}[LANG] || 'Отправлено!';
      btn.classList.add('success');
      setTimeout(() => {
        btn.textContent = originalText;
        btn.classList.remove('success');
      }, 3000);
    });
  });

  // ========================================
  // 15. GLASSMORPHISM CARD TILT EFFECT
  // ========================================
  const tiltCards = document.querySelectorAll('.card-tilt');
  tiltCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = (y - centerY) / 20;
      const rotateY = (centerX - x) / 20;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
    });
  });

  // ========================================
  // 16. CHECK BLOCKS ANIMATION
  // ========================================
  const checkBlocks = document.querySelectorAll('.check-block');
  const checkObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animated');
        checkObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  checkBlocks.forEach(block => checkObserver.observe(block));

  // ========================================
  // 7. STICKY MOBILE CTA
  // ========================================
  const stickyCta = document.getElementById('stickyCta');
  if (stickyCta) {
    const footer = document.querySelector('.footer');
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const footerTop = footer ? footer.getBoundingClientRect().top + scrollY : Infinity;
          const viewBottom = scrollY + window.innerHeight;
          if (scrollY > 400 && viewBottom < footerTop) {
            stickyCta.classList.add('visible');
          } else {
            stickyCta.classList.remove('visible');
          }
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  // ========================================
  // 18. LANGUAGE SWITCHER
  // ========================================
  const langBtn = document.querySelector('.navbar__lang-btn');
  const langMenu = document.querySelector('.navbar__lang-menu');

  if (langBtn && langMenu) {
    // Toggle dropdown
    langBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      langMenu.classList.toggle('open');
    });

    // Close on outside click
    document.addEventListener('click', () => {
      langMenu.classList.remove('open');
    });

    // Handle language switch links
    document.querySelectorAll('[data-lang-switch]').forEach(link => {
      const targetLang = link.getAttribute('data-lang-switch');
      // Mark current language as active
      if (targetLang === LANG) {
        link.classList.add('active');
      }

      // Compute href for this language
      const path = window.location.pathname;
      const pageName = path.split('/').pop() || 'index.html';
      // Detect if we're inside /en/ or /fr/ subfolder
      const inSubfolder = /\/(en|fr)\//.test(path);

      let href;
      if (targetLang === 'ru') {
        href = inSubfolder ? '../' + pageName : pageName;
      } else {
        href = inSubfolder ? '../' + targetLang + '/' + pageName : targetLang + '/' + pageName;
      }
      link.setAttribute('href', href);
    });

    // Update button label to current language
    langBtn.textContent = LANG.toUpperCase() + ' \u25BE';
  }
});
