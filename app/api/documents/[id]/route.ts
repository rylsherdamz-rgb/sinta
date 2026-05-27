import { NextRequest, NextResponse } from "next/server";
import { getDocumentById, seedSchoolDocuments } from "@/lib/server/mcp/documents";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  seedSchoolDocuments();
  const doc = getDocumentById(id);
  if (!doc || !doc.file_data) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const mimeType = doc.mime_type || "text/plain";
  const fileName = doc.file_name || `document_${id}.txt`;

  return new NextResponse(doc.file_data, {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}