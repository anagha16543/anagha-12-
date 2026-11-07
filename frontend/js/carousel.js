/**
 * carousel.js — 3D Criteria Cards Showcase (Skiper 48 Port)
 * AI-NBA Readiness System
 *
 * Smooth scroll-driven 3-card spread:
 * - C6: Positioned on the LEFT side of C3 upon scrolling
 * - C3: Center (Active card with Cyan glow & moving border)
 * - C5: Positioned on the RIGHT side of C3 upon scrolling
 */

import { store } from './store.js';
import { api } from './api.js';
import { countUp } from './ui.js';
import { cardExpandNavigate } from './transitions.js';

// ── Criteria Configuration ────────────────────────────────────
// All 4 Criteria: C3, C4, C5, C6 in one line spread upon scrolling
export const CRITERIA_CONFIG = [
  {
    code: 'C3',
    title: 'Outcome-Based Assessment',
    question: 'Did students actually learn what we said they would learn?',
    route: 'dashboards/c3.html',
    accent: '#00F5A0',
    glow: 'rgba(0, 245, 160, 0.35)',
    roles: ['FACULTY', 'HOD', 'ADMIN'],
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
             <polyline points="14 2 14 8 20 8"/>
             <line x1="16" y1="13" x2="8" y2="13"/>
             <line x1="16" y1="17" x2="8" y2="17"/>
             <polyline points="10 9 9 9 8 9"/>
           </svg>`
  },
  {
    code: 'C4',
    title: 'Students\' Performance',
    question: 'Are students progressing on time, clearing exams, and securing top careers?',
    route: 'dashboards/c4.html',
    accent: '#F59E0B',
    glow: 'rgba(245, 158, 11, 0.35)',
    roles: ['FACULTY', 'HOD', 'ADMIN'],
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
           </svg>`
  },
  {
    code: 'C5',
    title: 'Faculty Information',
    question: 'Do we have enough qualified, cadre-balanced, and retained faculty?',
    route: 'dashboards/c5.html',
    accent: '#8B5CF6',
    glow: 'rgba(139, 92, 246, 0.35)',
    roles: ['FACULTY', 'HOD', 'ADMIN'],
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
             <circle cx="9" cy="7" r="4"/>
             <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
             <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
           </svg>`
  },
  {
    code: 'C6',
    title: 'Faculty Contributions',
    question: 'What are our faculty contributing to research and innovation?',
    route: 'dashboards/c6.html',
    accent: '#D946EF',
    glow: 'rgba(217, 70, 239, 0.35)',
    roles: ['FACULTY', 'HOD', 'ADMIN'],
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
           </svg>`
  }
];

let _activeIndex = 0; // Default to C3 (or first card) in active focus
let _scrollTriggerInstance = null;
let _currentScrollProgress = 0; // Start at 0 (stacked), scroll drives to 1 (spread)

/**
 * Initialize the Criteria 3D Stage inside container
 * @param {string} containerSelector
 */
