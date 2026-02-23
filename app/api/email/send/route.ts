import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    // Read as text first to avoid default JSON body size limits
    const rawText = await req.text();
    const body = JSON.parse(rawText);
    const { to, cc, subject, body: emailBody, attachments } = body;

    if (!to || !subject) {
      return NextResponse.json(
        { error: "To and Subject fields are required" },
        { status: 400 }
      );
    }

    // Send via Gmail SMTP
    const result = await sendEmail({
      to,
      cc: cc || undefined,
      subject,
      body: emailBody || "",
      attachments: attachments || undefined,
    });

    // Save to database regardless of success/failure
    const sentEmail = await prisma.sentEmail.create({
      data: {
        to,
        cc: cc || null,
        subject,
        body: emailBody || "",
        status: result.success ? "sent" : "failed",
        errorMessage: result.error || null,
      },
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, email: sentEmail },
        { status: 500 }
      );
    }

    return NextResponse.json(sentEmail, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
