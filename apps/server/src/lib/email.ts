import type { maileriooEnv } from './env';

type Template = 'verify-email' | 'reset-password';

interface SendEmailOptions {
  to: string;
  subject: string;
  template: Template;
  data: Record<string, unknown>;
  env: maileriooEnv['Bindings'];
}

export async function sendEmail({ to, subject, template, data, env }: SendEmailOptions) {
  const html = renderTemplate(template, data);

  const response = await fetch('https://smtp.maileroo.com/api/v2/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': env.MAILEROO_API_KEY,
    },
    body: JSON.stringify({
      from: {
        address: env.MAIL_FROM_EMAIL,
        name: 'Build Your Agent',
      },
      to: [
        {
          address: to,
        },
      ],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send email: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

function renderTemplate(template: Template, data: Record<string, unknown>) {
  switch (template) {
    case 'verify-email':
      return verifyEmailTemplate(data as { name: string; verificationUrl: string });

    case 'reset-password':
      return resetPasswordTemplate(data as { name: string; resetUrl: string });
  }
}

function baseTemplate(title: string, content: string) {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
</head>
<body style="margin:0;padding:40px;background:#f6f6f6;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:12px;padding:40px;">
          <tr>
            <td>

              <h1 style="margin:0 0 24px;font-size:28px;">
                Build Your Agent
              </h1>

              ${content}

              <hr style="margin:40px 0;border:none;border-top:1px solid #eee;" />

              <p style="color:#777;font-size:14px;">
                © ${new Date().getFullYear()} Build Your Agent
              </p>

            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>
`;
}

function verifyEmailTemplate({ name, verificationUrl }: { name: string; verificationUrl: string }) {
  return baseTemplate(
    'Verify your email',
    `
<p>Hi ${name},</p>

<p>Welcome to <strong>Build Your Agent</strong>.</p>

<p>Please verify your email address by clicking the button below.</p>

<p style="margin:32px 0;">
  <a
    href="${verificationUrl}"
    style="
      background:#111827;
      color:#fff;
      text-decoration:none;
      padding:14px 24px;
      border-radius:8px;
      display:inline-block;
      font-weight:600;
    ">
    Verify Email
  </a>
</p>

<p>If the button doesn't work, copy and paste this URL into your browser:</p>

<p>
  <a href="${verificationUrl}">
    ${verificationUrl}
  </a>
</p>

<p>If you didn't create an account, you can safely ignore this email.</p>
`,
  );
}

function resetPasswordTemplate({ name, resetUrl }: { name: string; resetUrl: string }) {
  return baseTemplate(
    'Reset your password',
    `
<p>Hi ${name},</p>

<p>We received a request to reset your password.</p>

<p style="margin:32px 0;">
  <a
    href="${resetUrl}"
    style="
      background:#111827;
      color:#fff;
      text-decoration:none;
      padding:14px 24px;
      border-radius:8px;
      display:inline-block;
      font-weight:600;
    ">
    Reset Password
  </a>
</p>

<p>If the button doesn't work, copy and paste this URL into your browser:</p>

<p>
  <a href="${resetUrl}">
    ${resetUrl}
  </a>
</p>

<p>If you didn't request this, you can safely ignore this email.</p>
`,
  );
}
