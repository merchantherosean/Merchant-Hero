import { NextResponse } from "next/server";
import { ImapFlow } from "imapflow";

export const dynamic = "force-dynamic";

// Maximum time for the IMAP fetch (Vercel functions have a 10s default timeout)
export const maxDuration = 30;

interface InboxEmail {
  uid: number;
  from: string;
  to: string;
  subject: string;
  date: string;
  body: string;
  seen: boolean;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return NextResponse.json(
      { error: "Gmail credentials not configured" },
      { status: 500 }
    );
  }

  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    logger: false,
  });

  try {
    await client.connect();

    const lock = await client.getMailboxLock("INBOX");

    try {
      const mailbox = client.mailbox as { exists?: number } | false;
      const total = (mailbox && mailbox.exists) ? mailbox.exists : 0;

      if (total === 0) {
        return NextResponse.json({ emails: [], total: 0, page, limit });
      }

      // Calculate range (IMAP sequence numbers are 1-based, newest = highest)
      const startSeq = Math.max(1, total - (page * limit) + 1);
      const endSeq = Math.max(1, total - ((page - 1) * limit));

      const emails: InboxEmail[] = [];

      // Fetch messages in the range, newest first
      const messages = client.fetch(`${startSeq}:${endSeq}`, {
        uid: true,
        envelope: true,
        flags: true,
        bodyStructure: true,
        source: { maxLength: 50000 }, // Limit to 50KB per message to keep response fast
      });

      for await (const msg of messages) {
        const envelope = msg.envelope;
        if (!envelope) continue;

        // Extract plain text body from source
        let body = "";
        if (msg.source) {
          const raw = msg.source.toString();
          // Try to extract plain text content
          body = extractTextBody(raw);
        }

        emails.push({
          uid: msg.uid,
          from: envelope.from?.[0]
            ? `${envelope.from[0].name || ""} <${envelope.from[0].address || ""}>`.trim()
            : "Unknown",
          to: envelope.to?.[0]?.address || "",
          subject: envelope.subject || "(no subject)",
          date: envelope.date?.toISOString() || new Date().toISOString(),
          body: body.slice(0, 5000), // Cap body at 5000 chars
          seen: msg.flags?.has("\\Seen") ?? false,
        });
      }

      // Sort newest first
      emails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return NextResponse.json({ emails, total, page, limit });
    } finally {
      lock.release();
    }
  } catch (error) {
    console.error("IMAP error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  } finally {
    await client.logout().catch(() => {});
  }
}

export async function DELETE(req: Request) {
  const { uids } = await req.json();

  if (!Array.isArray(uids) || uids.length === 0) {
    return NextResponse.json(
      { error: "uids array is required" },
      { status: 400 }
    );
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return NextResponse.json(
      { error: "Gmail credentials not configured" },
      { status: 500 }
    );
  }

  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      // Mark messages as deleted and expunge
      await client.messageDelete(uids as number[], { uid: true });
      return NextResponse.json({ success: true, deleted: uids.length });
    } finally {
      lock.release();
    }
  } catch (error) {
    console.error("IMAP delete error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  } finally {
    await client.logout().catch(() => {});
  }
}

/**
 * Extract plain text body from raw email source.
 * Handles multipart MIME and quoted-printable/base64 encoding.
 */
function extractTextBody(raw: string): string {
  // Try to find text/plain section in multipart message
  const boundaryMatch = raw.match(/boundary="?([^"\r\n;]+)"?/i);

  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const parts = raw.split(new RegExp(`--${escapeRegex(boundary)}`));

    for (const part of parts) {
      if (part.toLowerCase().includes("content-type: text/plain")) {
        return decodePart(part);
      }
    }
    // Fallback: try text/html and strip tags
    for (const part of parts) {
      if (part.toLowerCase().includes("content-type: text/html")) {
        const decoded = decodePart(part);
        return stripHtml(decoded);
      }
    }
  }

  // Non-multipart: find body after headers (double newline)
  const headerEnd = raw.indexOf("\r\n\r\n");
  if (headerEnd !== -1) {
    const bodyRaw = raw.slice(headerEnd + 4);
    // Check if it's HTML
    if (raw.toLowerCase().includes("content-type: text/html")) {
      return stripHtml(decodePart(bodyRaw));
    }
    return decodePart(bodyRaw);
  }

  return raw.slice(0, 2000);
}

function decodePart(part: string): string {
  // Separate headers from body within this MIME part
  const headerEnd = part.indexOf("\r\n\r\n");
  const headers = headerEnd !== -1 ? part.slice(0, headerEnd).toLowerCase() : "";
  let body = headerEnd !== -1 ? part.slice(headerEnd + 4) : part;

  // Handle transfer encoding
  if (headers.includes("content-transfer-encoding: quoted-printable")) {
    body = decodeQuotedPrintable(body);
  } else if (headers.includes("content-transfer-encoding: base64")) {
    try {
      body = Buffer.from(body.replace(/\s/g, ""), "base64").toString("utf-8");
    } catch {
      // Keep raw if decode fails
    }
  }

  return body.trim();
}

function decodeQuotedPrintable(str: string): string {
  return str
    .replace(/=\r?\n/g, "") // Soft line breaks
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
