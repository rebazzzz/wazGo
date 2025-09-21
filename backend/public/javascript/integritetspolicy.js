// integritetspolicy.js

// === Mobile menu toggle ===
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navMenu = document.querySelector('.nav-menu');

if (mobileMenuBtn && navMenu) {
    mobileMenuBtn.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });
}

// === Smooth scrolling for anchor links ===
// document.querySelectorAll('a[href^="#"]').forEach(anchor => {
//     anchor.addEventListener('click', function(e) {
//         e.preventDefault();

//         const targetId = this.getAttribute('href');
//         if (targetId === '#') return;

//         const targetElement = document.querySelector(targetId);
//         if (targetElement) {
//             const headerHeight = document.querySelector('header').offsetHeight;
//             const elementPosition = targetElement.getBoundingClientRect().top;
//             const offsetPosition = elementPosition + window.pageYOffset - headerHeight;

//             window.scrollTo({
//                 top: offsetPosition,
//                 behavior: 'smooth'
//             });
//         }

//         if (navMenu) navMenu.classList.remove('active');
//     });
// });

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

// === FAQ toggling + scroll ===
const faqQuestions = document.querySelectorAll('.faq-question');

faqQuestions.forEach(question => {
    question.addEventListener('click', () => {
        const answer = question.nextElementSibling;
        const targetId = question.dataset.target;
        const targetSection = document.getElementById(targetId);

        // Stäng alla svar först
        document.querySelectorAll('.faq-answer').forEach(a => a.style.display = 'none');

        // Öppna/ stäng klickat svar
        answer.style.display = answer.style.display === 'block' ? 'none' : 'block';

        // Scrolla smidigt till sektionen
        if(targetSection){
            const headerHeight = document.querySelector('header').offsetHeight;
            const elementPosition = targetSection.getBoundingClientRect().top + window.pageYOffset - headerHeight;
            window.scrollTo({ top: elementPosition, behavior: 'smooth' });
        }
    });
});
