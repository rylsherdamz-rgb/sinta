import { NextRequest, NextResponse } from "next/server";
import { MCP_TOOLS } from "@/lib/server/mcp/tools";
import { searchDocuments, getDocumentContent } from "@/lib/server/mcp/drive";
import { createTicket, getTicketById, getTicketsByEmail, updateTicket } from "@/lib/server/mcp/tickets";
import { searchKnowledge, seedKnowledgeBase } from "@/lib/server/mcp/knowledge";
import { createVerificationSession, getVerificationByChannel, getVerificationSession } from "@/lib/server/mcp/verify";
import { getAvailableDocuments, getDocumentById, seedSchoolDocuments } from "@/lib/server/mcp/documents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id?: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

function jsonRpcResult(id: string | number | undefined, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

function jsonRpcError(id: string | number | undefined, code: number, message: string, data?: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}

async function handleToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "search_documents": {
      const query = String(args.query || "");
      const maxResults = Number(args.maxResults || 5);
      if (!query) throw new Error("query is required");
      try {
        const files = await searchDocuments(query, maxResults);
        if (files.length === 0) {
          return { found: 0, message: "No documents found matching your query.", files: [] };
        }
        return { found: files.length, message: `Found ${files.length} document(s).`, files: files.map((f) => ({ id: f.id, name: f.name, type: f.mimeType, link: f.webViewLink, size: f.size, created: f.createdTime })) };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Drive API error";
        return { found: 0, message: msg, files: [] };
      }
    }

    case "get_document_content": {
      const fileId = String(args.fileId || "");
      if (!fileId) throw new Error("fileId is required");
      try {
        const content = await getDocumentContent(fileId);
        return { fileId, name: content.name, type: content.mimeType, content: content.text, summary: content.text.length > 500 ? content.text.slice(0, 500) + "..." : content.text };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to read document";
        return { fileId, error: msg };
      }
    }

    case "create_support_ticket": {
      const subject = String(args.subject || "");
      const description = String(args.description || "");
      if (!subject || !description) throw new Error("subject and description are required");
      const ticket = createTicket({ subject, description, priority: args.priority ? String(args.priority) : "medium", category: args.category ? String(args.category) : undefined, user_email: args.user_email ? String(args.user_email) : undefined });
      return { success: true, ticket: { id: ticket.id, subject: ticket.subject, status: ticket.status, priority: ticket.priority, category: ticket.category, created: new Date(ticket.created_at).toISOString() }, message: `Ticket #${ticket.id.slice(0, 8)} created successfully.` };
    }

    case "get_ticket_status": {
      const ticketId = args.ticketId ? String(args.ticketId) : undefined;
      const email = args.email ? String(args.email) : undefined;
      if (ticketId) {
        const ticket = getTicketById(ticketId);
        if (!ticket) return { found: false, message: "No ticket found with that ID." };
        return { found: true, ticket: { id: ticket.id, subject: ticket.subject, status: ticket.status, priority: ticket.priority, category: ticket.category, resolution: ticket.resolution, created: new Date(ticket.created_at).toISOString(), updated: new Date(ticket.updated_at).toISOString() } };
      }
      if (email) {
        const tickets = getTicketsByEmail(email);
        return { found: tickets.length, tickets: tickets.map((t) => ({ id: t.id, subject: t.subject, status: t.status, priority: t.priority, created: new Date(t.created_at).toISOString() })) };
      }
      throw new Error("Provide either ticketId or email");
    }

    case "update_ticket": {
      const ticketId = String(args.ticketId || "");
      if (!ticketId) throw new Error("ticketId is required");
      const updates: Record<string, string> = {};
      if (args.status) updates.status = String(args.status);
      if (args.priority) updates.priority = String(args.priority);
      if (args.resolution) updates.resolution = String(args.resolution);
      if (args.category) updates.category = String(args.category);
      const ticket = updateTicket(ticketId, updates);
      if (!ticket) return { success: false, message: "Ticket not found." };
      return { success: true, ticket: { id: ticket.id, subject: ticket.subject, status: ticket.status, priority: ticket.priority, resolution: ticket.resolution, updated: new Date(ticket.updated_at).toISOString() }, message: `Ticket updated. Status: ${ticket.status}.` };
    }

    case "search_knowledge_base": {
      const query = String(args.query || "");
      const maxResults = Number(args.maxResults || 3);
      if (!query) throw new Error("query is required");
      seedKnowledgeBase();
      const results = searchKnowledge(query, maxResults);
      if (results.length === 0) return { found: 0, message: "No knowledge base articles found.", articles: [] };
      return { found: results.length, message: `Found ${results.length} relevant article(s).`, articles: results.map((a) => ({ id: a.id, title: a.title, content: a.content, category: a.category, tags: a.tags })) };
    }

    case "initiate_verification": {
      const channelName = String(args.channel_name || args.channelName || "");
      const studentName = args.student_name || args.studentName ? String(args.student_name || args.studentName) : undefined;
      const studentId = args.student_id || args.studentId ? String(args.student_id || args.studentId) : undefined;
      if (!channelName) throw new Error("channel_name is required");
      const session = createVerificationSession({ channelName, studentName, studentId });
      return { verificationRequired: true, sessionId: session.id, message: "Verification initiated. Please direct the user to complete face verification on their screen. Tell them to look at the verification window that should appear.", method: "face" };
    }

    case "check_verification": {
      const sessionId = args.session_id || args.sessionId ? String(args.session_id || args.sessionId) : undefined;
      const channelName = args.channel_name || args.channelName ? String(args.channel_name || args.channelName) : undefined;
      let session;
      if (sessionId) {
        session = getVerificationSession(sessionId);
      } else if (channelName) {
        session = getVerificationByChannel(channelName);
      }
      if (!session) return { found: false, message: "No verification session found. Initiate verification first." };
      const verified = session.status === "verified";
      return { sessionId: session.id, verified, status: session.status, confidence: session.confidence, message: verified ? "Identity verified. You may now proceed with document requests." : session.status === "failed" ? "Verification failed. Please ask the user to try again." : "Verification is still pending. Ask the user to complete the verification on their screen." };
    }

    case "list_available_documents": {
      const docType = args.doc_type || args.docType ? String(args.doc_type || args.docType) : undefined;
      seedSchoolDocuments();
      const docs = getAvailableDocuments(docType);
      if (docs.length === 0) return { found: 0, message: "No documents available.", documents: [] };
      return { found: docs.length, documents: docs.map((d) => ({ id: d.id, type: d.doc_type, title: d.title, description: d.description })) };
    }

    case "get_school_document": {
      const docId = String(args.document_id || args.docId || "");
      if (!docId) throw new Error("document_id is required");
      seedSchoolDocuments();
      const doc = getDocumentById(docId);
      if (!doc) return { found: false, message: "Document not found." };
      return { found: true, document: { id: doc.id, type: doc.doc_type, title: doc.title, description: doc.description, content: doc.file_data, fileName: doc.file_name, mimeType: doc.mime_type, downloadLink: `/api/documents/${doc.id}/download` } };
    }

    case "request_identity_verification": {
      const method = String(args.method || "face");
      const reason = args.reason ? String(args.reason) : "to verify your identity";
      const channelName = args.channel_name || args.channelName ? String(args.channel_name || args.channelName) : undefined;
      let session;
      if (channelName) {
        session = createVerificationSession({ channelName });
      }
      return { verificationRequired: true, method, sessionId: session?.id, message: `Please complete ${method === "face" ? "face verification" : "ID verification"} ${reason}. A verification window should appear on your screen.` };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export async function POST(req: NextRequest) {
  let body: JsonRpcRequest;
  try {
    body = (await req.json()) as JsonRpcRequest;
  } catch {
    return NextResponse.json(jsonRpcError(undefined, -32700, "Parse error"), { status: 400 });
  }
  const { method, params, id } = body;
  console.log("[MCP] request", { method, id });
  try {
    switch (method) {
      case "tools/list":
        return NextResponse.json(jsonRpcResult(id, { tools: MCP_TOOLS }));
      case "tools/call": {
        if (!params || typeof params.name !== "string") {
          return NextResponse.json(jsonRpcError(id, -32602, "Invalid params: missing tool name"), { status: 400 });
        }
        const toolName = params.name;
        const toolArgs = (params.arguments || {}) as Record<string, unknown>;
        console.log("[MCP] tool call", { tool: toolName, args: toolArgs });
        try {
          const result = await handleToolCall(toolName, toolArgs);
          const content = typeof result === "string" ? result : JSON.stringify(result, null, 2);
          return NextResponse.json(jsonRpcResult(id, { content: [{ type: "text", text: content }] }));
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Tool execution error";
          return NextResponse.json(jsonRpcResult(id, { content: [{ type: "text", text: `Error: ${msg}` }], isError: true }));
        }
      }
      case "initialize":
        return NextResponse.json(jsonRpcResult(id, { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "sinta-school-ai", version: "1.0.0" } }));
      case "notifications/initialized":
        return NextResponse.json(jsonRpcResult(id, {}));
      default:
        return NextResponse.json(jsonRpcError(id, -32601, `Method not found: ${method}`), { status: 404 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[MCP] internal error", msg);
    return NextResponse.json(jsonRpcError(id, -32603, msg), { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ service: "Sinta School AI - MCP Server", version: "1.0.0", tools: MCP_TOOLS.length, endpoint: "/api/mcp" });
}