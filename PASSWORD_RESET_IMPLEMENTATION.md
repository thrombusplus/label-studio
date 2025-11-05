# Password Reset Feature - Implementation Summary

## Overview

This document describes the implementation of the email-based password reset feature for Label Studio, allowing users to reset their passwords without administrator intervention.

## Implementation Date

January 5, 2025

## Features Implemented

✅ **Email-Based Password Reset**

- Users can request password reset via email
- Secure token-based reset links
- 24-hour token expiration
- One-time use tokens

✅ **Web UI**

- Forgot password link on login page
- Password reset request page
- Password reset confirmation page
- Success/error messaging

✅ **API Endpoints**

- Request password reset
- Validate reset token
- Confirm password reset

✅ **Security**

- Email enumeration prevention
- Secure token generation
- Token expiration and usage tracking
- Password validation

## Files Created

### Backend Files

1. **`label_studio/users/functions/password_reset.py`** (NEW)

   - `generate_reset_token()` - Secure token generation
   - `send_password_reset_email()` - Email sending
   - `create_reset_token()` - Token creation and management
   - `validate_reset_token()` - Token validation
   - `reset_user_password()` - Password reset logic

2. **`label_studio/users/migrations/0013_passwordresettoken.py`** (NEW)
   - Database migration for PasswordResetToken model

### Frontend Files

3. **`label_studio/users/templates/users/password_reset_request.html`** (NEW)

   - Password reset request page template

4. **`label_studio/users/templates/users/password_reset_confirm.html`** (NEW)
   - Password reset confirmation page template

### Documentation Files

5. **`docs/PASSWORD_RESET_GUIDE.md`** (NEW)

   - Comprehensive user and administrator guide

6. **`PASSWORD_RESET_IMPLEMENTATION.md`** (NEW)
   - This implementation summary

## Files Modified

### Backend Files

1. **`label_studio/users/models.py`**

   - Added `PasswordResetToken` model with fields:
     - `user` - ForeignKey to User
     - `token` - Unique reset token (64 chars)
     - `created_at` - Timestamp
     - `expires_at` - Expiration timestamp
     - `used` - Boolean flag
   - Added indexes for performance

2. **`label_studio/users/serializers.py`**

   - Added `PasswordResetRequestSerializer`
   - Added `PasswordResetValidateSerializer`
   - Added `PasswordResetConfirmSerializer`

3. **`label_studio/users/api.py`**

   - Added `PasswordResetRequestAPI` - Request reset email
   - Added `PasswordResetValidateAPI` - Validate token
   - Added `PasswordResetConfirmAPI` - Confirm reset
   - All with OpenAPI documentation

4. **`label_studio/users/views.py`**

   - Added `password_reset_request()` view
   - Added `password_reset_confirm()` view

5. **`label_studio/users/urls.py`**
   - Added web UI routes:
     - `/user/password-reset/` - Request page
     - `/user/password-reset/<token>/` - Confirm page
   - Added API routes:
     - `/api/password-reset/request/` - Request API
     - `/api/password-reset/validate/` - Validate API
     - `/api/password-reset/confirm/` - Confirm API

### Frontend Files

6. **`label_studio/users/templates/users/user_login.html`**

   - Added "Forgot your password?" link

7. **`web/apps/labelstudio/src/config/ApiConfig.js`**
   - Added API endpoint configurations:
     - `passwordResetRequest`
     - `passwordResetValidate`
     - `passwordResetConfirm`

## Architecture

### Database Schema

```
PasswordResetToken
├── id (PK)
├── user_id (FK → User)
├── token (unique, indexed)
├── created_at
├── expires_at (indexed)
└── used (indexed with user_id)
```

### Request Flow

```
User Request → Email Sent → Token Created → User Clicks Link →
Token Validated → Password Updated → Token Marked Used → Success
```

### Security Flow

```
1. User requests reset
2. System checks if email exists (silently)
3. If exists: Generate token, send email
4. If not exists: Still show success (prevent enumeration)
5. User clicks link with token
6. System validates token (expiry, usage)
7. User enters new password
8. System validates password requirements
9. Password updated, token marked as used
10. User redirected to login
```

## API Documentation

### Request Password Reset

**Endpoint**: `POST /api/password-reset/request/`

**Request**:

```json
{
  "email": "user@example.com"
}
```

**Response**: Always returns success to prevent email enumeration

