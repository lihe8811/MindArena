interface SendVerificationCodeInput {
  email: string;
  code: string;
  expiresAt: string;
  purpose: 'verification' | 'password-reset' | 'login';
}

interface VerificationDeliveryResult {
  provider: 'resend' | 'dev-log';
  previewCode?: string;
}

function getVerificationTemplate(input: SendVerificationCodeInput) {
  const isPasswordReset = input.purpose === 'password-reset';
  const isLogin = input.purpose === 'login';
  return {
    subject: isPasswordReset
      ? 'MindArena password reset code'
      : isLogin
        ? 'MindArena sign-in code'
        : 'MindArena verification code',
    text: [
      isPasswordReset
        ? 'Reset your MindArena password.'
        : isLogin
          ? 'Complete your MindArena sign-in.'
          : 'Verify your MindArena account.',
      '',
      `Verification code: ${input.code}`,
      `Expires at: ${input.expiresAt}`,
      '',
      isPasswordReset
        ? 'If you did not request a password reset, you can ignore this email.'
        : isLogin
          ? 'If you did not try to sign in, you can ignore this email.'
        : 'If you did not request this code, you can ignore this email.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <h2>${
          isPasswordReset
            ? 'Reset your MindArena password'
            : isLogin
              ? 'Complete your MindArena sign-in'
              : 'Verify your MindArena account'
        }</h2>
        <p>${
          isPasswordReset
            ? 'Use the verification code below to reset your password:'
            : isLogin
              ? 'Use the verification code below to finish signing in:'
              : 'Use the verification code below to activate your account:'
        }</p>
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 0.25em; margin: 24px 0;">
          ${input.code}
        </div>
        <p>This code expires at <strong>${input.expiresAt}</strong>.</p>
        <p>${
          isPasswordReset
            ? 'If you did not request a password reset, you can ignore this email.'
            : isLogin
              ? 'If you did not try to sign in, you can ignore this email.'
              : 'If you did not request this code, you can ignore this email.'
        }</p>
      </div>
    `,
  };
}

export async function sendVerificationCodeEmail(
  input: SendVerificationCodeInput,
): Promise<VerificationDeliveryResult> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const emailFrom = process.env.EMAIL_FROM?.trim();
  const template = getVerificationTemplate(input);

  if (!resendApiKey || !emailFrom) {
    console.log(
      `[MindArena email verification] ${input.email} -> ${input.code} (expires ${input.expiresAt})`,
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
    throw new Error(message || 'Unable to send verification email.');
  }

  return { provider: 'resend' };
}
