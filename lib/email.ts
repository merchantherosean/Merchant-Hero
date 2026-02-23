import nodemailer from "nodemailer";

interface EmailAttachment {
  filename: string;
  content: string; // base64 encoded
  encoding: "base64";
}

interface SendEmailParams {
  to: string;
  cc?: string;
  subject: string;
  body: string;
  attachments?: EmailAttachment[];
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
  const { to, cc, subject, body, attachments } = params;

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
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        encoding: a.encoding as "base64",
      })),
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
