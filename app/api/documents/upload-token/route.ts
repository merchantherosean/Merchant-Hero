import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        // No auth check for now — matches rest of the app
        return {
          allowedContentTypes: undefined, // Allow all file types
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB max
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // Optional: could save to DB here, but we do it client-side after upload
        console.log("Upload completed:", blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
