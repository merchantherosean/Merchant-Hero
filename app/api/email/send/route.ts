import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let to: string;
    let cc: string | undefined;
    let subject: string;
    let emailBody: string;
    let emailAttachments: { filename: string; content: Buffer }[] = [];

    if (contentType.includes("multipart/form-data")) {
      // FormData upload with actual File objects
      const formData = await req.formData();
      to = (formData.get("to") as string) || "";
      cc = (formData.get("cc") as string) || undefined;
      subject = (formData.get("subject") as string) || "";
      emailBody = (formData.get("body") as string) || "";

      const files = formData.getAll("files") as File[];
      emailAttachments = await Promise.all(
        files.map(async (file) => ({
          filename: file.name,
          content: Buffer.from(await file.arrayBuffer()),
        }))
      );
    } else {
      // JSON body (plain emails without attachments)
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

      to = body.to || "";
      cc = body.cc || undefined;
      subject = body.subject || "";
      emailBody = body.body || "";
    }

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
