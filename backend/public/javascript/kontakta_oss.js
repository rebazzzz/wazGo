// === Mobile menu toggle ===
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navMenu = document.querySelector('.nav-menu');

if (mobileMenuBtn && navMenu) {
    mobileMenuBtn.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });
}

// === Smooth scrolling for anchors ===
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

// === Contact form submission with professional message ===
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', async e => {
        e.preventDefault();

        const formMessage = document.getElementById('form-message');
        formMessage.classList.remove('success', 'error', 'show');

        const formData = new FormData(contactForm);

        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                body: formData
            });

            const json = await res.json();

            if (json.success) {
                formMessage.textContent = json.message || 'Tack! Vi återkommer snart.';
                formMessage.classList.add('success', 'show');
                contactForm.reset();
            } else {
                formMessage.textContent = json.error || 'Något gick fel, försök igen.';
                formMessage.classList.add('error', 'show');
            }

            // Dölj meddelandet efter 5 sekunder
            setTimeout(() => {
                formMessage.classList.remove('show');
            }, 5000);

        } catch (err) {
            console.error("Kontaktformulärfel:", err);
            formMessage.textContent = 'Något gick fel, försök igen.';
            formMessage.classList.add('error', 'show');
            setTimeout(() => {
                formMessage.classList.remove('show');
            }, 5000);
        }
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

        localStorage.setItem('selectedIndustry', industry);
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
