import { NextRequest, NextResponse } from "next/server";
import { searchKnowledge, addKnowledgeArticle, seedKnowledgeBase } from "@/lib/server/mcp/knowledge";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim();
  const max = req.nextUrl.searchParams.get("max");

  if (!query) {
    return NextResponse.json({ error: "Provide ?q= search query" }, { status: 400 });
  }

  seedKnowledgeBase();

  const results = searchKnowledge(query, max ? Number(max) : 5);
  return NextResponse.json({ results, count: results.length });
}

export async function POST(req: NextRequest) {
  let body: {
    title?: string;
    content?: string;
    category?: string;
    tags?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.title || !body.content) {
    return NextResponse.json(
      { error: "title and content are required" },
      { status: 400 }
    );
  }

  const article = addKnowledgeArticle({
    title: body.title,
    content: body.content,
    category: body.category,
    tags: body.tags,
  });

  return NextResponse.json({ article }, { status: 201 });
}