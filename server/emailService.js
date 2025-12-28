import nodemailer from 'nodemailer';

let transporter = null;

/**
 * Initialize email transporter
 */
function initEmailService() {
  if (transporter) {
    return transporter;
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpSecure = process.env.SMTP_SECURE === 'true';
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const smtpFrom = process.env.SMTP_FROM || smtpUser;

  if (!smtpHost || !smtpUser || !smtpPassword) {
    throw new Error('SMTP configuration missing. Please set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD environment variables.');
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });

  return transporter;
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

/**
 * Send contact form email
 * @param {string} name - Sender's name
 * @param {string} email - Sender's email
 * @param {string} message - Message content
 * @returns {Promise<void>}
 */
export async function sendContactEmail(name, email, message) {
  if (!isEmailConfigured()) {
    throw new Error('Email service not configured');
  }

  const transporter = initEmailService();
  const toEmail = process.env.CONTACT_EMAIL || process.env.SMTP_USER;
  const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER;

  const mailOptions = {
    from: `"${name}" <${smtpFrom}>`,
    replyTo: email,
    to: toEmail,
    subject: `Kontaktní formulář: ${name}`,
    text: `Jméno: ${name}\nEmail: ${email}\n\nZpráva:\n${message}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #000; padding-bottom: 10px;">Nová zpráva z kontaktního formuláře</h2>
        <div style="margin: 20px 0;">
          <p><strong>Jméno:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        </div>
        <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-left: 3px solid #000;">
          <p style="margin: 0; white-space: pre-wrap;">${message}</p>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Contact email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending contact email:', error);

    // Provide helpful error messages for common issues
    if (error.code === 'EAUTH' || error.message.includes('Invalid login') || error.message.includes('Application-specific password')) {
      throw new Error('SMTP authentication failed. For Gmail, you need to use an App Password instead of your regular password. See setup instructions for details.');
    } else if (error.code === 'ECONNECTION' || error.message.includes('ENOTFOUND')) {
      throw new Error('Could not connect to SMTP server. Check SMTP_HOST and SMTP_PORT settings.');
    } else if (error.code === 'ETIMEDOUT') {
      throw new Error('SMTP connection timed out. Check your network connection and SMTP settings.');
    }

    throw new Error(`Failed to send email: ${error.message}`);
  }
}