export async function initCriteriaCarousel(containerSelector = '#criteria-swiper-root') {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const isLoggedIn = store.isLoggedIn();
  const userRoles  = store.getUser()?.roles || [];

  // Build 3D Cards Stage
  container.innerHTML = `
    <div class="criteria-cards-stage" id="criteria-cards-stage">
      ${CRITERIA_CONFIG.map((crit, idx) => {
        const hasAccess = crit.roles.some(r => userRoles.includes(r));
        const isRoleLocked = isLoggedIn && !hasAccess;

        return `
          <div class="criterion-card-slide ${isRoleLocked ? 'role-locked' : ''}"
               id="card-slide-${crit.code}"
               data-index="${idx}"
               data-code="${crit.code}"
               data-route="${crit.route}"
               style="--card-accent: ${crit.accent}; --card-glow: ${crit.glow};"
               tabindex="0"
               role="button"
               aria-label="${crit.code}: ${crit.title}">

            ${isRoleLocked ? `
              <div class="role-lock-badge">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Restricted
              </div>
            ` : ''}

            <div class="criterion-card-inner">
              <div class="card-header-top">
                <span class="card-code">${crit.code}</span>
                <div class="card-icon-wrap">${crit.icon}</div>
              </div>

              <div class="card-body-content">
                <h3 class="card-title">${crit.title}</h3>
                <p class="card-question">"${crit.question}"</p>
              </div>

              <div class="card-stat-strip" id="stat-strip-${crit.code}">
                ${isLoggedIn ? `
                  <div class="stat-strip-row">
                    <span class="stat-strip-label">Readiness</span>
                    <span class="stat-strip-pct" id="pct-${crit.code}">--%</span>
                  </div>
                  <div class="stat-mini-bar" id="bar-${crit.code}">
                    <div class="bar-seg-pass" style="width: 0%"></div>
                    <div class="bar-seg-warning" style="width: 0%"></div>
                    <div class="bar-seg-fail" style="width: 0%"></div>
                  </div>
                ` : `
                  <div class="locked-shimmer">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <span>Sign in for live stats</span>
                    <div class="skeleton shimmer-box"></div>
                  </div>
                `}
              </div>

              <button class="card-cta-btn" type="button" tabindex="-1">
                <span>${isLoggedIn ? 'Enter Dashboard' : 'Sign in to Enter'}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Apply initial STACKED positions (all cards at center, behind each other)
  _setInitialStackedPositions();

  // Setup Scroll-Driven Animation: stacked → fanned-out spread
  _setupScrollDrivenCardsSpread();

  // Setup click & keyboard interactions
  _setupCardInteractions();

  // Load live criteria analytics if logged in
  if (isLoggedIn) {
    _loadLiveCriteriaStats();
  }
}

/**
 * Set initial stacked positions — all 4 cards overlapping at center directly behind each other.
 * Active card (C3) in front, subsequent cards (C4, C5, C6) tucked directly behind each other in 3D depth.
 */
function _setInitialStackedPositions() {
  const cards = document.querySelectorAll('.criterion-card-slide');
  cards.forEach(card => {
    const idx = parseInt(card.dataset.index, 10);
    card.classList.remove('is-left', 'is-center', 'is-right');

    if (idx === _activeIndex) {
      card.classList.add('is-center');
      gsap.set(card, { x: 0, y: 0, z: 0, rotationY: 0, scale: 1, opacity: 1 });
      card.style.zIndex = 10;
    } else {
      const depth = Math.abs(idx - _activeIndex);
      gsap.set(card, {
        x: 0,
        y: depth * 5,
        z: -depth * 45,
        rotationY: 0,
        scale: 1 - depth * 0.04,
        opacity: Math.max(0.35, 1 - depth * 0.2)
      });
      card.style.zIndex = Math.max(1, 10 - depth);
    }
  });
}

/**
 * Compute the target spread distance based on screen width.
 * Ensures all 4 cards display evenly in one clean horizontal line.
 */
function _getTargetSpread() {
  const w = window.innerWidth;
  if (w < 600) return 120;
  if (w < 900) return 180;
  if (w < 1250) return 245;
  return 305;
}

/**
 * Apply 3D positions to the cards in ONE SINGLE LINE based on _activeIndex.
 * All 4 cards sit visibly side-by-side; active card elevates forward with moving gradient border.
 */
