# User Invitation Feature - Implementation Summary

## Overview

This document describes the implementation of the user invitation feature for Label Studio, which allows administrators to invite new users to projects with auto-generated passwords and automatic email notifications.

## Features

- **Invite New Users**: Admins can invite users by email address
- **Auto-Generated Passwords**: Secure 12-character passwords are automatically generated
- **Email Notifications**: Invitation emails are sent with login credentials
- **Existing User Support**: If a user already exists, they're simply added to the project
- **Role Assignment**: Choose between Admin and Annotator roles
- **Optional Email**: Option to skip sending the invitation email

## Implementation Details

### Backend Components

#### 1. Invitation Utilities (`label_studio/users/functions/invitation.py`)

**Functions:**

- `generate_secure_password(length=12)`: Generates secure random passwords
- `send_invitation_email(user, password, project, inviter)`: Sends invitation email to new users
- `send_added_to_project_email(user, project, role, inviter)`: Notifies existing users when added to projects

#### 2. API Serializer (`label_studio/projects/serializers.py`)

**InviteUserSerializer:**

- `email` (required): User's email address
- `first_name` (optional): User's first name
- `last_name` (optional): User's last name
- `role` (optional): User role (admin/annotator, default: annotator)
- `send_email` (optional): Whether to send invitation email (default: true)

#### 3. API Endpoint (`label_studio/projects/api.py`)

**ProjectInviteUserAPI:**

- **Endpoint**: `POST /api/projects/{pk}/invite-member/`
- **Permission**: Admin only
- **Functionality**:
  - Checks if user exists by email
  - Creates new user with auto-generated password if needed
  - Adds user to organization
  - Adds user to project
  - Sends appropriate email notification
  - Returns user details and success message

#### 4. URL Configuration (`label_studio/projects/urls.py`)

Registered endpoint: `/api/projects/<int:pk>/invite-member/`

### Frontend Components

#### 1. Invitation Modal (`web/apps/labelstudio/src/pages/Settings/InviteMemberModal.jsx`)

**Features:**

- Email input with validation
- Optional first name and last name fields
- Role selector (Admin/Annotator)
- Send email checkbox
- Form validation
- Loading states
- Error handling

#### 2. Modal Styles (`web/apps/labelstudio/src/pages/Settings/invite-member-modal.scss`)

Styled using semantic CSS tokens for:

- Form fields
- Input elements
- Select dropdowns
- Checkboxes
- Error messages
- Action buttons

#### 3. Members Settings Integration (`web/apps/labelstudio/src/pages/Settings/MembersSettings.jsx`)

**Updates:**

- Added "Invite New User" button
- Integrated invitation modal
- Added invitation handler with API call
- Success/error message display
- Automatic member list refresh after invitation

#### 4. API Configuration (`web/apps/labelstudio/src/config/ApiConfig.js`)

Added endpoint: `inviteProjectMember: "POST:/projects/:pk/invite-member"`

## Email Configuration

### Required Environment Variables

```bash
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
FROM_EMAIL=Label Studio <noreply@yourdomain.com>
```

See `docs/EMAIL_CONFIGURATION.md` for detailed configuration instructions.

## Usage

### For Administrators

1. Navigate to Project Settings > Members
2. Click "Invite New User" button
3. Fill in the invitation form:
   - Email address (required)
   - First name (optional)
   - Last name (optional)
   - Role (Admin or Annotator)
   - Send email checkbox (checked by default)
4. Click "Send Invitation"
5. User receives email with credentials (if email sending is enabled)
6. User can log in and access the project

### For Invited Users

1. Check email for invitation
2. Note the login credentials provided
3. Visit the Label Studio login page
4. Log in with provided credentials
5. Change password after first login (recommended)

## API Usage

### Invite New User

```bash
curl -X POST \
  http://localhost:8080/api/projects/1/invite-member/ \
  -H 'Authorization: Token YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "newuser@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "annotator",
    "send_email": true
  }'
```

### Response (New User)

```json
{
  "user_id": 123,
  "email": "newuser@example.com",
  "username": "newuser",
  "first_name": "John",
  "last_name": "Doe",
  "role": "annotator",
  "enabled": true,
  "created_at": "2025-01-05T00:00:00Z",
  "user_existed": false,
  "message": "User newuser@example.com invited to project"
}
```

