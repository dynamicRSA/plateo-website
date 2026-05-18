/* =============================================================
   SECURITY UTILITIES
   - All user input is sanitised before use
   - Honeypot bot detection
   - Rate limiting via localStorage
   - XSS-safe mailto body construction
============================================================= */

/**
 * Strips any HTML/script/special characters from a string.
 * Used on ALL field values before they enter the mailto body.
 */
function sanitize(str) {
  return String(str)
    .slice(0, 5000)                        // hard length cap
    .replace(/[<>"'`]/g, c => ({           // escape dangerous chars
      '<': '&lt;', '>': '&gt;',
      '"': '&quot;', "'": '&#39;', '`': '&#96;'
    }[c]))
    .replace(/[\r\n]{3,}/g, '\n\n')        // collapse excessive newlines
    .trim();
}

/** Validate email format safely */
function isValidEmail(val) {
  return /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(val) && val.length <= 254;
}

/** Validate phone — digits, spaces, +, -, ( ) only */
function isValidPhone(val) {
  return /^[\d\s\+\-\(\)]{6,20}$/.test(val);
}

/** Validate date is in the future */
function isFutureDate(val) {
  const d = new Date(val);
  const today = new Date();
  today.setHours(0,0,0,0);
  return d >= today;
}

/* =============================================================
   RATE LIMITING  (client-side, localStorage)
   Allows max 3 submissions per rolling 10-minute window.
============================================================= */
const RATE_KEY    = 'plateo_form_times';
const RATE_MAX    = 3;
const RATE_WINDOW = 10 * 60 * 1000; // 10 min

function isRateLimited() {
  const now   = Date.now();
  const raw   = localStorage.getItem(RATE_KEY);
  let times   = [];
  try { times = JSON.parse(raw) || []; } catch { times = []; }
  times = times.filter(t => now - t < RATE_WINDOW);   // keep only recent
  if (times.length >= RATE_MAX) return { limited: true, wait: Math.ceil((times[0] + RATE_WINDOW - now) / 60000) };
  times.push(now);
  localStorage.setItem(RATE_KEY, JSON.stringify(times));
  return { limited: false };
}

/* =============================================================
   NAVBAR
============================================================= */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

/* =============================================================
   MOBILE NAV TOGGLE
============================================================= */
const navToggle = document.getElementById('nav-toggle');
const navLinks  = document.getElementById('nav-links');
navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(open));
});
navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

/* =============================================================
   PARALLAX HERO
============================================================= */
const heroBg = document.getElementById('hero-bg');
window.addEventListener('scroll', () => {
  if (heroBg) heroBg.style.transform = `translateY(${window.scrollY * 0.35}px)`;
}, { passive: true });

/* =============================================================
   SCROLL REVEAL
============================================================= */
const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const parent   = entry.target.closest('.food-cards, .location-cards, .team-gallery, .contact-grid, .about-grid');
    const siblings = parent ? [...parent.querySelectorAll('.reveal')] : [];
    const idx      = siblings.indexOf(entry.target);
    setTimeout(() => entry.target.classList.add('visible'), Math.max(0, idx) * 80);
    observer.unobserve(entry.target);
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
reveals.forEach(el => observer.observe(el));

/* =============================================================
   ACTIVE NAV LINK on scroll
============================================================= */
const sections   = document.querySelectorAll('section[id]');
const navAnchors = document.querySelectorAll('.nav-link');
const secObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navAnchors.forEach(a => a.classList.remove('active'));
      const active = document.querySelector(`.nav-link[href="#${entry.target.id}"]`);
      if (active) active.classList.add('active');
    }
  });
}, { threshold: 0.5 });
sections.forEach(s => secObserver.observe(s));

