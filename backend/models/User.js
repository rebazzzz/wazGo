// models/User.js
import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import bcrypt from 'bcrypt';

class User extends Model {
  comparePassword(plain) {
    return bcrypt.compare(plain, this.password);
  }
}

User.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING, defaultValue: 'admin' }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: false,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password && user.password.length < 60) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password') && user.password.length < 60) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

export default User;
