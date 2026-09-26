const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const SEND_TIMEOUT_MS = 10_000;

const isProduction = () => process.env.NODE_ENV === 'production';

// User-supplied values (names) end up inside HTML emails
const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
  // Printed to the console in development so flows work without a mail provider
  devPreview: string;
}

async function sendEmail({ to, subject, text, html, devPreview }: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'LawWeb <onboarding@resend.dev>';
  // Development only: the resend.dev sender can only deliver to the Resend account
  // owner, so every email is redirected to this address.
  const testEmail = !isProduction() ? process.env.RESEND_TEST_EMAIL : undefined;
  const recipient = testEmail || to;

  if (!apiKey) {
    if (!isProduction()) {
      console.info(`[email-dev] ${subject} -> ${to}: ${devPreview}`);
      return;
    }
    throw new Error('RESEND_API_KEY is not configured.');
  }

  let response: Response;
  try {
    response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: fromEmail, to: [recipient], subject, text, html }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
  } catch (error) {
    if (!isProduction()) {
      console.error(`[email-dev] Resend request failed for ${to}:`, error);
      console.info(`[email-dev] ${subject} -> ${to}: ${devPreview}`);
      return;
    }
    throw error;
  }

  if (!response.ok) {
    const payload = await response.text().catch(() => 'Unable to read error body');

    if (!isProduction()) {
      console.error(`[email-dev] Resend failed for ${to}: ${payload}`);
      console.info(`[email-dev] ${subject} -> ${to}: ${devPreview}`);
      return;
    }

    throw new Error(`Failed to send email (${response.status}): ${payload}`);
  }

  if (!isProduction()) {
    const note = testEmail && testEmail !== to ? ` (test mode, sent to ${testEmail} instead of ${to})` : '';
    console.info(`[email-dev] "${subject}" sent${note}. ${devPreview}`);
  }
}

const layout = (heading: string, body: string) => `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a; max-width: 560px;">
    <h2 style="margin: 0 0 16px;">${heading}</h2>
    ${body}
    <p style="margin: 24px 0 0; font-size: 12px; color: #64748b;">Islam &amp; Associates · LawWeb</p>
  </div>
`;

const button = (href: string, label: string) =>
  `<p style="margin: 20px 0;"><a href="${escapeHtml(href)}" style="background: #0A1628; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">${label}</a></p>
   <p style="margin: 0 0 12px; font-size: 12px; color: #64748b;">If the button does not work, copy this link into your browser:<br><span style="word-break: break-all;">${escapeHtml(href)}</span></p>`;

export async function sendVerificationCodeEmail({ email, name, code, expiresMinutes }: { email: string; name: string; code: string; expiresMinutes: number }) {
  const safeName = escapeHtml(name);
  await sendEmail({
    to: email,
    subject: 'Verify your LawWeb email address',
    text: `Hi ${name},\n\nYour LawWeb verification code is: ${code}\n\nThis code expires in ${expiresMinutes} minutes. If you did not request this, you can ignore this email.`,
    html: layout(
      'Verify your LawWeb email address',
      `<p style="margin: 0 0 12px;">Hi ${safeName},</p>
       <p style="margin: 0 0 16px;">Use this verification code to activate your account:</p>
       <div style="font-size: 28px; font-weight: 700; letter-spacing: 0.2em; background: #f1f5f9; padding: 16px 20px; border-radius: 12px; display: inline-block;">${code}</div>
       <p style="margin: 16px 0 0;">This code expires in ${expiresMinutes} minutes. If you did not request this, you can ignore this email.</p>`
    ),
    devPreview: `code ${code}`,
  });
}

export async function sendPasswordResetEmail({ email, name, resetUrl, expiresMinutes }: { email: string; name: string; resetUrl: string; expiresMinutes: number }) {
  await sendEmail({
    to: email,
    subject: 'Reset your LawWeb password',
    text: `Hi ${name},\n\nWe received a request to reset your LawWeb password. Open this link to choose a new one:\n\n${resetUrl}\n\nThe link expires in ${expiresMinutes} minutes and can be used once. If you did not ask for this, ignore this email; your password stays the same.`,
    html: layout(
      'Reset your password',
      `<p style="margin: 0 0 12px;">Hi ${escapeHtml(name)},</p>
       <p style="margin: 0 0 12px;">We received a request to reset your LawWeb password.</p>
       ${button(resetUrl, 'Choose a new password')}
       <p style="margin: 0;">The link expires in ${expiresMinutes} minutes and can be used once. If you did not ask for this, ignore this email; your password stays the same.</p>`
    ),
    devPreview: `reset link ${resetUrl}`,
  });
}

export async function sendAccountSetupEmail({ email, name, setupUrl, expiresHours }: { email: string; name: string; setupUrl: string; expiresHours: number }) {
  await sendEmail({
    to: email,
    subject: 'Your LawWeb lawyer account is ready',
    text: `Hi ${name},\n\nAn administrator created a LawWeb lawyer account for you. Set your password here:\n\n${setupUrl}\n\nThe link expires in ${expiresHours} hours. After that, use "Forgot password" on the login page to get a new one.`,
    html: layout(
      'Your lawyer account is ready',
      `<p style="margin: 0 0 12px;">Hi ${escapeHtml(name)},</p>
       <p style="margin: 0 0 12px;">An administrator created a LawWeb lawyer account for you. Set your password to sign in.</p>
       ${button(setupUrl, 'Set your password')}
       <p style="margin: 0;">The link expires in ${expiresHours} hours. After that, use "Forgot password" on the login page to get a new one.</p>`
    ),
    devPreview: `setup link ${setupUrl}`,
  });
}

export async function sendPasswordChangedEmail({ email, name }: { email: string; name: string }) {
  await sendEmail({
    to: email,
    subject: 'Your LawWeb password was changed',
    text: `Hi ${name},\n\nThe password for your LawWeb account was just changed and all other devices were signed out.\n\nIf this was not you, reset your password immediately with "Forgot password" on the login page and contact the firm.`,
    html: layout(
      'Your password was changed',
      `<p style="margin: 0 0 12px;">Hi ${escapeHtml(name)},</p>
       <p style="margin: 0 0 12px;">The password for your LawWeb account was just changed and all other devices were signed out.</p>
       <p style="margin: 0;">If this was not you, reset your password immediately with <strong>Forgot password</strong> on the login page and contact the firm.</p>`
    ),
    devPreview: 'password changed notice',
  });
}
