# Email Configuration for User Invitations

Label Studio supports sending invitation emails to new users with auto-generated passwords. This document explains how to configure email settings for this feature.

## Overview

When you invite a new user to a project:

1. A secure password is automatically generated
2. The user account is created in the system
3. An invitation email is sent with login credentials
4. The user is added to the specified project

## Email Backend Configuration

Label Studio uses Django's email framework. You need to configure the email backend through environment variables.

### Required Environment Variables

```bash
# Email Backend (required)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend

# SMTP Server Settings (required)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=true

# Authentication (required)
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# From Address (optional, defaults to 'Label Studio <hello@labelstud.io>')
FROM_EMAIL=Label Studio <noreply@yourdomain.com>
```

### Common Email Providers

#### Gmail

```bash
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
FROM_EMAIL=Label Studio <noreply@yourdomain.com>
```

**Note**: For Gmail, you need to use an [App Password](https://support.google.com/accounts/answer/185833) instead of your regular password.

#### Office 365 / Outlook

```bash
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=your-email@outlook.com
EMAIL_HOST_PASSWORD=your-password
FROM_EMAIL=Label Studio <noreply@yourdomain.com>
```

#### SendGrid

```bash
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=your-sendgrid-api-key
FROM_EMAIL=Label Studio <noreply@yourdomain.com>
```

#### Amazon SES

```bash
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=your-ses-smtp-username
EMAIL_HOST_PASSWORD=your-ses-smtp-password
FROM_EMAIL=Label Studio <noreply@yourdomain.com>
```

#### Custom SMTP Server

```bash
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.yourserver.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=your-username
EMAIL_HOST_PASSWORD=your-password
FROM_EMAIL=Label Studio <noreply@yourdomain.com>
```

## Docker Configuration

### Using docker-compose

Add the email configuration to your `docker-compose.yml`:

```yaml
version: "3.8"
services:
  labelstudio:
    image: heartexlabs/label-studio:latest
    environment:
      - EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
      - EMAIL_HOST=smtp.gmail.com
      - EMAIL_PORT=587
      - EMAIL_USE_TLS=true
      - EMAIL_HOST_USER=your-email@gmail.com
      - EMAIL_HOST_PASSWORD=your-app-password
      - FROM_EMAIL=Label Studio <noreply@yourdomain.com>
    ports:
      - "8080:8080"
```

### Using .env file

Create a `.env` file in your project root:

```bash
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
FROM_EMAIL=Label Studio <noreply@yourdomain.com>
```

Then reference it in your `docker-compose.yml`:

```yaml
version: "3.8"
services:
  labelstudio:
    image: heartexlabs/label-studio:latest
    env_file:
      - .env
    ports:
      - "8080:8080"
```

## Testing Email Configuration

### Using Django Shell

You can test your email configuration using the Django shell:

```bash
# Enter Django shell
python manage.py shell

# Test email sending
from django.core.mail import send_mail
send_mail(
    'Test Email',
    'This is a test email from Label Studio.',
    'noreply@yourdomain.com',
    ['recipient@example.com'],
    fail_silently=False,
)
```

### Using the Invitation Feature

1. Log in as an admin user
2. Navigate to a project's Settings > Members
3. Click "Invite New User"
4. Fill in the email address and other details
5. Click "Send Invitation"
6. Check if the email was received

## Troubleshooting

### Email Not Sending

1. **Check email backend configuration**: Ensure `EMAIL_BACKEND` is set correctly
2. **Verify SMTP credentials**: Double-check username and password
3. **Check firewall/network**: Ensure outbound SMTP connections are allowed
4. **Review logs**: Check Label Studio logs for error messages

### Common Errors

#### Authentication Failed

```
SMTPAuthenticationError: (535, b'5.7.8 Username and Password not accepted')
```

**Solution**: Verify your email credentials. For Gmail, use an App Password.

#### Connection Refused

```
ConnectionRefusedError: [Errno 111] Connection refused
```

**Solution**: Check if the SMTP host and port are correct and accessible from your server.

#### TLS/SSL Errors

```
ssl.SSLError: [SSL: WRONG_VERSION_NUMBER] wrong version number
```

**Solution**: Try using `EMAIL_USE_SSL=true` instead of `EMAIL_USE_TLS=true`, or vice versa.

## Security Best Practices

1. **Use App Passwords**: For Gmail and similar providers, use app-specific passwords
2. **Secure Credentials**: Never commit email credentials to version control
3. **Use Environment Variables**: Store credentials in environment variables or secrets management
4. **Enable TLS/SSL**: Always use encrypted connections (`EMAIL_USE_TLS=true` or `EMAIL_USE_SSL=true`)
5. **Restrict From Address**: Use a dedicated noreply address for system emails

## Disabling Email Notifications

If you don't want to send invitation emails, you can:

1. Uncheck "Send invitation email" when inviting users through the UI
2. Set `EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend` to print emails to console instead
3. Set `EMAIL_BACKEND=django.core.mail.backends.dummy.EmailBackend` to disable emails completely (default)

## Additional Resources

- [Django Email Documentation](https://docs.djangoproject.com/en/stable/topics/email/)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- [SendGrid SMTP Documentation](https://docs.sendgrid.com/for-developers/sending-email/integrating-with-the-smtp-api)
- [Amazon SES SMTP Documentation](https://docs.aws.amazon.com/ses/latest/dg/send-email-smtp.html)
