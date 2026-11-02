/**
 * landing.js — Cinematic Scroll-Driven Animations & Interactive Scenes
 * AI-NBA Readiness System
 *
 * All motion is strictly bound to user scrolling (ScrollTrigger scrub).
 * No autonomous runaway timers or runaway animation loops.
 */

import { initCriteriaCarousel, destroyCriteriaCarousel } from './carousel.js';
import { countUp, initCursor, initThemeToggle } from './ui.js';
import { store } from './store.js';

let _lenis = null;
let _canvasAnimId = null;

export function initLandingPage() {
  // 1. Core UI utilities
  initCursor();
  initThemeToggle('[data-theme-toggle]');

  // Ensure HTML has auto scroll-behavior so it does not conflict with Lenis
  document.documentElement.style.scrollBehavior = 'auto';

  // 2. Setup Lenis Smooth Scroll (SINGLE ticker connection, NO duplicate rAF)
  if (typeof Lenis !== 'undefined') {
    _lenis = new Lenis({
      duration: 1.0,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
      syncTouch: false,
    });

    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      _lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => {
        _lenis.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    } else {
      function raf(time) {
        _lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }
  }

  // 3. Hero Node Network Canvas (reactive to scroll and mouse, NOT auto-drifting)
  _initHeroCanvas();

  // 3b. Skiper 58 TextRoll initialization for Hero Title
  initTextRoll('.text-roll');

  // 4. GSAP ScrollTrigger Scenes (strictly scroll-scrubbed)
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
    _initHeroTextReveal();
    _initProblemScene();
    _initLoopHorizontalScroll();
    _initDigitalTwinSnap();
    _initComplianceStripAnimation();
    _initVirtualInspectionGauge();
  }

  // 5. Criteria Carousel (Skiper 48 Port)
  initCriteriaCarousel('#criteria-swiper-root');

  // 5b. Skiper 47 Perspective Coverflow Carousel (8 Advisory Agents)
  _initSkiper47AgentsCarousel();

  // 6. Navigation Bar Scroll State
  const nav = document.getElementById('landing-nav');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      nav?.classList.add('scrolled');
    } else {
      nav?.classList.remove('scrolled');
    }
  }, { passive: true });

  // 7. Dynamic User state in nav
  _updateNavUserArea();
}

/**
 * Hero Node Network Canvas
 * Nodes move ONLY upon user scrolling or moving the mouse.
 */
