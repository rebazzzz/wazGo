const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const Admin = sequelize.define('Admin', {
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false } // Krypteras med bcrypt
});

module.exports = Admin;
