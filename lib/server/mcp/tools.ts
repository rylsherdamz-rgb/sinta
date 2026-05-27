export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, { type: string; description: string; enum?: string[]; default?: unknown }>;
    required?: string[];
  };
}

export const MCP_TOOLS: McpTool[] = [
  {
    name: "search_documents",
    description: "Search the school document repository for documents matching a query. Returns document names, IDs, types, and metadata.",
    inputSchema: { type: "object", properties: { query: { type: "string", description: "Search terms to find documents" }, maxResults: { type: "number", description: "Maximum number of results to return", default: 5 } }, required: ["query"] },
  },
  {
    name: "get_document_content",
    description: "Retrieve the full content of a specific document by its file ID. Use this after search_documents to get the actual document content.",
    inputSchema: { type: "object", properties: { fileId: { type: "string", description: "The Google Drive file ID" } }, required: ["fileId"] },
  },
  {
    name: "create_support_ticket",
    description: "Create a support ticket for a student issue (e.g., document not found, incorrect records, delivery request). Use this when a student has a problem that needs follow-up.",
    inputSchema: { type: "object", properties: { subject: { type: "string", description: "Brief summary of the issue" }, description: { type: "string", description: "Detailed description of the issue" },       priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "Issue priority level" },
      category: { type: "string", enum: ["documents", "enrollment", "records", "technical", "other"], description: "Category of the issue" },
      user_email: { type: "string", description: "Email address of the student reporting the issue" } }, required: ["subject", "description"] },
  },
  {
    name: "get_ticket_status",
    description: "Look up the status of an existing support ticket by ticket ID or user email.",
    inputSchema: { type: "object", properties: { ticketId: { type: "string", description: "The ticket ID to look up" }, email: { type: "string", description: "User email to find their tickets" } } },
  },
  {
    name: "search_knowledge_base",
    description: "Search the school knowledge base for FAQs, policies, and answers about enrollment, documents, verification, and school info.",
    inputSchema: { type: "object", properties: { query: { type: "string", description: "Search query for knowledge base" }, maxResults: { type: "number", description: "Maximum results to return", default: 3 } }, required: ["query"] },
  },
  {
    name: "request_identity_verification",
    description: "Request the user to verify their identity through face scan or ID card before sharing sensitive documents. Triggers a verification window on the user's device.",
    inputSchema: { type: "object", properties: { method: { type: "string", enum: ["face", "id_card"], description: "Verification method" }, reason: { type: "string", description: "Explain to the user why verification is needed" }, channel_name: { type: "string", description: "The Agora channel name for this session" } }, required: ["method"] },
  },
  {
    name: "initiate_verification",
    description: "Create a new verification session for the current conversation. Use this before asking the user to verify their identity. Returns a session ID for tracking.",
    inputSchema: { type: "object", properties: { channel_name: { type: "string", description: "The Agora channel name" }, student_name: { type: "string", description: "Student's claimed name" }, student_id: { type: "string", description: "Student's claimed ID number" } }, required: ["channel_name"] },
  },
  {
    name: "check_verification",
    description: "Check if a verification session has been completed. Call this after requesting verification to see if the user has verified.",
    inputSchema: { type: "object", properties: { session_id: { type: "string", description: "The verification session ID" }, channel_name: { type: "string", description: "The Agora channel name" } } },
  },
  {
    name: "list_available_documents",
    description: "List all school documents available for the user. Use this to show what documents a student can request (transcripts, certificates, bank statements, etc.).",
    inputSchema: { type: "object", properties: { doc_type: { type: "string", enum: ["transcript", "enrollment", "bank_statement", "school_id"], description: "Filter by document type" } } },
  },
  {
    name: "get_school_document",
    description: "Retrieve a specific school document by ID. Only call this AFTER the user has been verified. Returns the document content and download link.",
    inputSchema: { type: "object", properties: { document_id: { type: "string", description: "The document ID from list_available_documents" } }, required: ["document_id"] },
  },
  {
    name: "update_ticket",
    description: "Update an existing support ticket with new information, status change, or resolution.",
    inputSchema: { type: "object", properties: { ticketId: { type: "string", description: "The ticket ID to update" }, status: { type: "string", enum: ["open", "in_progress", "resolved", "closed"], description: "New status" }, resolution: { type: "string", description: "Resolution notes" }, priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "Updated priority" } }, required: ["ticketId"] },
  },
];