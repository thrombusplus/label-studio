# Password Reset Feature - User Guide

## Overview

Label Studio now includes a self-service password reset feature that allows users to reset their passwords via email without administrator intervention.

## Features

- **Email-Based Reset**: Users receive a secure reset link via email
- **Token Security**: 24-hour expiration on reset tokens
- **One-Time Use**: Reset links can only be used once
- **User-Friendly Interface**: Simple, intuitive password reset flow
- **Security**: Doesn't reveal whether an email exists in the system

## User Flow

### For Users Who Forgot Their Password

1. **Navigate to Login Page**

   - Go to the Label Studio login page
   - Click "Forgot your password?" link below the login form

2. **Request Password Reset**

   - Enter your email address
   - Click "Send Reset Link"
   - Check your email inbox (and spam folder)

3. **Reset Your Password**

   - Click the reset link in the email
   - Enter your new password (minimum 8 characters)
   - Confirm your new password
   - Click "Reset Password"

4. **Log In**
   - You'll be redirected to the login page
   - Log in with your new password

## Email Configuration

Password reset requires email to be configured. See `docs/EMAIL_CONFIGURATION.md` for detailed setup instructions.

### Quick Setup

Add these environment variables:

```bash
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
FROM_EMAIL=Label Studio <noreply@yourdomain.com>
```

## Security Features

### Token Security

- **Expiration**: Reset tokens expire after 24 hours
- **One-Time Use**: Each token can only be used once
- **Secure Generation**: Tokens use cryptographically secure random generation
- **Database Storage**: Tokens are stored securely in the database

### Privacy Protection

- **Email Enumeration Prevention**: System doesn't reveal whether an email exists
- **Rate Limiting**: Consider implementing rate limiting on reset requests
- **Audit Logging**: All password reset attempts are logged

### Password Requirements

- Minimum 8 characters (configurable via `AUTH_PASSWORD_MIN_LENGTH`)
- Maximum 128 characters (configurable via `AUTH_PASSWORD_MAX_LENGTH`)
- Must match confirmation field

## API Endpoints

The password reset feature provides both web UI and API endpoints:

### Request Password Reset

```bash
POST /api/password-reset/request/
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

### Validate Reset Token

```bash
POST /api/password-reset/validate/
Content-Type: application/json

{
  "token": "abc123..."
}
```

**Response (Valid):**

```json
{
  "valid": true
}
```

**Response (Invalid):**

```json
{
  "valid": false,
  "error": "Invalid or expired reset token"
}
```

### Confirm Password Reset

```bash
POST /api/password-reset/confirm/
Content-Type: application/json

{
  "token": "abc123...",
  "password": "newpassword123",
  "password_confirm": "newpassword123"
}
```

**Response (Success):**

```json
{
  "message": "Password has been reset successfully. You can now log in with your new password."
}
```

**Response (Error):**

```json
{
  "error": "Invalid or expired reset token"
}
```

## Web UI Pages

### Password Reset Request Page

- **URL**: `/user/password-reset/`
- **Purpose**: Request a password reset email
- **Access**: Public (no authentication required)

### Password Reset Confirm Page

- **URL**: `/user/password-reset/<token>/`
- **Purpose**: Set a new password using the reset token
- **Access**: Public (no authentication required)

## Troubleshooting

### Email Not Received

1. **Check Spam Folder**: Reset emails may be filtered as spam
2. **Verify Email Configuration**: Ensure EMAIL_BACKEND and SMTP settings are correct
3. **Check Logs**: Review application logs for email sending errors
4. **Test Email Setup**: Use Django shell to test email sending

### Invalid or Expired Token

**Causes:**

- Token has expired (24 hours have passed)
- Token has already been used
- Token is malformed or incorrect

**Solution:**

- Request a new password reset link
- Ensure you're using the most recent reset email

### Password Requirements Not Met

**Common Issues:**

- Password too short (minimum 8 characters)
- Passwords don't match
- Password exceeds maximum length

**Solution:**

- Follow the password requirements displayed on the form
- Ensure both password fields match exactly

### Email Configuration Errors

**Common Errors:**

1. **SMTPAuthenticationError**

   ```
   Solution: Verify email credentials, use app-specific passwords for Gmail
   ```

2. **Connection Refused**

   ```
   Solution: Check SMTP host and port, verify firewall settings
   ```

3. **TLS/SSL Errors**
   ```
   Solution: Try EMAIL_USE_SSL instead of EMAIL_USE_TLS or vice versa
   ```

## Database Schema

### PasswordResetToken Model

```python
class PasswordResetToken(models.Model):
    user = ForeignKey(User)           # User requesting reset
    token = CharField(max_length=64)  # Unique reset token
    created_at = DateTimeField()      # When token was created
    expires_at = DateTimeField()      # When token expires (24h)
    used = BooleanField()             # Whether token has been used
```

**Indexes:**

- `token` - For fast token lookup
- `user, used` - For finding active tokens per user
- `expires_at` - For cleanup of expired tokens

## Maintenance

### Cleanup Expired Tokens

Expired tokens should be periodically cleaned up. You can create a management command or cron job:

```python
from django.utils import timezone
from users.models import PasswordResetToken

# Delete tokens older than 7 days
cutoff = timezone.now() - timedelta(days=7)
PasswordResetToken.objects.filter(created_at__lt=cutoff).delete()
```

### Monitoring

Monitor these metrics:

- Password reset request rate
- Token usage rate
- Failed reset attempts
- Email delivery failures

## Best Practices

### For Users

1. Use a strong, unique password
2. Don't share reset links
3. Complete the reset process promptly (within 24 hours)
4. Change password immediately if you didn't request a reset

### For Administrators

1. Configure email properly before enabling the feature
2. Monitor reset request patterns for abuse
3. Implement rate limiting if needed
4. Keep email templates professional and clear
5. Regularly clean up expired tokens
6. Monitor email delivery success rates

## Integration with Existing Systems

### Custom Email Templates

To customize the reset email, modify `label_studio/users/functions/password_reset.py`:

```python
def send_password_reset_email(user, token):
    # Customize subject and message here
    subject = "Your Custom Subject"
    message = f"Your custom message with {reset_url}"
    # ...
```

### Custom Password Requirements

Modify in Django settings:

```python
AUTH_PASSWORD_MIN_LENGTH = 12  # Increase minimum length
AUTH_PASSWORD_MAX_LENGTH = 256  # Increase maximum length
```

### Adding Password Strength Requirements

Extend the validation in `label_studio/users/views.py`:

```python
def password_reset_confirm(request, token):
    # Add custom validation
    if not has_uppercase(password):
        return render(request, 'users/password_reset_confirm.html', {
            'error': 'Password must contain uppercase letters.'
        })
```

## Support

For issues or questions:

- Check application logs for detailed error messages
- Verify email configuration in `docs/EMAIL_CONFIGURATION.md`
- Test email sending using Django shell
- Review security settings and firewall rules

## Related Documentation

- [Email Configuration Guide](EMAIL_CONFIGURATION.md)
- [User Invitation Feature](../USER_INVITATION_FEATURE.md)
- [Django Email Documentation](https://docs.djangoproject.com/en/stable/topics/email/)