```json
{
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

### Validate Token

**Endpoint**: `POST /api/password-reset/validate/`

**Request**:

```json
{
  "token": "abc123..."
}
```

**Response**:

```json
{
  "valid": true
}
```

### Confirm Reset

**Endpoint**: `POST /api/password-reset/confirm/`

**Request**:

```json
{
  "token": "abc123...",
  "password": "newpassword",
  "password_confirm": "newpassword"
}
```

**Response**:

```json
{
  "message": "Password has been reset successfully."
}
```

## Configuration Requirements

### Email Configuration (Required)

```bash
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
FROM_EMAIL=Label Studio <noreply@yourdomain.com>
```

### Password Settings (Optional)

```python
AUTH_PASSWORD_MIN_LENGTH = 8   # Minimum password length
AUTH_PASSWORD_MAX_LENGTH = 128  # Maximum password length
```

## Security Considerations

### Implemented Security Measures

1. **Token Security**

   - Cryptographically secure random generation
   - 24-hour expiration
   - One-time use enforcement
   - Secure database storage

2. **Privacy Protection**

   - Email enumeration prevention
   - Consistent response times
   - No user existence disclosure

3. **Password Security**

   - Minimum length requirements
   - Password confirmation
   - Secure password hashing (Django default)

4. **Audit Trail**
   - All reset requests logged
   - Token creation logged
   - Password changes logged

### Recommended Additional Measures

1. **Rate Limiting**

   - Limit reset requests per IP
   - Limit reset requests per email
   - Implement CAPTCHA for repeated requests

2. **Monitoring**

   - Track reset request patterns
   - Alert on suspicious activity
   - Monitor email delivery rates

3. **Token Cleanup**
   - Periodic cleanup of expired tokens
   - Database maintenance schedule

## Testing Checklist

### Backend Testing

- [x] Token generation produces unique tokens
- [x] Token expiration works correctly
- [x] One-time use enforcement works
- [x] Email sending functionality
- [x] Password validation
- [x] API endpoints return correct responses
- [x] Database migrations apply successfully

### Frontend Testing

- [ ] "Forgot Password" link appears on login page
- [ ] Reset request form validates email
- [ ] Success message displays after request
- [ ] Reset confirmation page loads with valid token
- [ ] Error message displays with invalid token
- [ ] Password fields validate correctly
- [ ] Success redirect to login works

### Integration Testing

- [ ] End-to-end reset flow works
- [ ] Email delivery successful
- [ ] User can log in with new password
- [ ] Token expires after 24 hours
- [ ] Token cannot be reused
- [ ] Invalid tokens handled gracefully

### Security Testing

- [ ] Email enumeration prevented
- [ ] Token cannot be guessed
- [ ] Expired tokens rejected
- [ ] Used tokens rejected
- [ ] Password requirements enforced
- [ ] CSRF protection active

## Deployment Steps

1. **Apply Database Migrations**

   ```bash
   python manage.py migrate users
   ```

2. **Configure Email Settings**

   - Set environment variables
   - Test email sending
   - Verify FROM_EMAIL address

3. **Update Frontend Assets**

   ```bash
   cd web && yarn install && yarn build
   ```

4. **Restart Application**

   ```bash
   # Restart your Label Studio instance
   ```

5. **Verify Deployment**
   - Test password reset flow
   - Check email delivery
   - Review application logs

## Maintenance

### Regular Tasks

1. **Token Cleanup** (Weekly)

   ```python
   from django.utils import timezone
   from datetime import timedelta
   from users.models import PasswordResetToken

   cutoff = timezone.now() - timedelta(days=7)
   PasswordResetToken.objects.filter(created_at__lt=cutoff).delete()
   ```

2. **Monitor Metrics** (Daily)

   - Reset request rate
   - Email delivery success rate
   - Failed reset attempts
   - Token usage patterns

3. **Review Logs** (Weekly)
   - Check for suspicious patterns
   - Verify email sending errors
   - Review failed reset attempts

## Troubleshooting

### Common Issues

1. **Emails Not Sending**

   - Check EMAIL_BACKEND configuration
   - Verify SMTP credentials
   - Check firewall/network settings
   - Review application logs

2. **Invalid Token Errors**

   - Token may have expired (24 hours)
   - Token may have been used already
   - User may be using old reset link

3. **Password Validation Errors**
   - Check AUTH_PASSWORD_MIN_LENGTH setting
   - Verify password meets requirements
   - Ensure passwords match

## Future Enhancements

Potential improvements for future versions:

1. **Enhanced Security**

   - Two-factor authentication for reset
   - SMS-based reset option
   - Security questions

2. **User Experience**

   - Password strength indicator
   - Custom email templates
   - Multi-language support

3. **Administration**

   - Admin dashboard for reset monitoring
   - Bulk token invalidation
   - Custom token expiration times

4. **Integration**
   - SSO integration
   - LDAP/Active Directory support
   - OAuth provider integration

## Support Resources

- **User Guide**: `docs/PASSWORD_RESET_GUIDE.md`
- **Email Configuration**: `docs/EMAIL_CONFIGURATION.md`
- **Django Email Docs**: https://docs.djangoproject.com/en/stable/topics/email/

## License

This feature is part of Label Studio and follows the same Apache 2.0 license.

## Contributors

- Implementation Date: January 5, 2025
- Feature Type: Email-based password reset
- Edition: Open Source

---

**Note**: This feature requires email configuration to function. See `docs/EMAIL_CONFIGURATION.md` for setup instructions.
