# FTP Storage Setup Guide

This application uses FTP for storing uploaded files (images and videos) on your web hosting server.

## Configuration

Add the following environment variables to your `.env.local` file:

```bash
# FTP Configuration
FTP_HOST=ftp.yourdomain.com
FTP_USER=your_ftp_username
FTP_PASSWORD=your_ftp_password
FTP_PORT=21
FTP_SECURE=false
FTP_BASE_PATH=/public_html/uploads
FTP_BASE_URL=https://yourdomain.com/uploads
```

## Environment Variables Explained

- **FTP_HOST**: Your FTP server hostname (e.g., `ftp.yourdomain.com` or `ftp.wedos.com`)
- **FTP_USER**: Your FTP username
- **FTP_PASSWORD**: Your FTP password
- **FTP_PORT**: FTP port (usually `21` for standard FTP, `990` for FTPS)
- **FTP_SECURE**: Set to `true` for FTPS (secure FTP), `false` for standard FTP
- **FTP_BASE_PATH**: The directory on the FTP server where files will be uploaded (e.g., `/public_html/uploads` or `/www/uploads`)
- **FTP_BASE_URL**: The public URL where uploaded files will be accessible (e.g., `https://yourdomain.com/uploads`)

## Wedos.com Specific Setup

For Wedos hosting, you typically need:

1. **FTP Host**: Usually `ftp.wedos.com` or your domain's FTP server
2. **FTP User**: Your FTP username (usually provided in Wedos control panel)
3. **FTP Password**: Your FTP password
4. **FTP Base Path**: Usually `/public_html/uploads` or `/www/uploads` (check your hosting control panel)
5. **FTP Base URL**: `https://yourdomain.com/uploads` (replace `yourdomain.com` with your actual domain)

### Steps:

1. Log into your Wedos control panel
2. Find your FTP credentials (usually under "FTP Accounts" or "File Manager")
3. Create an `uploads` directory in your public HTML directory (usually `public_html/uploads`)
4. Set the environment variables in `.env.local`
5. Restart your server

## Testing FTP Connection

After setting up the environment variables, restart your server. You should see:

```
✅ FTP storage configured
   Host: ftp.yourdomain.com
   Base URL: https://yourdomain.com/uploads
```

If you see a warning instead, check that all FTP environment variables are set correctly.

## Troubleshooting

**"FTP connection failed" error:**
- Verify FTP_HOST, FTP_USER, and FTP_PASSWORD are correct
- Check if your FTP server allows connections from your server's IP
- Try connecting with an FTP client (like FileZilla) to verify credentials

**"FTP upload failed" error:**
- Ensure FTP_BASE_PATH exists on the server
- Check file permissions on the uploads directory (should be writable)
- Verify FTP_BASE_URL is accessible from a browser

**Files not accessible via URL:**
- Ensure FTP_BASE_URL matches the actual public URL
- Check that the uploads directory is in your public HTML directory
- Verify file permissions allow public read access

## Security Notes

- Never commit `.env.local` to version control
- Use strong FTP passwords
- Consider using FTPS (FTP_SECURE=true) if your hosting supports it
- Restrict FTP access to specific IPs if possible

