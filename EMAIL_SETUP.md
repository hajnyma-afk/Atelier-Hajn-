# Email Service Setup Guide

This guide explains how to configure the email service for the contact form.

## Gmail Setup (Recommended)

Gmail requires an **App Password** for SMTP authentication, not your regular account password.

### Step 1: Enable 2-Step Verification

1. Go to your [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** if not already enabled
3. Complete the setup process

### Step 2: Generate an App Password

1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select **Mail** as the app
3. Select **Other (Custom name)** as the device
4. Enter a name like "Atelier Hajny Contact Form"
5. Click **Generate**
6. Copy the 16-character password (no spaces)

### Step 3: Configure Environment Variables

Add to your `.env.local`:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-character-app-password
SMTP_FROM=your-email@gmail.com
CONTACT_EMAIL=your-email@gmail.com
```

**Important:** Use the 16-character App Password, not your regular Gmail password.

## Other Email Providers

### Outlook/Hotmail

```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
SMTP_FROM=your-email@outlook.com
CONTACT_EMAIL=your-email@outlook.com
```

### Custom SMTP Server

```bash
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587                    # Usually 587 for TLS, 465 for SSL
SMTP_SECURE=false                # true for SSL (port 465), false for TLS (port 587)
SMTP_USER=your-username
SMTP_PASSWORD=your-password
SMTP_FROM=noreply@yourdomain.com
CONTACT_EMAIL=contact@yourdomain.com
```

## Testing

After configuration, test the contact form:

1. Fill out the form on your website
2. Submit it
3. Check the email inbox specified in `CONTACT_EMAIL`
4. You should receive an email with the form submission

## Troubleshooting

### "Application-specific password required" (Gmail)

- **Solution:** You must use a Gmail App Password, not your regular password
- Follow the Gmail setup steps above to generate an App Password

### "Invalid login" or "EAUTH" error

- Check that `SMTP_USER` and `SMTP_PASSWORD` are correct
- For Gmail, ensure you're using an App Password
- Verify 2-Step Verification is enabled (for Gmail)

### "Could not connect to SMTP server"

- Check `SMTP_HOST` and `SMTP_PORT` are correct
- Verify your firewall/network allows SMTP connections
- Try port 465 with `SMTP_SECURE=true` if port 587 doesn't work

### "Connection timed out"

- Check your network connection
- Verify SMTP server is accessible
- Some networks block SMTP ports - try a different network or use a VPN

## Security Notes

- **Never commit** `.env.local` to version control
- Use App Passwords instead of your main account password when possible
- Consider using a dedicated email account for contact form submissions
- Regularly rotate your SMTP passwords

## Cloud Run Deployment

When deploying to Cloud Run, set these environment variables:

```bash
gcloud run services update atelier-hajny \
  --region=us-central1 \
  --update-env-vars="SMTP_HOST=smtp.gmail.com,SMTP_PORT=587,SMTP_SECURE=false,SMTP_USER=your-email@gmail.com,SMTP_PASSWORD=your-app-password,SMTP_FROM=your-email@gmail.com,CONTACT_EMAIL=your-email@gmail.com"
```

Or use the `--use-env-file` flag with `deploy.sh`:

```bash
./deploy.sh your-project-id us-central1 --use-env-file
```

Make sure your `.env.local` contains all SMTP variables before deploying.