### Response (Existing User)

```json
{
  "user_id": 456,
  "email": "existinguser@example.com",
  "username": "existinguser",
  "first_name": "Jane",
  "last_name": "Smith",
  "role": "admin",
  "enabled": true,
  "created_at": "2025-01-05T00:00:00Z",
  "user_existed": true,
  "message": "User existinguser@example.com added to project"
}
```

## Security Features

1. **Admin-Only Access**: Only administrators can invite users
2. **Secure Password Generation**: 12-character passwords with mixed characters
3. **Email Validation**: Email addresses are validated and normalized
4. **CSRF Protection**: Django CSRF middleware enabled
5. **Audit Trail**: All invitations are logged
6. **Credential Security**: Passwords are never stored in plain text

## Email Templates

### New User Invitation Email

```
Subject: You've been invited to Label Studio Project: [Project Name]

Hi [First Name],

You've been invited to join the Label Studio project "[Project Name]" by [Inviter Email].

Your login credentials:
Email: [User Email]
Password: [Generated Password]

Login here: [Login URL]

For security, please change your password after your first login.

Best regards,
The Label Studio Team
```

### Existing User Notification Email

```
Subject: You've been added to Label Studio Project: [Project Name]

Hi [First Name],

You've been added to the Label Studio project "[Project Name]" by [Inviter Email].

Your role: [Role]

Access the project here: [Project URL]

Best regards,
The Label Studio Team
```

## Files Modified/Created

### Backend Files

- ✅ `label_studio/users/functions/invitation.py` (new)
- ✅ `label_studio/projects/serializers.py` (modified)
- ✅ `label_studio/projects/api.py` (modified)
- ✅ `label_studio/projects/urls.py` (modified)

### Frontend Files

- ✅ `web/apps/labelstudio/src/pages/Settings/InviteMemberModal.jsx` (new)
- ✅ `web/apps/labelstudio/src/pages/Settings/invite-member-modal.scss` (new)
- ✅ `web/apps/labelstudio/src/pages/Settings/MembersSettings.jsx` (modified)
- ✅ `web/apps/labelstudio/src/config/ApiConfig.js` (modified)

### Documentation Files

- ✅ `docs/EMAIL_CONFIGURATION.md` (new)
- ✅ `USER_INVITATION_FEATURE.md` (new)

## Testing Checklist

### Backend Testing

- [ ] Test invitation API with valid data
- [ ] Test invitation API with invalid email
- [ ] Test invitation API with existing user
- [ ] Test invitation API without admin permissions
- [ ] Test email sending functionality
- [ ] Test password generation
- [ ] Test user creation and organization assignment

### Frontend Testing

- [ ] Test "Invite New User" button visibility (admin only)
- [ ] Test modal opening and closing
- [ ] Test form validation
- [ ] Test successful invitation flow
- [ ] Test error handling and display
- [ ] Test member list refresh after invitation
- [ ] Test with and without email sending option

### Integration Testing

- [ ] Test end-to-end invitation flow
- [ ] Test email delivery
- [ ] Test user login with generated credentials
- [ ] Test project access after invitation
- [ ] Test with different email providers
- [ ] Test with email disabled

## Troubleshooting

### Common Issues

1. **Emails not sending**

   - Check EMAIL_BACKEND configuration
   - Verify SMTP credentials
   - Check server firewall settings
   - Review application logs

2. **Permission denied errors**

   - Ensure user has admin role
   - Check project permissions
   - Verify authentication token

3. **User already exists errors**
   - Feature handles this automatically
   - Existing users are added to project without creating new account

## Future Enhancements

Potential improvements for future versions:

1. **Bulk Invitations**: Invite multiple users at once via CSV upload
2. **Custom Email Templates**: Allow customization of invitation email content
3. **Invitation Expiry**: Add expiration dates for invitation links
4. **Password Reset Link**: Include password reset link in invitation email
5. **Invitation History**: Track all sent invitations with status
6. **Resend Invitations**: Ability to resend invitation emails
7. **Role-Based Templates**: Different email templates for different roles

## Support

For issues or questions:

- Check `docs/EMAIL_CONFIGURATION.md` for email setup
- Review application logs for error details
- Verify environment variables are set correctly
- Test email configuration using Django shell

## License

This feature is part of Label Studio and follows the same Apache 2.0 license.
