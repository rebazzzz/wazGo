// config/database.js
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import fs from 'fs';

// Load test env if in test mode
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test' });
} else {
  dotenv.config();
}

// Function to get env var, checking file if *_FILE is set
const getEnvVar = (varName) => {
  const fileVar = `${varName}_FILE`;
  if (process.env[fileVar]) {
    try {
      return fs.readFileSync(process.env[fileVar], 'utf8').trim();
    } catch (err) {
      console.error(`Error reading ${fileVar}:`, err.message);
      process.exit(1);
    }
  }
  return process.env[varName];
};

const sequelize = new Sequelize(
  getEnvVar('DB_NAME'),
  getEnvVar('DB_USER'),
  getEnvVar('DB_PASS'),
  {
    host: getEnvVar('DB_HOST') || 'localhost',
    port: getEnvVar('DB_PORT') || 5432,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

export default sequelize;
