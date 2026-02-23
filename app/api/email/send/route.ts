import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  const blobUrls: string[] = [];

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

    // Fetch attachments from Vercel Blob URLs
    const emailAttachments: { filename: string; content: Buffer }[] = [];
    if (Array.isArray(body.attachments)) {
      for (const att of body.attachments) {
        if (att.url && att.filename) {
          blobUrls.push(att.url);
          const fileRes = await fetch(att.url);
          if (fileRes.ok) {
            const buffer = Buffer.from(await fileRes.arrayBuffer());
            emailAttachments.push({ filename: att.filename, content: buffer });
          }
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

    // Clean up blob files after sending
    for (const url of blobUrls) {
      try {
        await del(url);
      } catch {
        // Ignore cleanup errors
      }
    }

    // Save to database
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
    // Clean up blobs on error too
    for (const url of blobUrls) {
      try {
        await del(url);
      } catch {
        // Ignore cleanup errors
      }
    }

    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
