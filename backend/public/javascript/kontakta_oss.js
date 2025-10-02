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
document.addEventListener('DOMContentLoaded', async () => {
    // Fetch and set reCAPTCHA site key with timeout
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout

        const response = await fetch('/api/recaptcha-site-key', {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const recaptchaElement = document.querySelector('.g-recaptcha');
        if (recaptchaElement && data.siteKey) {
            recaptchaElement.setAttribute('data-sitekey', data.siteKey);
            // If reCAPTCHA is already loaded, render it
            if (typeof grecaptcha !== 'undefined' && grecaptcha.render) {
                grecaptcha.render(recaptchaElement);
            }
        } else {
            console.warn('reCAPTCHA site key not available');
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('reCAPTCHA site key fetch timed out after 5 seconds');
        } else {
            console.error('Failed to load reCAPTCHA site key:', error);
        }
        // Gracefully handle error - CAPTCHA will not be available, form submission will show appropriate error
    }

    const contactForm = document.getElementById('contactForm');
    const formMessage = document.getElementById('form-message');
    const industrySelect = document.getElementById('industry');
    const otherIndustryGroup = document.getElementById('other-industry-group');
    const otherIndustryInput = document.getElementById('other-industry');
    let hideTimeout;

    if (contactForm) {
        contactForm.addEventListener('submit', async e => {
            e.preventDefault();

            // Inaktivera submit-knappen för att förhindra multipla submissioner
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Skickar...';
            }

            formMessage.classList.remove('success', 'error', 'show');
            if (hideTimeout) clearTimeout(hideTimeout);

            // Hämta värden
            const formData = {
                name: document.getElementById('name').value.trim(),
                email: document.getElementById('email').value.trim(),
                company: document.getElementById('company').value.trim(),
                industry: document.getElementById('industry').value,
                otherIndustry: document.getElementById('other-industry').value.trim(),
                message: document.getElementById('message').value.trim(),
                'g-recaptcha-response': grecaptcha.getResponse()
            };

            // Client-side validation
            if (!formData.name) {
                formMessage.textContent = 'Namn är obligatoriskt.';
                formMessage.classList.add('error', 'show');
                formMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Skicka';
                }
                return;
            }
            if (formData.name.length < 2 || formData.name.length > 100) {
                formMessage.textContent = 'Namn måste vara mellan 2 och 100 tecken.';
                formMessage.classList.add('error', 'show');
                formMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Skicka';
                }
                return;
            }
            if (!formData.email) {
                formMessage.textContent = 'E-post är obligatoriskt.';
                formMessage.classList.add('error', 'show');
                formMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Skicka';
                }
                return;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                formMessage.textContent = 'Ogiltig e-postadress.';
                formMessage.classList.add('error', 'show');
                formMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Skicka';
                }
                return;
            }
            if (!formData.company) {
                formMessage.textContent = 'Företag är obligatoriskt.';
                formMessage.classList.add('error', 'show');
                formMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Skicka';
                }
                return;
            }
            if (!formData.message) {
                formMessage.textContent = 'Meddelande är obligatoriskt.';
                formMessage.classList.add('error', 'show');
                formMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Skicka';
                }
                return;
            }
            if (formData.message.length < 10 || formData.message.length > 1000) {
                formMessage.textContent = 'Meddelande måste vara mellan 10 och 1000 tecken.';
                formMessage.classList.add('error', 'show');
                formMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Skicka';
                }
                return;
            }
            if (formData.industry === 'other' && !formData.otherIndustry) {
                formMessage.textContent = 'Ange bransch är obligatoriskt när "Annan" är vald.';
                formMessage.classList.add('error', 'show');
                formMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Skicka';
                }
                return;
            }
            if (!formData['g-recaptcha-response']) {
                formMessage.textContent = 'CAPTCHA-verifiering krävs.';
                formMessage.classList.add('error', 'show');
                formMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Skicka';
                }
                return;
            }



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
                    grecaptcha.reset();
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
            } finally {
                // Återaktivera submit-knappen
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Skicka';
                }
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
