interface SendPasswordResetCodeInput {
  email: string;
  code: string;
  expiresAt: string;
  purpose: 'password-reset';
}

interface PasswordResetDeliveryResult {
  provider: 'resend' | 'dev-log';
  previewCode?: string;
}

function getPasswordResetTemplate(input: SendPasswordResetCodeInput) {
  return {
    subject: 'MindArena password reset code',
    text: [
      'Reset your MindArena password.',
      '',
      `Verification code: ${input.code}`,
      `Expires at: ${input.expiresAt}`,
      '',
      'If you did not request a password reset, you can ignore this email.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <h2>Reset your MindArena password</h2>
        <p>Use the verification code below to reset your password:</p>
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 0.25em; margin: 24px 0;">
          ${input.code}
        </div>
        <p>This code expires at <strong>${input.expiresAt}</strong>.</p>
        <p>If you did not request a password reset, you can ignore this email.</p>
      </div>
    `,
  };
}

export async function sendPasswordResetCodeEmail(
  input: SendPasswordResetCodeInput,
): Promise<PasswordResetDeliveryResult> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const emailFrom = process.env.EMAIL_FROM?.trim();
  const template = getPasswordResetTemplate(input);

  if (!resendApiKey || !emailFrom) {
    console.log(
      `[MindArena password reset] ${input.email} -> ${input.code} (expires ${input.expiresAt})`,
    );
    return { provider: 'dev-log', previewCode: input.code };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: emailFrom,
      to: [input.email],
      subject: template.subject,
      text: template.text,
      html: template.html,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Unable to send password reset email.');
  }

  return { provider: 'resend' };
}