function _applyCardPositions(animate = true) {
  const cards = document.querySelectorAll('.criterion-card-slide');
  const targetSpread = _getTargetSpread();

  cards.forEach(card => {
    const idx = parseInt(card.dataset.index, 10);
    const isActive = (idx === _activeIndex);

    card.classList.remove('is-left', 'is-center', 'is-right');
    if (isActive) {
      card.classList.add('is-center');
    }

    // Position in ONE LINE centered at index 1.5 (-1.5, -0.5, +0.5, +1.5)
    const x = (idx - 1.5) * targetSpread;
    const y = isActive ? -12 : 0;
    const z = isActive ? 35 : 0;
    const rotationY = isActive ? 0 : ((idx < 1.5 ? 1 : -1) * (Math.abs(idx - 1.5) === 1.5 ? 8 : 2));
    const scale = isActive ? 1.03 : 0.96;
    const opacity = 1;
    const zIndex = isActive ? 20 : (10 - Math.abs(idx - 1.5));

    if (typeof gsap !== 'undefined') {
      if (animate) {
        gsap.to(card, {
          x,
          y,
          z,
          rotationY,
          scale,
          opacity,
          duration: 0.6,
          ease: 'power3.out',
          overwrite: 'auto'
        });
        card.style.zIndex = zIndex;
      } else {
        gsap.set(card, { x, y, z, rotationY, scale, opacity });
        card.style.zIndex = zIndex;
      }
    } else {
      card.style.transform = `translate3d(${x}px, ${y}px, ${z}px) rotateY(${rotationY}deg) scale(${scale})`;
      card.style.opacity = opacity;
      card.style.zIndex = zIndex;
    }
  });

  // Shift ambient backdrop to match active card
  const activeCrit = CRITERIA_CONFIG[_activeIndex];
  if (activeCrit) {
    const section = document.getElementById('criteria-carousel-section');
    if (section) {
      section.style.setProperty('--active-card-glow', activeCrit.glow);
    }
  }
}

/**
 * ScrollTrigger: Stacked-to-one-line spread animation.
 * Progress 0 = all 4 cards stacked directly behind each other at center.
 * Progress 1 = all 4 cards smoothly fan out and display in ONE SINGLE LINE side-by-side!
 */
function _setupScrollDrivenCardsSpread() {
  const section = document.getElementById('criteria-carousel-section');
  if (!section || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  _scrollTriggerInstance = ScrollTrigger.create({
    trigger: section,
    start: 'top 85%',
    end: 'center 45%',
    scrub: 1,
    onUpdate: (self) => {
      _currentScrollProgress = self.progress;
      const cards = document.querySelectorAll('.criterion-card-slide');
      const targetSpread = _getTargetSpread();
      const p = self.progress; // 0 → 1

      cards.forEach(card => {
        const idx = parseInt(card.dataset.index, 10);
        const isActive = (idx === _activeIndex);

        // Target position in ONE LINE
        const targetX = (idx - 1.5) * targetSpread;

        // In stacked state (p=0), depth order behind active card
        const stackDepth = isActive ? 0 : Math.abs(idx - _activeIndex);
        const startZ = -stackDepth * 45;
        const startScale = 1 - stackDepth * 0.04;
        const startOpacity = Math.max(0.35, 1 - stackDepth * 0.2);

        // In spread state (p=1)
        const endZ = isActive ? 35 : 0;
        const endRotY = (idx < 1.5 ? 1 : -1) * (Math.abs(idx - 1.5) === 1.5 ? 8 : 2);
        const endScale = isActive ? 1.03 : 0.96;
        const endOpacity = 1;

        gsap.set(card, {
          x: targetX * p,
          y: (1 - p) * (stackDepth * 5) + (isActive ? -12 * p : 0),
          z: startZ * (1 - p) + endZ * p,
          rotationY: endRotY * p,
          scale: startScale * (1 - p) + endScale * p,
          opacity: startOpacity * (1 - p) + endOpacity * p
        });

        card.style.zIndex = isActive ? 20 : (10 - Math.abs(idx - 1.5));
      });
    }
  });
}

/**
 * Handle mouse tilt, click distinction, and card navigation
 */
function _setupCardInteractions() {
  const cards = document.querySelectorAll('.criterion-card-slide');

  cards.forEach(card => {
    const inner = card.querySelector('.criterion-card-inner');

    // 3D tilt effect on mouse move applied safely to .criterion-card-inner
    card.addEventListener('mousemove', (e) => {
      if (!inner || typeof gsap === 'undefined') return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const tiltX = -(y / (rect.height / 2)) * 8;
      const tiltY = (x / (rect.width / 2)) * 8;

      gsap.to(inner, {
        rotateX: tiltX,
        rotateY: tiltY,
        duration: 0.25,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    });

    card.addEventListener('mouseleave', () => {
      if (!inner || typeof gsap === 'undefined') return;
      gsap.to(inner, {
        rotateX: 0,
        rotateY: 0,
        duration: 0.4,
        ease: 'power2.out'
      });
    });

    // Click / Enter Action
    const handleAction = () => {
      const idx = parseInt(card.dataset.index, 10);

      if (idx !== _activeIndex) {
        // Clicking a non-active card brings it smoothly to the center
        _activeIndex = idx;
        _applyCardPositions(true);
      } else {
        // Clicking the ACTIVE card navigates to its dashboard
        _triggerNavigation(card);
      }
    };

    card.addEventListener('click', handleAction);

    // Keyboard support
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAction();
      } else if (e.key === 'ArrowLeft') {
        _activeIndex = (_activeIndex - 1 + CRITERIA_CONFIG.length) % CRITERIA_CONFIG.length;
        _applyCardPositions(true);
      } else if (e.key === 'ArrowRight') {
        _activeIndex = (_activeIndex + 1) % CRITERIA_CONFIG.length;
        _applyCardPositions(true);
      }
    });
  });

  // Handle window resize smoothly
  window.addEventListener('resize', () => {
    _applyCardPositions(false);
  });
}

