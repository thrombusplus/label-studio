"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import secrets
import string

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def generate_secure_password(length=12):
    """Generate a secure random password with mixed characters.
    
    Args:
        length: Length of password to generate (default: 12)
        
    Returns:
        str: Randomly generated password
    """
    # Use letters, digits, and safe punctuation
    alphabet = string.ascii_letters + string.digits + '!@#$%^&*'
    password = ''.join(secrets.choice(alphabet) for i in range(length))
    return password


def send_invitation_email(user, password, project, inviter):
    """Send invitation email to newly created user.
    
    Args:
        user: User object that was just created
        password: Plain text password to include in email
        project: Project the user was invited to
        inviter: User who sent the invitation
    """
    subject = f"You've been invited to Label Studio Project: {project.title}"
    
    login_url = f"{settings.HOSTNAME}/user/login" if settings.HOSTNAME else "/user/login"
    
    message = f"""Hi {user.first_name or 'there'},

You've been invited to join the Label Studio project "{project.title}" by {inviter.email}.

Your login credentials:
Email: {user.email}
Password: {password}

Login here: {login_url}

For security, please change your password after your first login.

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
        logger.info(f'Invitation email sent to {user.email} for project {project.id}')
    except Exception as e:
        logger.error(f'Failed to send invitation email to {user.email}: {e}')
        raise


def send_added_to_project_email(user, project, role, inviter):
    """Send notification email to existing user added to new project.
    
    Args:
        user: Existing user being added to project
        project: Project the user was added to
        role: User's role in the system
        inviter: User who added them to the project
    """
    subject = f"You've been added to Label Studio Project: {project.title}"
    
    project_url = f"{settings.HOSTNAME}/projects/{project.id}" if settings.HOSTNAME else f"/projects/{project.id}"
    
    message = f"""Hi {user.first_name or user.email},

You've been added to the Label Studio project "{project.title}" by {inviter.email}.

Your role: {role}

Access the project here: {project_url}

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
        logger.info(f'Project addition email sent to {user.email} for project {project.id}')
    except Exception as e:
        logger.error(f'Failed to send project addition email to {user.email}: {e}')
        raise
