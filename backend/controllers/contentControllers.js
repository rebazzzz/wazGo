const PageContent = require('../models/Page');

// Hämta innehåll för en sida
exports.getPageContent = async (req, res) => {
    const { page } = req.params;
    try {
        const content = await PageContent.findAll({ where: { page } });
        res.json(content);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Fel vid hämtning av innehåll' });
    }
};

// Uppdatera innehåll
exports.updateContent = async (req, res) => {
    const { page } = req.params;
    const { section, content } = req.body;

    try {
        const existing = await PageContent.findOne({ where: { page, section } });
        if (existing) {
            existing.content = content;
            await existing.save();
            res.json({ message: 'Innehåll uppdaterat' });
        } else {
            res.status(404).json({ message: 'Sektion ej hittad' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Fel vid uppdatering' });
    }
};

// Skapa ny sektion
exports.createContent = async (req, res) => {
    const { page, section, content } = req.body;
    try {
        const newContent = await PageContent.create({ page, section, content });
        res.json(newContent);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Fel vid skapande av innehåll' });
    }
};