/**
 * Navigate to dashboard with authentication check and expand animation
 */
function _triggerNavigation(card) {
  const route = card.dataset.route;
  const code = card.dataset.code;
  const crit = CRITERIA_CONFIG.find(c => c.code === code);

  // 1. Auth check
  if (!store.isLoggedIn()) {
    const redirect = encodeURIComponent(route);
    window.location.href = `login.html?redirect=${redirect}`;
    return;
  }

  // 2. Role check
  const userRoles = store.getUser()?.roles || [];
  const hasAccess = crit.roles.some(r => userRoles.includes(r));
  if (!hasAccess) return;

  // 3. Shared-element expand animation and load dashboard
  cardExpandNavigate(card, route);
}

/**
 * Fetch GET /digital-twin/criteria/{criterion_code} and animate counters
 */
async function _loadLiveCriteriaStats() {
  for (const crit of CRITERIA_CONFIG) {
    try {
      const data = await api.getCriterionAnalytics(crit.code);
      if (!data) continue;

      const pctEl = document.getElementById(`pct-${crit.code}`);
      const barEl = document.getElementById(`bar-${crit.code}`);

      const readiness = data.readiness_pct ?? 0;
      if (pctEl) {
        countUp(pctEl, readiness, 1400, '%');
      }

      if (barEl) {
        const total = (data.pass_count || 0) + (data.warning_count || 0) + (data.fail_count || 0) || 1;
        const passPct = ((data.pass_count || 0) / total) * 100;
        const warnPct = ((data.warning_count || 0) / total) * 100;
        const failPct = ((data.fail_count || 0) / total) * 100;

        const passBar = barEl.querySelector('.bar-seg-pass');
        const warnBar = barEl.querySelector('.bar-seg-warning');
        const failBar = barEl.querySelector('.bar-seg-fail');

        if (passBar) passBar.style.width = `${passPct}%`;
        if (warnBar) warnBar.style.width = `${warnPct}%`;
        if (failBar) failBar.style.width = `${failPct}%`;
      }
    } catch {
      const pctEl = document.getElementById(`pct-${crit.code}`);
      if (pctEl) pctEl.textContent = 'Ready';
    }
  }
}

/**
 * Clean up on page leave
 */
export function destroyCriteriaCarousel() {
  if (_scrollTriggerInstance) {
    _scrollTriggerInstance.kill();
    _scrollTriggerInstance = null;
  }
}
