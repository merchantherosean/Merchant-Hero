import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const rawText = await req.text();
    let body;
    try {
      body = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const to: string = body.to || "";
    const cc: string | undefined = body.cc || undefined;
    const subject: string = body.subject || "";
    const emailBody: string = body.body || "";

    if (!to || !subject) {
      return NextResponse.json(
        { error: "To and Subject fields are required" },
        { status: 400 }
      );
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const toAddresses = to.split(",").map((e: string) => e.trim()).filter(Boolean);

    for (const addr of toAddresses) {
      if (!emailRegex.test(addr)) {
        return NextResponse.json(
          { error: `Invalid email address: "${addr}"` },
          { status: 400 }
        );
      }
    }

    // Build attachments from base64 data
    const emailAttachments: { filename: string; content: Buffer }[] = [];
    if (Array.isArray(body.attachments)) {
      for (const att of body.attachments) {
        if (att.content && att.filename) {
          emailAttachments.push({
            filename: att.filename,
            content: Buffer.from(att.content, "base64"),
          });
        }
      }
    }

    // Send via Gmail SMTP
    const result = await sendEmail({
      to,
      cc,
      subject,
      body: emailBody,
      attachments: emailAttachments.length > 0
        ? emailAttachments.map((a) => ({
            filename: a.filename,
            content: a.content,
          }))
        : undefined,
    });

    // Save to database regardless of success/failure
    const sentEmail = await prisma.sentEmail.create({
      data: {
        to,
        cc: cc || null,
        subject,
        body: emailBody,
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
