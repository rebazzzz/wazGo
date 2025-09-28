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
document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');
    const formMessage = document.getElementById('form-message');
    const industrySelect = document.getElementById('industry');
    const otherIndustryGroup = document.getElementById('other-industry-group');
    const otherIndustryInput = document.getElementById('other-industry');
    let hideTimeout;

    if (contactForm) {
        contactForm.addEventListener('submit', async e => {
            e.preventDefault();

            formMessage.classList.remove('success', 'error', 'show');
            if (hideTimeout) clearTimeout(hideTimeout);

            // Hämta värden
            const formData = {
                name: document.getElementById('name').value.trim(),
                email: document.getElementById('email').value.trim(),
                company: document.getElementById('company').value.trim(),
                industry: document.getElementById('industry').value,
                otherIndustry: document.getElementById('other-industry').value.trim(),
                message: document.getElementById('message').value.trim()
            };

            try {
                const res = await fetch('/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                const json = await res.json();

                if (json.success) {
                    formMessage.textContent = json.message || 'Tack! Vi återkommer snart.';
                    formMessage.classList.add('success', 'show');
                    contactForm.reset();
                    if (otherIndustryGroup) otherIndustryGroup.style.display = 'none';
                } else {
                    formMessage.textContent = json.error || 'Något gick fel, försök igen.';
                    formMessage.classList.add('error', 'show');
                }

                formMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });

                hideTimeout = setTimeout(() => {
                    formMessage.classList.remove('show');
                }, 5000);

            } catch (err) {
                console.error("Kontaktformulärfel:", err);
                formMessage.textContent = 'Något gick fel, försök igen.';
                formMessage.classList.add('error', 'show');
                formMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });

                hideTimeout = setTimeout(() => {
                    formMessage.classList.remove('show');
                }, 5000);
            }
        });
    }

    // Industry select → show "other"
    if (industrySelect && otherIndustryGroup) {
        industrySelect.addEventListener('change', () => {
            if (industrySelect.value === 'other') {
                otherIndustryGroup.style.display = 'block';
            } else {
                otherIndustryGroup.style.display = 'none';
                if (otherIndustryInput) otherIndustryInput.value = '';
            }
        });
    }
});

// === FAQ toggling + scroll ===
const faqQuestions = document.querySelectorAll('.faq-question');
faqQuestions.forEach(question => {
    question.addEventListener('click', () => {
        const answer = question.nextElementSibling;

        // Stäng alla svar först
        document.querySelectorAll('.faq-answer').forEach(a => a.style.display = 'none');

        // Öppna/stäng klickat svar
        answer.style.display = answer.style.display === 'block' ? 'none' : 'block';
    });
});

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
