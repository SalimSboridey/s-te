/**
 * YALOVA HOMES - Modern Real Estate Website
 * Interactive JavaScript for animations and user experience
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize all modules
  initScrollReveal();
  initNavbarScroll();
  initMobileMenu();
  initTiltEffect();
  initSmoothScroll();
  initPropertyCards();
  initHeroParticles();
});

/**
 * Scroll Reveal Animation
 * Elements fade in as they enter viewport
 */
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.scroll-reveal, .fade-in-up');
  
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Unobserve after revealing to avoid re-animation
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });
  
  revealElements.forEach(el => revealObserver.observe(el));
}

/**
 * Navbar scroll effect
 * Adds shadow on scroll
 */
function initNavbarScroll() {
  const navbar = document.querySelector('.navbar');
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
}

/**
 * Mobile menu toggle
 */
function initMobileMenu() {
  const mobileBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');
  
  if (!mobileBtn || !navLinks) return;
  
  mobileBtn.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    mobileBtn.classList.toggle('open');
  });
  
  // Close menu when clicking a link
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('active');
      mobileBtn.classList.remove('open');
    });
  });
}

/**
 * 3D Tilt Effect for Property Cards
 */
function initTiltEffect() {
  const tiltCards = document.querySelectorAll('[data-tilt]');
  
  tiltCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = (y - centerY) / 10;
      const rotateY = (centerX - x) / 10;
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
    });
  });
}

/**
 * Smooth scroll for anchor links
 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      
      e.preventDefault();
      const target = document.querySelector(href);
      
      if (target) {
        const offsetTop = target.offsetTop - 80; // Account for fixed navbar
        window.scrollTo({
          top: offsetTop,
          behavior: 'smooth'
        });
      }
    });
  });
}

/**
 * Property cards interaction
 */
function initPropertyCards() {
  const propertyButtons = document.querySelectorAll('.property-card .btn-secondary');
  
  propertyButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.property-card');
      const title = card.querySelector('.card-title')?.textContent || 'Недвижимость';
      const price = card.querySelector('.card-price')?.textContent || '';
      
      // Create simple modal or redirect to contact form
      showInquiryModal(title, price);
    });
  });
}

/**
 * Show inquiry modal
 */
function showInquiryModal(title, price) {
  // Check if modal already exists
  let modal = document.querySelector('.inquiry-modal');
  
  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'inquiry-modal';
    modal.innerHTML = `
      <div class="inquiry-modal-content">
        <button class="inquiry-modal-close">&times;</button>
        <h3>Заинтересовала эта недвижимость?</h3>
        <p class="inquiry-property-title"></p>
        <p class="inquiry-property-price"></p>
        <form class="inquiry-form">
          <input type="text" placeholder="Ваше имя" required />
          <input type="tel" placeholder="Телефон" required />
          <input type="email" placeholder="Email" />
          <textarea placeholder="Сообщение" rows="4"></textarea>
          <button type="submit" class="btn btn-primary">Отправить заявку</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
    
    // Add modal styles
    const style = document.createElement('style');
    style.textContent = `
      .inquiry-modal {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        display: none;
        place-items: center;
        z-index: 2000;
        padding: 1rem;
      }
      .inquiry-modal.active {
        display: grid;
      }
      .inquiry-modal-content {
        background: white;
        border-radius: 24px;
        padding: 2rem;
        max-width: 500px;
        width: 100%;
        position: relative;
        animation: modalSlideIn 0.3s ease;
      }
      @keyframes modalSlideIn {
        from {
          opacity: 0;
          transform: translateY(-30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .inquiry-modal-close {
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: none;
        border: none;
        font-size: 2rem;
        cursor: pointer;
        color: #6B7280;
        line-height: 1;
      }
      .inquiry-property-title {
        font-size: 1.2rem;
        font-weight: 600;
        color: #006D77;
        margin: 1rem 0 0.5rem;
      }
      .inquiry-property-price {
        font-size: 1.5rem;
        font-weight: 700;
        color: #D4A373;
        margin-bottom: 1.5rem;
      }
      .inquiry-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .inquiry-form input,
      .inquiry-form textarea {
        padding: 1rem;
        border: 1px solid #E5E7EB;
        border-radius: 12px;
        font-family: inherit;
        font-size: 1rem;
        transition: border-color 0.2s;
      }
      .inquiry-form input:focus,
      .inquiry-form textarea:focus {
        outline: none;
        border-color: #2E86AB;
      }
    `;
    document.head.appendChild(style);
    
    // Close button functionality
    modal.querySelector('.inquiry-modal-close').addEventListener('click', () => {
      modal.classList.remove('active');
    });
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
    
    // Form submission
    modal.querySelector('.inquiry-form').addEventListener('submit', (e) => {
      e.preventDefault();
      alert('Спасибо за заявку! Мы свяжемся с вами в ближайшее время.');
      modal.classList.remove('active');
    });
  }
  
  // Update modal content
  modal.querySelector('.inquiry-property-title').textContent = title;
  modal.querySelector('.inquiry-property-price').textContent = price;
  
  // Show modal
  modal.classList.add('active');
}

/**
 * Hero particles animation
 */
function initHeroParticles() {
  const particlesContainer = document.getElementById('heroParticles');
  if (!particlesContainer) return;
  
  // Create floating particles
  for (let i = 0; i < 20; i++) {
    const particle = document.createElement('div');
    particle.style.cssText = `
      position: absolute;
      width: ${Math.random() * 6 + 2}px;
      height: ${Math.random() * 6 + 2}px;
      background: rgba(255, 255, 255, ${Math.random() * 0.5 + 0.3});
      border-radius: 50%;
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      animation: floatParticle ${Math.random() * 10 + 10}s linear infinite;
      animation-delay: ${Math.random() * 5}s;
      pointer-events: none;
    `;
    particlesContainer.appendChild(particle);
  }
  
  // Add particle animation keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes floatParticle {
      0%, 100% {
        transform: translate(0, 0) scale(1);
        opacity: 0;
      }
      10% {
        opacity: 1;
      }
      90% {
        opacity: 1;
      }
      100% {
        transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px) scale(0);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Lazy loading images
 */
if ('IntersectionObserver' in window) {
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src || img.src;
        img.classList.add('loaded');
        imageObserver.unobserve(img);
      }
    });
  });
  
  document.querySelectorAll('img[loading="lazy"]').forEach(img => {
    imageObserver.observe(img);
  });
}

/**
 * Parallax effect on scroll
 */
window.addEventListener('scroll', () => {
  const scrolled = window.pageYOffset;
  const parallaxElements = document.querySelectorAll('.hero-bg, .hero-particles');
  
  parallaxElements.forEach(el => {
    const speed = 0.5;
    el.style.transform = `translateY(${scrolled * speed}px)`;
  });
}, { passive: true });

/**
 * Counter animation for stats
 */
function animateCounter(element, target, duration = 2000) {
  const start = 0;
  const increment = target / (duration / 16);
  let current = start;
  
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    element.textContent = Math.floor(current).toLocaleString('ru-RU');
  }, 16);
}

// Animate stats when visible
const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const statValues = entry.target.querySelectorAll('.stat-value');
      statValues.forEach(stat => {
        const text = stat.textContent;
        const number = parseFloat(text.replace(/[^0-9.]/g, ''));
        if (!isNaN(number)) {
          animateCounter(stat, number);
        }
      });
      statsObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

const heroStats = document.querySelector('.hero-stats');
if (heroStats) {
  statsObserver.observe(heroStats);
}

console.log('🏠 Yalova Homes website initialized successfully!');
