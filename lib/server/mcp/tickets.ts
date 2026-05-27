import { v4 as uuid } from "uuid";
import { getDb } from "@/lib/server/db";

export interface Ticket {
  id: string;
  user_email: string | null;
  subject: string;
  description: string;
  category: string | null;
  priority: string;
  status: string;
  resolution: string | null;
  agent_id: string | null;
  created_at: number;
  updated_at: number;
  resolved_at: number | null;
}

export function createTicket(params: {
  subject: string;
  description: string;
  priority?: string;
  category?: string;
  user_email?: string;
  agent_id?: string;
}): Ticket {
  const db = getDb();
  const now = Date.now();
  const ticket: Ticket = {
    id: uuid(),
    user_email: params.user_email || null,
    subject: params.subject,
    description: params.description,
    category: params.category || null,
    priority: params.priority || "medium",
    status: "open",
    resolution: null,
    agent_id: params.agent_id || null,
    created_at: now,
    updated_at: now,
    resolved_at: null,
  };

  db.prepare(
    `INSERT INTO tickets (id, user_email, subject, description, category, priority, status, resolution, agent_id, created_at, updated_at, resolved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    ticket.id,
    ticket.user_email,
    ticket.subject,
    ticket.description,
    ticket.category,
    ticket.priority,
    ticket.status,
    ticket.resolution,
    ticket.agent_id,
    ticket.created_at,
    ticket.updated_at,
    ticket.resolved_at
  );

  return ticket;
}

export function getTicketById(ticketId: string): Ticket | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM tickets WHERE id = ?").get(ticketId);
  return (row as Ticket) || null;
}

export function getTicketsByEmail(email: string): Ticket[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM tickets WHERE user_email = ? ORDER BY created_at DESC")
    .all(email) as Ticket[];
}

export function updateTicket(
  ticketId: string,
  updates: {
    status?: string;
    priority?: string;
    resolution?: string;
    category?: string;
  }
): Ticket | null {
  const db = getDb();
  const existing = getTicketById(ticketId);
  if (!existing) return null;

  const now = Date.now();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.status) {
    fields.push("status = ?");
    values.push(updates.status);
  }
  if (updates.priority) {
    fields.push("priority = ?");
    values.push(updates.priority);
  }
  if (updates.resolution !== undefined) {
    fields.push("resolution = ?");
    values.push(updates.resolution);
  }
  if (updates.category) {
    fields.push("category = ?");
    values.push(updates.category);
  }

  if (
    updates.status === "resolved" ||
    updates.status === "closed"
  ) {
    fields.push("resolved_at = ?");
    values.push(now);
  }

  fields.push("updated_at = ?");
  values.push(now);
  values.push(ticketId);

  db.prepare(
    `UPDATE tickets SET ${fields.join(", ")} WHERE id = ?`
  ).run(...values);

  return getTicketById(ticketId);
}