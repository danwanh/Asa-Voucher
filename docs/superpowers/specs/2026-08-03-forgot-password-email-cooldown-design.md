# Forgot Password Email Validation and Resend Cooldown

## Goal

Only send a password-reset email when the submitted email belongs to an existing, verified account. The forgot-password form must also communicate the existing resend cooldown with a visible countdown.

## Backend

- Keep the existing `POST /auth/forgot-password` endpoint and 60-second server-side cooldown.
- Resolve the submitted identifier as an email and look up the user.
- Return `404` with code `EMAIL_NOT_FOUND` when no account matches.
- Return a clear client error when the account exists but is not verified; do not send an email.
- Preserve `429 EMAIL_RESEND_COOLDOWN` and its `cooldown_seconds` detail when a reset email was sent within the last 60 seconds.
- Return success only after creating the reset token and sending the email.

## Frontend

- Keep the current forgot-password form and success screen.
- Display the backend message for an unknown or unverified email instead of showing the success screen.
- Start a 60-second countdown after a successful send.
- Disable the resend action while the countdown is active, then allow sending again.
- When the backend returns a cooldown response, initialize the countdown from `cooldown_seconds`.

## Error Handling

- Client-side email format validation remains unchanged.
- API errors are shown inline and do not transition to the success screen.
- Countdown state is client UX only; the backend remains authoritative for abuse prevention.

## Testing

- Verify the service rejects unknown emails and unverified users without sending mail.
- Verify successful requests send mail and enforce the 60-second cooldown.
- Run backend and frontend type checks and lint commands.
