// models/Page.js
import { DataTypes, Model } from 'sequelize';

export default (sequelize) => {
  class Page extends Model {}

  Page.init({
    title: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, allowNull: false, unique: true },
    content: { type: DataTypes.TEXT, allowNull: true },
    imagePath: { type: DataTypes.STRING, allowNull: true }
  }, {
    sequelize,
    modelName: 'Page',
    tableName: 'pages',
    timestamps: true
  });

  return Page;
};