/* =============================================================
   CONTACT FORM — hardened validation + secure mailto
============================================================= */
const form = document.getElementById('contact-form');
if (form) {

  // Helper: show / clear an error
  function setError(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg || '';
    const fg = el.closest('.form-group');
    if (fg) fg.classList.toggle('has-error', !!msg);
  }

  // On blur — validate individual fields immediately
  form.addEventListener('focusout', e => {
    const t = e.target;
    if (!t.id) return;
    switch (t.id) {
      case 'form-name':
        setError('err-name', t.value.trim().length < 2 ? 'Please enter your full name.' : '');
        break;
      case 'form-email':
        setError('err-email', !isValidEmail(t.value.trim()) ? 'Please enter a valid email address.' : '');
        break;
      case 'form-phone':
        setError('err-phone', !isValidPhone(t.value.trim()) ? 'Please enter a valid phone number.' : '');
        break;
      case 'form-venue':
        setError('err-venue', t.value.trim().length < 3 ? 'Please enter the venue address.' : '');
        break;
      case 'form-date':
        setError('err-date', !t.value || !isFutureDate(t.value) ? 'Please select a future date.' : '');
        break;
      case 'form-time':
        setError('err-time', !t.value ? 'Please select a serving time.' : '');
        break;
      case 'form-guests':
        setError('err-guests', (!t.value || parseInt(t.value) < 1) ? 'Please enter the number of guests.' : '');
        break;
    }
  });

  form.addEventListener('submit', e => {
    e.preventDefault();

    // ── 1. Honeypot check ────────────────────────────────────
    const hp = document.getElementById('hp-website');
    if (hp && hp.value.trim() !== '') {
      // Bot detected — silently swallow the submission
      console.warn('[Security] Honeypot triggered — submission blocked.');
      return;
    }

    // ── 2. Rate limit check ───────────────────────────────────
    const rl = isRateLimited();
    const rateMsg = document.getElementById('form-rate-msg');
    if (rl.limited) {
      if (rateMsg) rateMsg.textContent = `Too many submissions. Please wait ${rl.wait} minute(s) before trying again.`;
      return;
    }
    if (rateMsg) rateMsg.textContent = '';

    // ── 3. Collect & sanitise all values ─────────────────────
    const name     = sanitize(document.getElementById('form-name').value);
    const email    = sanitize(document.getElementById('form-email').value);
    const phone    = sanitize(document.getElementById('form-phone').value);
    const venue    = sanitize(document.getElementById('form-venue').value);
    const date     = sanitize(document.getElementById('form-date').value);
    const time     = sanitize(document.getElementById('form-time').value);
    const guests   = sanitize(document.getElementById('form-guests').value);
    const seafood  = sanitize(document.getElementById('form-seafood').value);
    const chicken  = sanitize(document.getElementById('form-chicken').value);
    const vegetarian = sanitize(document.getElementById('form-mushroom').value);
    const message  = sanitize(document.getElementById('form-message').value);

    // ── 4. Full field-level validation ───────────────────────
    let valid = true;

    if (name.length < 2)                    { setError('err-name',     'Please enter your full name.');             valid = false; }
    if (!isValidEmail(email))               { setError('err-email',    'Please enter a valid email address.');      valid = false; }
    if (!isValidPhone(phone))               { setError('err-phone',    'Please enter a valid phone number.');       valid = false; }
    if (venue.length < 3)                   { setError('err-venue',    'Please enter the venue address.');          valid = false; }
    if (!date || !isFutureDate(date))       { setError('err-date',     'Please select a future date.');             valid = false; }
    if (!time)                              { setError('err-time',     'Please select a serving time.');            valid = false; }
    if (!guests || parseInt(guests) < 1)    { setError('err-guests',   'Please enter the number of guests.');       valid = false; }

    // Paella: at least one type must be > 0, and any non-zero must be >= 20
    const paellaVals = [
      { name: 'Seafood',    val: parseInt(seafood)    || 0 },
      { name: 'Chicken',    val: parseInt(chicken)    || 0 },
      { name: 'Vegetarian', val: parseInt(vegetarian) || 0 },
    ];
    const totalPaella = paellaVals.reduce((s, p) => s + p.val, 0);
    const underMin    = paellaVals.filter(p => p.val > 0 && p.val < 20);
    if (totalPaella === 0) {
      setError('err-paella', 'Please select at least one paella type.');
      valid = false;
    } else if (underMin.length) {
      setError('err-paella', `${underMin.map(p => p.name).join(' & ')} must be 0 or at least 20.`);
      valid = false;
    } else {
      setError('err-paella', '');
    }

    if (!valid) {
      // Scroll to first error
      const firstErr = form.querySelector('.has-error');
      if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // ── 5. Build safe mailto body ─────────────────────────────
    // Values already sanitised — encode for mailto URI
    const paellaLines = paellaVals
      .filter(p => p.val > 0)
      .map(p => `  ${p.name}: ${p.val}`)
      .join('\n');

    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      `Phone: ${phone}`,
      ``,
      `Event Date: ${date}`,
      `Serving Time: ${time}`,
      `Venue: ${venue}`,
      `Guests: ${guests}`,
      ``,
      `Paella Types:`,
      paellaLines || '  None specified',
      ``,
      message ? `\nMessage:\n${message}` : '',
    ].filter(l => l !== undefined).join('\n');

    const subject = `Event Enquiry — ${name} (${guests} guests, ${date})`;

    // ── 6. Open mailto — no page navigation, no form POST ─────
    window.location.href = `mailto:info@plateo.co.za?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // ── 7. Disable submit briefly to prevent double-click ─────
    const btn = document.getElementById('form-submit');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Opening mail client…';
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = 'Send Enquiry →';
      }, 4000);
    }
  });
}
