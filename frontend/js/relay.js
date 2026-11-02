/**
 * js/relay.js — GetLayers "Relay" Interactive Template Mechanics
 * Implements:
 *  1. Lime Ring Page Count-In & Logo Fold
 *  2. Continuous Vertical Stream of Light
 *  3. Tilting 3D Glass Window with Live Automated Flow in Hero
 *  4. Logo Plate Expand & Fold Mid-Page
 *  5. Optical Rack-Focus Arrival
 *  6. Draggable Interactive Precision Meter
 */

document.addEventListener('DOMContentLoaded', () => {
  initRelayPreloader();
  initLightStream();
  initHeroTiltWindow();
  initLogoPlate();
  initPrecisionRackFocus();
  initPrecisionMeter();
});

// ══════════════════════════════════════════════════════════════
// 1. LIME RING PAGE COUNT-IN & FOLD INTO LOGO
// ══════════════════════════════════════════════════════════════
function initRelayPreloader() {
  const preloader = document.getElementById('relay-preloader');
  const counterEl = document.getElementById('relay-counter');
  const ringProgress = document.getElementById('relay-ring-progress');
  const ringWrap = document.querySelector('.relay-ring-wrap');
  const logoBrand = document.querySelector('.landing-nav-brand');

  if (!preloader || !counterEl || !ringProgress) return;

  const totalCircumference = 377;
  let count = 0;
  const duration = 1200; // ms
  const startTime = performance.now();

  function updateCount(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    count = Math.round(eased * 100);

    counterEl.textContent = String(count).padStart(2, '0') + '%';
    const offset = totalCircumference - (totalCircumference * (count / 100));
    ringProgress.style.strokeDashoffset = offset;

    if (progress < 1) {
      requestAnimationFrame(updateCount);
    } else {
      // Complete count-in, fold into logo
      foldRingIntoLogo();
    }
  }

  requestAnimationFrame(updateCount);

  function foldRingIntoLogo() {
    if (logoBrand && typeof gsap !== 'undefined') {
      const logoRect = logoBrand.getBoundingClientRect();
      const ringRect = ringWrap.getBoundingClientRect();

      const deltaX = (logoRect.left + logoRect.width / 4) - (ringRect.left + ringRect.width / 2);
      const deltaY = (logoRect.top + logoRect.height / 2) - (ringRect.top + ringRect.height / 2);

      gsap.timeline({
        onComplete: () => {
          preloader.classList.add('done');
          setTimeout(() => preloader.remove(), 700);
        }
      })
      .to(counterEl, { opacity: 0, scale: 0.5, duration: 0.35, ease: 'power2.in' })
      .to(ringWrap, {
        x: deltaX,
        y: deltaY,
        scale: 0.26,
        opacity: 0,
        duration: 0.65,
        ease: 'power3.inOut'
      }, '-=0.15')
      .to(preloader, { opacity: 0, duration: 0.4 }, '-=0.25')
      .fromTo(logoBrand, 
        { scale: 0.9, filter: 'drop-shadow(0 0 20px #CCFF00)' }, 
        { scale: 1, filter: 'drop-shadow(0 0 0px transparent)', duration: 0.6, ease: 'elastic.out(1, 0.4)' },
        '-=0.3'
      );
    } else {
      setTimeout(() => {
        preloader.classList.add('done');
      }, 200);
    }
  }
}

