import { IconUserAdd } from "@humansignal/icons";
import { Button, Modal, Typography } from "@humansignal/ui";
import { useState } from "react";
import "./invite-member-modal.scss";

export const InviteMemberModal = ({ visible, onClose, onInvite, loading }) => {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("annotator");
  const [sendEmail, setSendEmail] = useState(true);
  const [validationError, setValidationError] = useState("");

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate email
    if (!email.trim()) {
      setValidationError("Email is required");
      return;
    }

    if (!validateEmail(email)) {
      setValidationError("Please enter a valid email address");
      return;
    }

    setValidationError("");

    // Call the invite handler
    onInvite({
      email: email.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      role,
      send_email: sendEmail,
    });
  };

  const handleClose = () => {
    // Reset form
    setEmail("");
    setFirstName("");
    setLastName("");
    setRole("annotator");
    setSendEmail(true);
    setValidationError("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title="Invite New User"
      closeOnClickOutside={!loading}
    >
      <form onSubmit={handleSubmit} className="invite-member-form">
        <div className="invite-member-form__content">
          <Typography size="small" className="text-neutral-content-subtler mb-4">
            Invite a new user by email. They will receive login credentials and be added to this project.
          </Typography>

          <div className="invite-member-form__field">
            <label htmlFor="invite-email" className="invite-member-form__label">
              Email Address <span className="required">*</span>
            </label>
            <input
              id="invite-email"
              type="email"
              className="invite-member-form__input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              disabled={loading}
              required
            />
          </div>

          <div className="invite-member-form__field">
            <label htmlFor="invite-first-name" className="invite-member-form__label">
              First Name
            </label>
            <input
              id="invite-first-name"
              type="text"
              className="invite-member-form__input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="John"
              disabled={loading}
            />
          </div>

          <div className="invite-member-form__field">
            <label htmlFor="invite-last-name" className="invite-member-form__label">
              Last Name
            </label>
            <input
              id="invite-last-name"
              type="text"
              className="invite-member-form__input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Doe"
              disabled={loading}
            />
          </div>

          <div className="invite-member-form__field">
            <label htmlFor="invite-role" className="invite-member-form__label">
              Role <span className="required">*</span>
            </label>
            <select
              id="invite-role"
              className="invite-member-form__select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={loading}
            >
              <option value="annotator">Annotator</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="invite-member-form__field invite-member-form__field--checkbox">
            <label className="invite-member-form__checkbox-label">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                disabled={loading}
              />
              <span>Send invitation email with login credentials</span>
            </label>
          </div>

          {validationError && (
            <div className="invite-member-form__error">
              {validationError}
            </div>
          )}
        </div>

        <div className="invite-member-form__actions">
          <Button
            type="button"
            look="outlined"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            leading={<IconUserAdd />}
          >
            {loading ? "Sending Invitation..." : "Send Invitation"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
