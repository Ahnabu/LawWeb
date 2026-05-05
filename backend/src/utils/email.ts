const RESEND_ENDPOINT = 'https://api.resend.com/emails';

interface SendVerificationEmailInput {
  email: string;
  name: string;
  code: string;
}

export async function sendVerificationCodeEmail({ email, name, code }: SendVerificationEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'LawWeb <onboarding@resend.dev>';
  const testEmail = process.env.RESEND_TEST_EMAIL; // In development: send all codes to this verified email

  const subject = 'Verify your LawWeb email address';
  const text = `Hi ${name},\n\nYour LawWeb verification code is: ${code}\n\nThis code expires in 10 minutes. If you did not request this, you can ignore this email.`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2 style="margin: 0 0 16px;">Verify your LawWeb email address</h2>
      <p style="margin: 0 0 12px;">Hi ${name},</p>
      <p style="margin: 0 0 16px;">Use this verification code to activate your account:</p>
      <div style="font-size: 28px; font-weight: 700; letter-spacing: 0.2em; background: #f1f5f9; padding: 16px 20px; border-radius: 12px; display: inline-block;">${code}</div>
      <p style="margin: 16px 0 0;">This code expires in 10 minutes. If you did not request this, you can ignore this email.</p>
      ${process.env.NODE_ENV !== 'production' && testEmail ? `<hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;"><p style="margin: 12px 0; font-size: 12px; color: #6b7280;"><strong>Dev Note:</strong> Registered email: ${email}</p>` : ''}
    </div>
  `;

  if (!apiKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[email-dev] Verification code for ${email}: ${code}`);
      return;
    }

    throw new Error('RESEND_API_KEY is not configured.');
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [process.env.NODE_ENV !== 'production' && testEmail ? testEmail : email],
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => 'Unable to read error body');

    if (process.env.NODE_ENV !== 'production') {
      console.error(`[email-dev] Resend failed for ${email}: ${payload}`);
      console.info(`[email-dev] Verification code for ${email}: ${code}`);
      return;
    }

    throw new Error(`Failed to send verification email: ${payload}`);
  }

  // Log successful send in development
  if (process.env.NODE_ENV !== 'production') {
    const sentTo = process.env.NODE_ENV !== 'production' && testEmail ? testEmail : email;
    const note = testEmail && testEmail !== email ? ` (test mode, sent to ${testEmail} instead of ${email})` : '';
    console.info(`[email-dev] Verification code sent successfully to ${sentTo}${note}`);
  }
}