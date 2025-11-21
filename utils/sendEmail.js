import nodemailer from 'nodemailer';

const sendEmail = async ({ to, subject, text }) => {
  let transporter;

  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'staging') {
    transporter = nodemailer.createTransport({
      service: 'Gmail',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false, // allow self-signed in dev/staging
      },
    });
  } else {
    transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  await transporter.sendMail({
    from: `"LeaveBoard" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
  });
};

export default sendEmail;
