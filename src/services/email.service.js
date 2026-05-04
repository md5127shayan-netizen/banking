require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
  },
});

if (process.env.VERIFY_EMAIL_CONNECTION === 'true') {
  transporter.verify((error, success) => {
    if (error) {
      console.error('Error connecting to email server:', error);
    } else {
      console.log('Email server is ready to send messages');
    }
  });
}

// Function to send email
const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Banking" <${process.env.EMAIL_USER}>`, // sender address
      to, // list of receivers
      subject, // Subject line
      text, // plain text body
      html, // html body
    });

    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error('Error sending email:', error);
  }
};


async function sendRegistrationEmail(userEmail, name) {
  const subject = 'Welcome to Our Banking App';
  const text = `Hello ${name},\n\nWelcome to our banking app! We're excited to have you on board.\n\nBest regards,\nThe Banking Team`;
  const html = `
    <p>Hello ${name},</p>
    <p>Welcome to our banking app! We're excited to have you on board.</p>
    <p>Best regards,<br>The Banking Team</p>
  `;

  await sendEmail(userEmail, subject, text, html);
}

async function sendTransactionEmail(userEmail, name, amount) {
  const subject = 'Transaction Completed';
  const text = `Hello ${name},\n\nYour transaction of ${amount} has been completed successfully.\n\nBest regards,\nThe Banking Team`;
  const html = `
    <p>Hello ${name},</p>
    <p>Your transaction of ${amount} has been completed successfully.</p>
    <p>Best regards,<br>The Banking Team</p>
  `;

  await sendEmail(userEmail, subject, text, html);
}



async function sendTransactionFailureEmail(userEmail, name, amount) {
  const subject = 'Transaction Failed';
  const text = `Hello ${name},\n\nYour transaction of ${amount} has failed.\n\nBest regards,\nThe Banking Team`;
  const html = `
    <p>Hello ${name},</p>
    <p>Your transaction of ${amount} has failed.</p>
    <p>Best regards,<br>The Banking Team</p>
  `;

  await sendEmail(userEmail, subject, text, html);
}

module.exports = { sendEmail, sendRegistrationEmail, sendTransactionFailureEmail, sendTransactionEmail };
