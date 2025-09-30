// models/Contact.js
import { DataTypes, Model } from 'sequelize';

export default (sequelize) => {
  class Contact extends Model {}
  
  Contact.init({
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    company: { type: DataTypes.STRING, allowNull: true },
    industry: { type: DataTypes.STRING, allowNull: true },
    message: { type: DataTypes.TEXT, allowNull: false },
    filePath: { type: DataTypes.STRING, allowNull: true }
  }, {
    sequelize,
    modelName: 'Contact',
    tableName: 'contacts',
    timestamps: true,
    indexes: [
      {
        fields: ['createdAt']
      }
    ]
  });

  return Contact;
};
