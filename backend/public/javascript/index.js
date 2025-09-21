// index.js

// === Mobile menu toggle ===
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navMenu = document.querySelector('.nav-menu');

if (mobileMenuBtn && navMenu) {
    mobileMenuBtn.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });
}

// === Industry tabs ===
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

// === Footer links → activate tabs or services ===
document.querySelectorAll('footer a').forEach(link => {
    link.addEventListener('click', e => {
        const href = link.getAttribute('href');

        // Endast stoppa standard om det är en hash-länk (#)
        if (href && href.startsWith('#')) {
            e.preventDefault();
        } else {
            return; // låt vanliga länkar fungera som vanligt
        }

        const industry = link.getAttribute('data-industry'); // Bransch-länk
        const targetId = link.getAttribute('href');          // Tjänst-länk
        const header = document.querySelector('header');
        const headerHeight = header ? header.offsetHeight : 0;

        if(industry){
            // Hantera bransch-flikar
            const activeTab = document.querySelector(`.industry-tab[data-industry="${industry}"]`);
            const activeContent = document.getElementById(industry + '-content');

            if(activeTab && activeContent){
                document.querySelectorAll('.industry-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.industry-content').forEach(c => c.classList.remove('active'));

                activeTab.classList.add('active');
                activeContent.classList.add('active');
            }

            // Scrolla till bransch-sektionen
            document.getElementById('industries').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        else if(targetId && targetId.startsWith('#') && targetId !== '#services'){
            // Scroll till service-card
            const targetElement = document.querySelector(targetId);
            if(targetElement){
                // Hitta närmaste service-card
                const card = targetElement.closest('.service-card');
                const scrollTarget = card || targetElement;

                const elementPosition = scrollTarget.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                window.scrollTo({
                    top: elementPosition,
                    behavior: 'smooth'
                });

                // Highlight-animation
                if(card){
                    card.classList.remove('highlight'); // reset
                    void card.offsetWidth;              // force reflow
                    card.classList.add('highlight');
                }
            }
        }

        // Stäng mobilmeny om öppen
        navMenu.classList.remove('active');
    });
});

// === Smooth scrolling for anchor links ===
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

        if (navMenu) navMenu.classList.remove('active');
    });
});

// === Check if an industry was selected from another page ===
window.addEventListener('DOMContentLoaded', () => {
    const industry = localStorage.getItem('selectedIndustry');
    if (!industry) return;

    const activeTab = document.querySelector(`.industry-tab[data-industry="${industry}"]`);
    const activeContent = document.getElementById(industry + '-content');

    if (activeTab && activeContent) {
        document.querySelectorAll('.industry-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.industry-content').forEach(c => c.classList.remove('active'));

        activeTab.classList.add('active');
        activeContent.classList.add('active');

        // Scrolla till sektionen
        const headerHeight = document.querySelector('header').offsetHeight;
        const elementPosition = document.getElementById('industries').getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerHeight;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }

    // Rensa localStorage
    localStorage.removeItem('selectedIndustry');
});