function _initHeroCanvas() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const nodeLabels = ['Faculty', 'Students', 'Courses', 'Labs', 'Documents', 'CO Attainment', 'PEOs', 'SAR Evidence'];
  const nodes = [];
  const nodeCount = 26;

  for (let i = 0; i < nodeCount; i++) {
    const baseX = Math.random() * width;
    const baseY = Math.random() * height;
    nodes.push({
      baseX,
      baseY,
      x: baseX,
      y: baseY,
      radius: Math.random() * 2.5 + 2,
      label: i < nodeLabels.length ? nodeLabels[i] : null,
      color: i % 2 === 0 ? 'rgba(0, 245, 160, 0.7)' : 'rgba(139, 92, 246, 0.7)',
    });
  }

  let mouse = { x: -1000, y: -1000 };
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  let scrollOffset = window.scrollY;
  window.addEventListener('scroll', () => {
    scrollOffset = window.scrollY;
  }, { passive: true });

  function render() {
    ctx.clearRect(0, 0, width, height);

    // Nodes shift proportionally to scroll position
    const scrollFactor = scrollOffset * 0.35;

    // Draw connecting lines
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 140) {
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = `rgba(0, 245, 160, ${0.16 * (1 - dist / 140)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    // Update & draw nodes
    nodes.forEach((node, i) => {
      // Offset position based on scroll and subtle index variance
      const targetY = node.baseY - (scrollFactor * (0.8 + (i % 5) * 0.1));
      const targetX = node.baseX + Math.sin(scrollOffset * 0.002 + i) * 15;

      node.x += (targetX - node.x) * 0.1;
      node.y += (targetY - node.y) * 0.1;

      // Mouse repulsion
      const mdx = node.x - mouse.x;
      const mdy = node.y - mouse.y;
      const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
      if (mdist < 120 && mdist > 0) {
        node.x += (mdx / mdist) * 3;
        node.y += (mdy / mdist) * 3;
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.shadowBlur = 6;
      ctx.shadowColor = node.color;
      ctx.fill();
      ctx.shadowBlur = 0;

      if (node.label) {
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(240, 244, 255, 0.6)';
        ctx.fillText(node.label, node.x + 8, node.y + 3);
      }
    });

    _canvasAnimId = requestAnimationFrame(render);
  }

  render();
}

/**
 * Skiper 58 TextRoll Engine (Vanilla JS port of React motion.span TextRoll)
 * Staggers characters symmetrically from the center outward (STAGGER = 0.035).
 * Two stacked rows: initial translateY(0%) -> -100%, and incoming translateY(100%) -> 0%.
 */
export function initTextRoll(selector = '.text-roll') {
  const elements = document.querySelectorAll(selector);
  const STAGGER = 0.035;

  elements.forEach((el) => {
    if (el.getAttribute('data-roll-init') === 'true') return;

    const rawText = el.getAttribute('data-text') || el.textContent.trim();
    if (!rawText) return;

    const isCenter = el.getAttribute('data-center') !== 'false';
    const chars = rawText.split('');
    const len = chars.length;

    el.setAttribute('aria-label', rawText);
    el.setAttribute('data-roll-init', 'true');

    // Layer 1: default visible row
    const row = document.createElement('div');
    row.className = 'text-roll-row';
    row.setAttribute('aria-hidden', 'true');

    // Layer 2: incoming overlay row (absolute inset-0)
    const overlay = document.createElement('div');
    overlay.className = 'text-roll-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    chars.forEach((char, i) => {
      const delay = isCenter
        ? STAGGER * Math.abs(i - (len - 1) / 2)
        : STAGGER * i;

      const displayChar = char === ' ' ? '\u00A0' : char;

      const span1 = document.createElement('span');
      span1.className = 'text-roll-char';
      span1.style.transitionDelay = `${delay.toFixed(4)}s`;
      span1.textContent = displayChar;

      const span2 = document.createElement('span');
      span2.className = 'text-roll-char-in';
      span2.style.transitionDelay = `${delay.toFixed(4)}s`;
      span2.textContent = displayChar;

      row.appendChild(span1);
      overlay.appendChild(span2);
    });

    el.innerHTML = '';
    el.appendChild(row);
    el.appendChild(overlay);

    // Keyboard accessibility & touch toggle
    el.setAttribute('tabindex', '0');
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        el.classList.toggle('is-rolled');
      }
    });

    el.addEventListener('pointerenter', () => el.classList.add('is-rolled'));
    el.addEventListener('pointerleave', () => el.classList.remove('is-rolled'));
  });
}

/**
 * Hero Text Reveal on Mount
 * Animates TextRoll elements into view, then executes an introductory wave.
 */
function _initHeroTextReveal() {
  const rolls = document.querySelectorAll('.hero-title .text-roll');
  if (!rolls.length) return;

  gsap.fromTo(
    rolls,
    { opacity: 0, y: 30 },
    {
      opacity: 1,
      y: 0,
      duration: 0.8,
      stagger: 0.2,
      ease: 'power3.out',
      onComplete: () => {
        // Subtle introductory roll sequence on initial load
        setTimeout(() => {
          rolls.forEach((r, idx) => {
            setTimeout(() => {
              r.classList.add('is-rolled');
              setTimeout(() => r.classList.remove('is-rolled'), 650);
            }, idx * 260);
          });
        }, 400);
      },
    }
  );
}

/**
 * Scene 2: The Problem (Chaos cards scatter strictly on scroll scrub)
 */
function _initProblemScene() {
  const problemSection = document.getElementById('problem');
  const chaosCards = document.querySelectorAll('.chaos-card');
  if (!problemSection || !chaosCards.length) return;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: problemSection,
      start: 'top top',
      end: '+=100%',
      pin: true,
      scrub: 0.8,
    },
  });

  tl.from(chaosCards, {
    scale: 0.3,
    opacity: 0,
    stagger: 0.05,
    ease: 'power1.out',
  });

  tl.to(chaosCards, {
    x: (i) => (i % 2 === 0 ? -260 - i * 25 : 260 + i * 25),
    y: (i) => (i < 3 ? -160 - i * 15 : 160 + i * 15),
    rotation: (i) => (i % 2 === 0 ? -25 : 25),
    opacity: 0.35,
    ease: 'power1.inOut',
  }, 0.5);
}

/**
 * Scene 3: The Loop (Pinned Horizontal Scroll scrubbed)
 */
function _initLoopHorizontalScroll() {
  const loopSection = document.getElementById('loop-section');
  const wrapper = document.querySelector('.loop-horizontal-wrapper');
  if (!loopSection || !wrapper) return;

  const getScrollDistance = () => {
    return Math.max(0, wrapper.scrollWidth - window.innerWidth + 120);
  };

  gsap.to(wrapper, {
    x: () => -getScrollDistance(),
    ease: 'none',
    scrollTrigger: {
      trigger: loopSection,
      pin: true,
      scrub: 0.8,
      start: 'top top',
      end: () => `+=${getScrollDistance()}`,
      invalidateOnRefresh: true,
    },
  });
}

/**
 * Scene 4: Digital Twin (Nodes snap into center hub strictly on scroll)
 */
function _initDigitalTwinSnap() {
  const twinSection = document.getElementById('digital-twin-reveal');
  const nodes = document.querySelectorAll('.twin-node');
  const hub = document.querySelector('.twin-center-hub');
  if (!twinSection || !nodes.length) return;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: twinSection,
      start: 'top 80%',
      end: 'center 45%',
      scrub: 0.8,
    },
  });

  tl.from(nodes, {
    x: () => (Math.random() - 0.5) * 500,
    y: () => (Math.random() - 0.5) * 350,
    opacity: 0,
    scale: 0.6,
    stagger: 0.06,
    ease: 'power2.out',
  });

  tl.from(hub, {
    scale: 0.85,
    boxShadow: '0 0 0 rgba(0, 245, 160, 0)',
    duration: 0.4,
  }, '-=0.2');
}

/**
 * Scene 5: Compliance Engine (Rows and status chip flip strictly on scroll scrub)
 */
function _initComplianceStripAnimation() {
  const strip = document.getElementById('compliance-demo');
  const rows = document.querySelectorAll('.strip-row');
  const targetChip = document.getElementById('strip-chip-c5');
  if (!strip || !rows.length) return;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: strip,
      start: 'top 75%',
      end: 'center 50%',
      scrub: 0.8,
      onUpdate(self) {
        if (targetChip) {
          if (self.progress > 0.5) {
            targetChip.className = 'chip chip--fail';
            targetChip.textContent = 'FAIL';
          } else {
            targetChip.className = 'chip chip--warning';
            targetChip.textContent = 'CHECKING';
          }
        }
      }
    },
  });

  tl.from(rows, {
    y: 25,
    opacity: 0,
    stagger: 0.12,
    ease: 'power2.out',
  });
}

/**
 * Scene 8: Virtual NBA Inspection Gauge (Progress directly tied to scroll scrub)
 */
function _initVirtualInspectionGauge() {
  const gaugeSection = document.getElementById('virtual-inspection');
  const circleVal = document.getElementById('gauge-circle-val');
  const pctText = document.getElementById('gauge-pct-text');
  if (!gaugeSection || !circleVal || !pctText) return;

  // Circumference = 628. Target 87% = 628 - (628 * 0.87) = ~81.
  gsap.fromTo(
    circleVal,
    { strokeDashoffset: 628 },
    {
      strokeDashoffset: 81,
      ease: 'none',
      scrollTrigger: {
        trigger: gaugeSection,
        start: 'top 75%',
        end: 'center 45%',
        scrub: 0.8,
        onUpdate(self) {
          const current = Math.round(self.progress * 87);
          pctText.textContent = `${current}%`;
        },
      },
    }
  );
}

/**
 * Update top nav with user profile or login/register buttons
 */
function _updateNavUserArea() {
  const userActions = document.getElementById('nav-user-actions');
  if (!userActions) return;

  if (store.isLoggedIn()) {
    userActions.innerHTML = `
      <a href="dashboards/c3.html" class="btn btn--primary btn--sm" data-magnetic>
        Go to Dashboard →
      </a>
    `;
  } else {
    userActions.innerHTML = `
      <a href="login.html" class="btn btn--ghost btn--sm">Sign In</a>
      <a href="register.html" class="btn btn--primary btn--sm" data-magnetic>Get Started</a>
    `;
  }
}

/**
 * Skiper 47 Perspective Coverflow Carousel (8 Advisory Agents)
 * Ported from https://skiper-ui.com/registry/skiper47.json
 */
function _initSkiper47AgentsCarousel() {
  const container = document.getElementById('skiper47-agents-swiper');
  if (!container || typeof Swiper === 'undefined') return;

  new Swiper('#skiper47-agents-swiper', {
    effect: 'coverflow',
    grabCursor: true,
    centeredSlides: true,
    loop: true,
    slidesPerView: 'auto',
    spaceBetween: 28,
    speed: 1100,
    autoplay: {
      delay: 1100,
      disableOnInteraction: false,
      pauseOnMouseEnter: false,
    },
    coverflowEffect: {
      rotate: 0,
      slideShadows: false,
      stretch: 0,
      depth: 100,
      modifier: 2.5,
    },
    pagination: {
      el: '.skiper47-pagination',
      clickable: true,
    },
    navigation: {
      nextEl: '.skiper47-next',
      prevEl: '.skiper47-prev',
    },
  });
}

/**
 * Cleanup on page unload
 */
export function destroyLandingPage() {
  if (_canvasAnimId) cancelAnimationFrame(_canvasAnimId);
  destroyCriteriaCarousel();
  if (_lenis) _lenis.destroy();
}
