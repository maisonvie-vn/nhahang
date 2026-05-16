/* ============================================
   MAISON VIE — Interactions & Animations
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // --- Header scroll effect ---
  const header = document.querySelector('.header');
  const isHomePage = document.getElementById('hero');

  const handleScroll = () => {
    // If on home page, handle scroll transparency
    if (isHomePage) {
      if (window.scrollY > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    } else {
      // On sub-pages, header is always scrolled/solid
      header.classList.add('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll(); // Initial check

  // --- Mobile menu toggle ---
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');

  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      menuToggle.classList.toggle('active');
      // Add animation classes to menu bars
      const spans = menuToggle.querySelectorAll('span');
      if (menuToggle.classList.contains('active')) {
        spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
      } else {
        spans[0].style.transform = 'none';
        spans[1].style.opacity = '1';
        spans[2].style.transform = 'none';
      }
    });

    // Close mobile menu when a link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        menuToggle.classList.remove('active');
      });
    });
  }

  // --- Scroll reveal animations ---
  const revealElements = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -20px 0px'
  });

  revealElements.forEach(el => revealObserver.observe(el));

  // --- Parallax hero background ---
  const heroBg = document.querySelector('.hero-bg');
  if (heroBg) {
    window.addEventListener('scroll', () => {
      const scrolled = window.scrollY;
      if (scrolled < window.innerHeight) {
        heroBg.style.transform = `scale(1.05) translateY(${scrolled * 0.2}px)`;
      }
    }, { passive: true });
  }

  // --- Smooth scroll for navigation ---
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === "#") return;

      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const headerHeight = header.offsetHeight;
        const targetPos = target.getBoundingClientRect().top + window.scrollY - headerHeight;
        window.scrollTo({ top: targetPos, behavior: 'smooth' });
      }
    });
  });

  // --- Menu Page Filtering ---
  const menuNavBtns = document.querySelectorAll('.menu-nav-btn');
  const menuCategories = document.querySelectorAll('.menu-category');

  if (menuNavBtns.length > 0) {
    menuNavBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');

        // Update buttons
        menuNavBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Scroll to category
        const categoryEl = document.getElementById(target);
        if (categoryEl) {
          const headerHeight = header.offsetHeight;
          const pos = categoryEl.getBoundingClientRect().top + window.scrollY - headerHeight - 40;
          window.scrollTo({ top: pos, behavior: 'smooth' });
        }
      });
    });
  }

  // --- Form Handling (Reservation & Contact) ---
  const forms = [document.getElementById('reservationForm'), document.getElementById('contactForm')];
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyzgdbg5NYlK6eMOgnUXmaKIwxQHV48KGdL4PoZKe2CAjsWYA2Kgw1F0YR62f3N8x59/exec';

  forms.forEach(form => {
    if (!form) return;

    // Date restriction for reservation
    if (form.id === 'reservationForm') {
      const dateInput = document.getElementById('date');
      if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);
      }
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      
      btn.textContent = 'Envoi en cours...';
      btn.disabled = true;

      const formData = new FormData(form);
      
      fetch(SCRIPT_URL, { 
        method: 'POST', 
        body: formData 
      })
      .then(response => {
        // Redirect to success page
        window.location.href = 'success.html';
      })
      .catch(error => {
        console.error('Error!', error.message);
        btn.textContent = 'Erreur! Réessayez';
        btn.style.background = '#722f37';
        btn.disabled = false;
        
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.background = '';
        }, 3000);
      });
    });
  });

  // --- Initial Hero Animation ---
  const heroContent = document.querySelector('.hero-content');
  if (heroContent) {
    heroContent.style.opacity = '0';
    heroContent.style.transform = 'translateY(30px)';
    heroContent.style.transition = 'opacity 1.2s cubic-bezier(0.2, 0, 0.2, 1), transform 1.2s cubic-bezier(0.2, 0, 0.2, 1)';

    setTimeout(() => {
      heroContent.style.opacity = '1';
      heroContent.style.transform = 'translateY(0)';
    }, 200);
  }

});
