require('dotenv').config();
const nodemailer = require('nodemailer');

async function testMail() {
  console.log("SMTP Config details:");
  console.log("Host:", process.env.SMTP_HOST);
  console.log("Port:", process.env.SMTP_PORT);
  console.log("User:", process.env.SMTP_USER);
  console.log("Pass:", process.env.SMTP_PASS ? "********" : "Not Defined");

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  try {
    console.log("Sending test mail...");
    const info = await transporter.sendMail({
      from: `"Missara Clothing Test" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // send to oneself
      subject: "SMTP Configuration Test ✔",
      text: "If you receive this email, it means your SMTP settings are working perfectly!",
      html: "<b>If you receive this email, it means your SMTP settings are working perfectly!</b>"
    });
    console.log("Message sent successfully! MessageId:", info.messageId);
  } catch (error) {
    console.error("Error occurred while sending mail:", error.message);
  }
}

testMail();
