// models/Page.js
import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

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

export default Page;
