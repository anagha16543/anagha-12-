/**
 * transitions.js — Page transition effects
 * View Transitions API with GSAP Flip-style fallback
 */

// ── Card expand transition ───────────────────────────────────
/**
 * Animate a card expanding to fill the viewport before navigating.
 * Uses View Transitions API if available, else GSAP.
 * @param {HTMLElement} cardEl — the card to expand
 * @param {string} url — destination URL
 */
export function cardExpandNavigate(cardEl, url) {
  // Check for prefers-reduced-motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.location.href = url;
    return;
  }

  // Try View Transitions API (Chrome 111+)
  if (document.startViewTransition) {
    cardEl.style.viewTransitionName = 'criterion-card';
    document.startViewTransition(() => {
      window.location.href = url;
    });
    return;
  }

  // Fallback: GSAP-style clone animation
  const rect = cardEl.getBoundingClientRect();
  const clone = cardEl.cloneNode(true);

  clone.style.cssText = `
    position: fixed;
    top: ${rect.top}px;
    left: ${rect.left}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    z-index: 9000;
    border-radius: var(--radius-2xl);
    transition: all 0.55s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: none;
    overflow: hidden;
  `;

  document.body.appendChild(clone);

  // Force reflow
  void clone.offsetTop;

  clone.style.top    = '0';
  clone.style.left   = '0';
  clone.style.width  = '100vw';
  clone.style.height = '100vh';
  clone.style.borderRadius = '0';

  setTimeout(() => {
    window.location.href = url;
  }, 580);
}

// ── Fade in on page load ─────────────────────────────────────
export function pageEnter() {
  document.body.style.opacity = '0';
  document.body.style.transform = 'translateY(8px)';
  document.body.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.style.opacity = '1';
      document.body.style.transform = 'translateY(0)';
    });
  });
}

// ── Fade out before navigation ───────────────────────────────
export function pageLeave(url, delay = 300) {
  document.body.style.transition = 'opacity 0.3s ease';
  document.body.style.opacity = '0';
  setTimeout(() => { window.location.href = url; }, delay);
}

