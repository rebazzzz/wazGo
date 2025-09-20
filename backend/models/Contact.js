const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const Contact = sequelize.define('Contact', {
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    company: { type: DataTypes.STRING },
    industry: { type: DataTypes.STRING },
    message: { type: DataTypes.TEXT, allowNull: false }
});

module.exports = Contact;
