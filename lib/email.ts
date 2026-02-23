import nodemailer from "nodemailer";

interface SendEmailParams {
  to: string;
  cc?: string;
  subject: string;
  body: string;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Module-level transporter (cached across invocations in dev, like Prisma client)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { to, cc, subject, body } = params;

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return {
      success: false,
      error: "Gmail credentials not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in environment variables.",
    };
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to,
      cc: cc || undefined,
      subject,
      text: body,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message,
    };
  }
}
