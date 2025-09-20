// Form submission
const contactForm = document.getElementById('contactForm');

if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Tack för ditt meddelande! Vi återkommer så snart som möjligt.');
        contactForm.reset();
    });

    // Bransch-val i formuläret
    const industrySelect = document.getElementById('industry');
    const otherIndustryGroup = document.getElementById('other-industry-group');

    if (industrySelect && otherIndustryGroup) {
        industrySelect.addEventListener('change', () => {
            if (industrySelect.value === 'other') {
                otherIndustryGroup.style.display = 'block';
            } else {
                otherIndustryGroup.style.display = 'none';
                const otherInput = document.getElementById('other-industry');
                if (otherInput) otherInput.value = '';
            }
        });
    }
}
