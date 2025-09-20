// === Mobile menu toggle ===
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navMenu = document.querySelector('.nav-menu');

if (mobileMenuBtn && navMenu) {
    mobileMenuBtn.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });
}

// === Smooth scrolling for anchors (only on this page) ===
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();

        const targetId = this.getAttribute('href');
        if (!targetId || targetId === '#') return;

        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            const headerHeight = document.querySelector('header').offsetHeight;
            const elementPosition = targetElement.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerHeight;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }

        if (navMenu) navMenu.classList.remove('active');
    });
});

// === Contact form submission ===
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', e => {
        e.preventDefault();
        alert('Tack för ditt meddelande! Vi återkommer så snart som möjligt.');
        contactForm.reset();
    });
}

// === Industry select → show "other" ===
const industrySelect = document.getElementById('industry');
const otherIndustryGroup = document.getElementById('other-industry-group');

if (industrySelect && otherIndustryGroup) {
    industrySelect.addEventListener('change', () => {
        if (industrySelect.value === 'other') {
            otherIndustryGroup.style.display = 'block';
        } else {
            otherIndustryGroup.style.display = 'none';
            document.getElementById('other-industry').value = '';
        }
    });
}

// === Footer links → redirect to index.html with selected industry ===
document.querySelectorAll('footer a[data-industry]').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        const industry = link.getAttribute('data-industry');
        if (!industry) return;

        // Spara valt industry i localStorage
        localStorage.setItem('selectedIndustry', industry);

        // Gå till index.html
        window.location.href = 'index.html#industries';
    });
});

// Smooth scroll för Process-sektionen
document.querySelectorAll('a[href^="#process"], a[href^="#step"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href').substring(1);
        const target = document.getElementById(targetId);
        if(target){
            const headerHeight = document.querySelector('header').offsetHeight;
            const offsetTop = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
            window.scrollTo({ top: offsetTop, behavior: 'smooth' });
        }
    });
});

// frontend kontakt.js (sample)

if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(contactForm);
    // if your backend uses cookie-based CSRF token, read cookie (res.locals.csrfToken available when serving page)
    // If you render the contact page from backend you can inject csrf token; for static: fetch from server root first.
    // Example: fetch csrf token from server root
    try {
      const root = await fetch('/');
      const rootJson = await root.json();
      const csrfToken = rootJson.csrfToken; // server returns token if route set up so
      if (csrfToken) formData.append('_csrf', csrfToken);
    } catch (err) {
      // ignore
    }

    const res = await fetch('/api/contact', {
      method: 'POST',
      body: formData
    });

    const json = await res.json();
    if (json.success) {
      alert(json.message || 'Tack!');
      contactForm.reset();
    } else {
      alert(json.error || 'Något gick fel.');
    }
  });
}
