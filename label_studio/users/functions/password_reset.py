"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import secrets
import string
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

logger = logging.getLogger(__name__)


def generate_reset_token(length=32):
    """Generate a secure random token for password reset.
    
    Args:
        length: Length of token to generate (default: 32)
        
    Returns:
        str: Randomly generated token
    """
    alphabet = string.ascii_letters + string.digits
    token = ''.join(secrets.choice(alphabet) for i in range(length))
    return token


def send_password_reset_email(user, token):
    """Send password reset email to user.
    
    Args:
        user: User object requesting password reset
        token: Reset token to include in email
    """
    reset_url = f"{settings.HOSTNAME}/user/password-reset/{token}" if settings.HOSTNAME else f"/user/password-reset/{token}"
    
    subject = "Reset Your Label Studio Password"
    
    message = f"""Hi {user.first_name or user.email},

You requested to reset your password for Label Studio.

Click the link below to reset your password:
{reset_url}

This link will expire in 24 hours.

If you didn't request this password reset, please ignore this email. Your password will remain unchanged.

Best regards,
The Label Studio Team
"""
    
    try:
        send_mail(
            subject,
            message,
            settings.FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )
        logger.info(f'Password reset email sent to {user.email}')
    except Exception as e:
        logger.error(f'Failed to send password reset email to {user.email}: {e}')
        raise


def create_reset_token(user):
    """Create a password reset token for a user.
    
    Args:
        user: User object to create token for
        
    Returns:
        PasswordResetToken: Created token object
    """
    from users.models import PasswordResetToken
    
    # Invalidate any existing tokens for this user
    PasswordResetToken.objects.filter(user=user, used=False).update(used=True)
    
    # Create new token
    token = generate_reset_token()
    expiration = timezone.now() + timedelta(hours=24)
    
    reset_token = PasswordResetToken.objects.create(
        user=user,
        token=token,
        expires_at=expiration
    )
    
    return reset_token


def validate_reset_token(token):
    """Validate a password reset token.
    
    Args:
        token: Token string to validate
        
    Returns:
        tuple: (is_valid, user_or_error_message)
    """
    from users.models import PasswordResetToken
    
    try:
        reset_token = PasswordResetToken.objects.get(token=token)
    except PasswordResetToken.DoesNotExist:
        return False, "Invalid or expired reset token"
    
    # Check if token has been used
    if reset_token.used:
        return False, "This reset link has already been used"
    
    # Check if token has expired
    if timezone.now() > reset_token.expires_at:
        return False, "This reset link has expired"
    
    return True, reset_token.user


def reset_user_password(token, new_password):
    """Reset user password using a valid token.
    
    Args:
        token: Reset token string
        new_password: New password to set
        
    Returns:
        tuple: (success, user_or_error_message)
    """
    from users.models import PasswordResetToken
    
    is_valid, result = validate_reset_token(token)
    
    if not is_valid:
        return False, result
    
    user = result
    
    # Set new password
    user.set_password(new_password)
    user.save(update_fields=['password'])
    
    # Mark token as used
    PasswordResetToken.objects.filter(token=token).update(used=True)
    
    logger.info(f'Password reset successful for user {user.email}')
    
    return True, user
