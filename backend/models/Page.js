// models/Page.js
const { DataTypes, Model } = require('sequelize');

class Page extends Model {
  static initModel(sequelize) {
    Page.init({
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      slug: { type: DataTypes.STRING, unique: true }, // e.g. 'home', 'privacy'
      title: { type: DataTypes.STRING },
      content: { type: DataTypes.TEXT },
      image: { type: DataTypes.STRING },
      updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    }, {
      sequelize,
      modelName: 'Page',
      tableName: 'pages',
      timestamps: false
    });
    return Page;
  }
}

module.exports = Page;
