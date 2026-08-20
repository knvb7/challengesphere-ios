const motionQuery = new URLSearchParams(window.location.search);
const forcedReducedMotion = motionQuery.get('reduced-motion') === '1';
const captureMode = motionQuery.get('capture') === '1';
const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const motionAllowed = !forcedReducedMotion && !prefersReducedMotion;
const analyticsEndpoint = window.CHALLENGESPHERE_ANALYTICS_ENDPOINT || '';
const visitorStorageKey = 'challengesphere_visitor_id';

const getVisitorId = () => {
  try {
    const existing = window.localStorage.getItem(visitorStorageKey);
    if (existing) return existing;

    const next = window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `visitor_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    window.localStorage.setItem(visitorStorageKey, next);
    return next;
  } catch (error) {
    return `visitor_${Date.now()}`;
  }
};

const getAnalyticsContext = () => ({
  visitorId: getVisitorId(),
  page: window.location.href,
  referrer: document.referrer,
  source: motionQuery.get('utm_source') || '',
  medium: motionQuery.get('utm_medium') || '',
  campaign: motionQuery.get('utm_campaign') || '',
  userAgent: window.navigator.userAgent,
  language: window.navigator.language,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
  screen: `${window.screen.width}x${window.screen.height}`,
  viewport: `${window.innerWidth}x${window.innerHeight}`
});

const buildAnalyticsPayload = (eventName, details = {}) => ({
  event: eventName,
  ...getAnalyticsContext(),
  ...details
});

const postToAnalyticsEndpoint = (payload) => {
  if (!analyticsEndpoint) return Promise.resolve(false);

  const formBody = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => {
    formBody.set(key, value == null ? '' : String(value));
  });

  return fetch(analyticsEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    },
    body: formBody.toString()
  }).then(async (response) => {
    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }

    if (!response.ok || data?.ok === false) {
      const error = new Error(data?.error || 'Unable to submit right now.');
      error.status = response.status;
      throw error;
    }

    return true;
  });
};

const sendAnalyticsEvent = (eventName, details = {}) =>
  postToAnalyticsEndpoint(buildAnalyticsPayload(eventName, details)).catch(() => false);

document.querySelectorAll('[data-year]').forEach((node) => {
  node.textContent = String(new Date().getFullYear());
});

if (motionAllowed) {
  document.documentElement.classList.add('motion-enabled');
  document.documentElement.classList.add('force-motion');
}

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (event) => {
    const href = anchor.getAttribute('href');
    if (!href || href === '#') return;

    const target = document.querySelector(href);
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({
      behavior: motionAllowed ? 'smooth' : 'auto',
      block: 'start'
    });
  });
});

sendAnalyticsEvent('page_view');

document.querySelectorAll('[data-analytics-event]').forEach((node) => {
  node.addEventListener('click', () => {
    sendAnalyticsEvent(node.getAttribute('data-analytics-event') || 'click', {
      label: node.textContent.trim()
    });
  });
});

const betaAccessStorageKey = 'challengesphere_android_beta_opt_in_started';
const betaInstallLinks = Array.from(document.querySelectorAll('[data-beta-install]'));

const unlockBetaInstall = () => {
  betaInstallLinks.forEach((link) => {
    link.classList.remove('is-locked');
    link.removeAttribute('aria-disabled');
    link.removeAttribute('tabindex');
    const label = link.querySelector('[data-beta-install-label]');
    if (label) label.textContent = 'Install beta from';
  });
};

try {
  if (window.localStorage.getItem(betaAccessStorageKey) === '1') unlockBetaInstall();
} catch (error) {
  // Storage may be unavailable in privacy-focused browsing modes.
}

document.querySelectorAll('[data-beta-opt-in]').forEach((link) => {
  link.addEventListener('click', () => {
    try {
      window.localStorage.setItem(betaAccessStorageKey, '1');
    } catch (error) {
      // The install step still unlocks for the current page visit.
    }
    window.setTimeout(unlockBetaInstall, 250);
  });
});

const revealSelectors = [
  '.site-header',
  '.hero-copy .eyebrow-pill',
  '.hero-copy h1',
  '.hero-copy .hero-subtitle',
  '.hero-copy .primary-pill',
  '.hero-visual',
  '.trust-strip',
  '.step-card',
  '.manifesto-section',
  '.section-heading',
  '.screen-card',
  '.why-intro',
  '.why-list article',
  '.download-section',
  '.legal-hero',
  '.legal-card',
  '.feature-card',
  '.site-footer'
];

const revealNodes = revealSelectors.flatMap((selector) =>
  Array.from(document.querySelectorAll(selector))
);

revealNodes.forEach((node, index) => {
  node.setAttribute('data-reveal', '');
  node.style.setProperty('--reveal-delay', captureMode ? '0ms' : `${Math.min(index * 42, 340)}ms`);
});

if (motionAllowed) {
  let frameRequested = false;
  let pointerX = window.innerWidth * 0.5;
  let pointerY = window.innerHeight * 0.18;

  const paintPointerGlow = () => {
    document.documentElement.style.setProperty('--pointer-x', `${pointerX}px`);
    document.documentElement.style.setProperty('--pointer-y', `${pointerY}px`);
    frameRequested = false;
  };

  window.addEventListener(
    'pointermove',
    (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;

      if (!frameRequested) {
        window.requestAnimationFrame(paintPointerGlow);
        frameRequested = true;
      }
    },
    { passive: true }
  );

  paintPointerGlow();
}

if (captureMode) {
  document.documentElement.classList.add('capture-ready');
  revealNodes.forEach((node) => {
    node.classList.add('is-visible');
    node.style.setProperty('--reveal-delay', '0ms');
  });
}

if (motionAllowed && !captureMode && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          const revealDelay = Number.parseFloat(
            window.getComputedStyle(entry.target).getPropertyValue('--reveal-delay')
          );

          window.setTimeout(() => {
            entry.target.style.setProperty('--reveal-delay', '0ms');
          }, (Number.isNaN(revealDelay) ? 0 : revealDelay) + 950);

          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  revealNodes.forEach((node) => observer.observe(node));
} else {
  revealNodes.forEach((node) => node.classList.add('is-visible'));
}
