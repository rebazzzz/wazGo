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
