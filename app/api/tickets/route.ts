import { NextRequest, NextResponse } from "next/server";
import { createTicket, getTicketsByEmail, updateTicket } from "@/lib/server/mcp/tickets";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.trim();

  if (email) {
    const tickets = getTicketsByEmail(email);
    return NextResponse.json({ tickets });
  }

  return NextResponse.json({ error: "Provide ?email= to look up tickets" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  let body: {
    subject?: string;
    description?: string;
    priority?: string;
    category?: string;
    user_email?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.subject || !body.description) {
    return NextResponse.json(
      { error: "subject and description are required" },
      { status: 400 }
    );
  }

  const ticket = createTicket({
    subject: body.subject,
    description: body.description,
    priority: body.priority,
    category: body.category,
    user_email: body.user_email,
  });

  return NextResponse.json({ ticket }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  let body: {
    ticketId?: string;
    status?: string;
    priority?: string;
    resolution?: string;
    category?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.ticketId) {
    return NextResponse.json({ error: "ticketId is required" }, { status: 400 });
  }

  const updated = updateTicket(body.ticketId, {
    status: body.status,
    priority: body.priority,
    resolution: body.resolution,
    category: body.category,
  });

  if (!updated) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  return NextResponse.json({ ticket: updated });
}