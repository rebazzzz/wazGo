import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function testEmail() {
  try {
    console.log('Testing email configuration...');

    const smtpHost = getEnvVar('SMTP_HOST');
    const smtpPort = getEnvVar('SMTP_PORT');
    const smtpUser = getEnvVar('SMTP_USER');
    const smtpPass = getEnvVar('SMTP_PASS');
    const emailFrom = getEnvVar('EMAIL_FROM');
    const smtpTo = getEnvVar('SMTP_TO') || smtpUser;

    console.log('SMTP Config:');
    console.log(`Host: ${smtpHost}`);
    console.log(`Port: ${smtpPort}`);
    console.log(`User: ${smtpUser}`);
    console.log(`From: ${emailFrom}`);
    console.log(`To: ${smtpTo}`);

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false, // true för 465, false för andra portar
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    // Test connection
    await transporter.verify();
    console.log('SMTP connection successful!');

    // Send test email
    const info = await transporter.sendMail({
      from: emailFrom,
      to: smtpTo,
      subject: 'Test Email from Waz Go',
      text: 'This is a test email to verify SMTP configuration.'
    });

    console.log('Test email sent successfully!');
    console.log('Message ID:', info.messageId);

  } catch (error) {
    console.error('Email test failed:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
  }
}

testEmail();
