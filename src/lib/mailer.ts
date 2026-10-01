import nodemailer from "nodemailer";

export function isMailerConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

type MailInput = {
  to: string;
  subject: string;
  text: string;
  attachment?: { filename: string; content: Buffer };
};

export async function sendMail(input: MailInput) {
  if (!isMailerConfigured()) return false;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: input.to,
    subject: input.subject,
    text: input.text,
    attachments: input.attachment
      ? [{ filename: input.attachment.filename, content: input.attachment.content }]
      : undefined,
  });

  return true;
}