// ══════════════════════════════════════════════════════════════
// 2. CONTINUOUS STREAM OF LIGHT
// ══════════════════════════════════════════════════════════════
function initLightStream() {
  const pulse = document.getElementById('relay-light-pulse');
  if (!pulse) return;

  function onScroll() {
    const scrollY = window.scrollY || window.pageYOffset;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = Math.min(Math.max(scrollY / docHeight, 0), 1);
    const streamHeight = window.innerHeight - 80;
    
    pulse.style.transform = `translateY(${progress * streamHeight}px)`;
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ══════════════════════════════════════════════════════════════
// 3. 3D TILTING GLASS WINDOW WITH LIVE WORKFLOW
// ══════════════════════════════════════════════════════════════
function initHeroTiltWindow() {
  const card = document.getElementById('relay-glass-window');
  if (!card) return;

  const maxTilt = 8; // degrees

  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -maxTilt;
    const rotateY = ((x - centerX) / centerX) * maxTilt;

    card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(10px)`;
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
  });

  // Cycle through live automated flow steps
  const steps = document.querySelectorAll('.relay-flow-step');
  if (!steps.length) return;

  let currentStep = 0;
  setInterval(() => {
    steps.forEach((s, idx) => {
      s.classList.toggle('active', idx === currentStep);
    });

    // Randomize live latency slightly for real-time mechanical feeling
    const latencyEl = document.getElementById('relay-live-latency');
    if (latencyEl) {
      latencyEl.textContent = (18 + Math.floor(Math.random() * 8)) + 'ms';
    }

    currentStep = (currentStep + 1) % steps.length;
  }, 2200);
}

// ══════════════════════════════════════════════════════════════
// 4. LOGO PLATE (OPENS AND FOLDS BACK MID-PAGE)
// ══════════════════════════════════════════════════════════════
function initLogoPlate() {
  const plate = document.getElementById('relay-logo-plate');
  if (!plate) return;

  function checkScroll() {
    const scrollY = window.scrollY || window.pageYOffset;
    // Visible between 450px (after hero title) and 2400px (before footer)
    if (scrollY > 450 && scrollY < 2500) {
      plate.classList.add('visible');
    } else {
      plate.classList.remove('visible');
    }
  }

  window.addEventListener('scroll', checkScroll, { passive: true });
  checkScroll();
}

// ══════════════════════════════════════════════════════════════
// 5. OPTICAL RACK-FOCUS ARRIVAL
// ══════════════════════════════════════════════════════════════
function initPrecisionRackFocus() {
  const sections = document.querySelectorAll('.relay-precision-section');
  if (!sections.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.remove('out-of-focus');
        entry.target.classList.add('settled');
      } else if (entry.boundingClientRect.top > window.innerHeight) {
        entry.target.classList.add('out-of-focus');
        entry.target.classList.remove('settled');
      }
    });
  }, {
    threshold: 0.18,
    rootMargin: '0px 0px -50px 0px'
  });

  sections.forEach(sec => {
    sec.classList.add('out-of-focus');
    observer.observe(sec);
  });
}

// ══════════════════════════════════════════════════════════════
// 6. DRAGGABLE PRECISION COMPLIANCE METER
// ══════════════════════════════════════════════════════════════
function initPrecisionMeter() {
  const slider = document.getElementById('relay-meter-slider');
  const fill = document.getElementById('relay-range-fill');
  const scoreVal = document.getElementById('relay-meter-score-val');
  const statusVal = document.getElementById('relay-meter-status-val');
  const sfrVal = document.getElementById('relay-meter-sfr-val');

  if (!slider || !fill || !scoreVal) return;

  function updateMeter() {
    const val = parseFloat(slider.value); // 0 to 100
    fill.style.width = `${val}%`;

    // Simulate Tier-I SFR compliance formula based on slider %
    // SFR ratio ranges from 28.0:1 down to 14.0:1 as readiness increases
    const simulatedSFR = (28.0 - (val / 100) * 14.0).toFixed(1);
    if (sfrVal) sfrVal.textContent = `${simulatedSFR}:1`;

    let score = 0;
    let statusText = 'FAIL';
    let statusColor = 'var(--fail)';

    if (val >= 75) {
      score = Math.round(25 + ((val - 75) / 25) * 5); // 25 to 30 marks
      statusText = 'PASS (Tier I Compliant)';
      statusColor = 'var(--lime, #CCFF00)';
    } else if (val >= 45) {
      score = Math.round(15 + ((val - 45) / 30) * 10); // 15 to 25 marks
      statusText = 'WARNING (Review Required)';
      statusColor = 'var(--warning)';
    } else {
      score = Math.round((val / 45) * 14); // 0 to 14 marks
      statusText = 'FAIL (Deficient Ratio)';
      statusColor = 'var(--fail)';
    }

    scoreVal.textContent = `${score} / 30`;
    if (statusVal) {
      statusVal.textContent = statusText;
      statusVal.style.color = statusColor;
    }
  }

  slider.addEventListener('input', updateMeter);
  updateMeter();
}

