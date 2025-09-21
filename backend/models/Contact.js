import { DataTypes, Model } from 'sequelize';

class Contact extends Model {
  static initModel(sequelize) {
    Contact.init({
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false },
      company: { type: DataTypes.STRING },
      industry: { type: DataTypes.STRING },
      otherIndustry: { type: DataTypes.STRING },
      message: { type: DataTypes.TEXT, allowNull: false },
      filePath: { type: DataTypes.STRING },
      createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    }, {
      sequelize,
      modelName: 'Contact',
      tableName: 'contacts',
      timestamps: false
    });
    return Contact;
  }
}

export default Contact;
