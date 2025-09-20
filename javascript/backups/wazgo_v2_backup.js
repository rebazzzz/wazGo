// Mobile menu toggle
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navMenu = document.querySelector('.nav-menu');

mobileMenuBtn.addEventListener('click', () => {
    navMenu.classList.toggle('active');
});

// Industry tabs
const industryTabs = document.querySelectorAll('.industry-tab');
const industryContents = document.querySelectorAll('.industry-content');

industryTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const industry = tab.getAttribute('data-industry');

        // Update tabs
        industryTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update content
        industryContents.forEach(content => content.classList.remove('active'));
        document.getElementById(`${industry}-content`).classList.add('active');
    });
});

// Footer links → activate tabs or services
document.querySelectorAll('footer a').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();

        const industry = link.getAttribute('data-industry'); // Branscher
        const targetId = link.getAttribute('href'); // Tjänster eller anchors
        const header = document.querySelector('header'); // Fixed header
        const headerHeight = header ? header.offsetHeight : 0;

        // Bransch-länk
        if(industry){
            industryTabs.forEach(tab => tab.classList.remove('active'));
            industryContents.forEach(content => content.classList.remove('active'));

            const activeTab = document.querySelector(`.industry-tab[data-industry="${industry}"]`);
            const activeContent = document.getElementById(industry + '-content');

            if(activeTab && activeContent){
                activeTab.classList.add('active');
                activeContent.classList.add('active');
            }

            document.getElementById('industries').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } 
        // Tjänst-länk (ej "Andra tjänster")
        else if(targetId && targetId.startsWith('#') && targetId !== '#services'){
            const targetElement = document.querySelector(targetId);
            if(targetElement){
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerHeight;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });

                // Highlight-animation
                const card = targetElement.closest('.service-card');
                if(card){
                    card.classList.remove('highlight'); // reset if needed
                    void card.offsetWidth; // force reflow
                    card.classList.add('highlight');
                }
            }
        }

        // Stäng mobilmeny om öppen
        navMenu.classList.remove('active');
    });
});

// Form submission
const contactForm = document.getElementById('contactForm');

contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Tack för ditt meddelande! Vi återkommer så snart som möjligt.');
    contactForm.reset();
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();

        const targetId = this.getAttribute('href');
        if (targetId === '#') return;

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

        navMenu.classList.remove('active');
    });
});

const industrySelect = document.getElementById('industry');
const otherIndustryGroup = document.getElementById('other-industry-group');

industrySelect.addEventListener('change', () => {
    if (industrySelect.value === 'other') {
        otherIndustryGroup.style.display = 'block';
    } else {
        otherIndustryGroup.style.display = 'none';
        document.getElementById('other-industry').value = '';
    }
});
