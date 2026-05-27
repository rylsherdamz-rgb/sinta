"use client";

import { useState, useEffect } from "react";
import { FileText, Download, GraduationCap, CreditCard, FileCheck, Ban, Eye, Loader2, ShieldOff } from "lucide-react";

interface SchoolDoc {
  id: string;
  doc_type: string;
  title: string;
  description: string;
}

interface DocDetail {
  id: string;
  type: string;
  title: string;
  description: string;
  content: string;
  fileName: string;
  mimeType: string;
  downloadLink: string;
}

const docIcons: Record<string, React.ReactNode> = {
  transcript: <GraduationCap size={15} />,
  enrollment: <FileCheck size={15} />,
  bank_statement: <CreditCard size={15} />,
  school_id: <FileCheck size={15} />,
};

const docColors: Record<string, string> = {
  transcript: "border-indigo-500/25 bg-indigo-500/8 hover:border-indigo-500/45",
  enrollment: "border-emerald-500/25 bg-emerald-500/8 hover:border-emerald-500/45",
  bank_statement: "border-amber-500/25 bg-amber-500/8 hover:border-amber-500/45",
  school_id: "border-violet-500/25 bg-violet-500/8 hover:border-violet-500/45",
};

const docLabelColors: Record<string, string> = {
  transcript: "text-indigo-400 bg-indigo-500/15",
  enrollment: "text-emerald-400 bg-emerald-500/15",
  bank_statement: "text-amber-400 bg-amber-500/15",
  school_id: "text-violet-400 bg-violet-500/15",
};

const docLabels: Record<string, string> = {
  transcript: "Transcript",
  enrollment: "Enrollment",
  bank_statement: "Bank Statement",
  school_id: "School ID",
};

export default function DocumentViewer() {
  const [docs, setDocs] = useState<SchoolDoc[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const listRes = await fetch("/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "list_available_documents", arguments: {} },
        }),
      });
      const data = await listRes.json();
      const result = JSON.parse(data.result.content[0].text);
      setDocs(result.documents || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDocuments(); }, []);

  const openDocument = async (doc: SchoolDoc) => {
    setSelectedId(doc.id);
    setLoading(true);
    try {
      const res = await fetch("/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "get_school_document", arguments: { document_id: doc.id } },
        }),
      });
      const data = await res.json();
      const result = JSON.parse(data.result.content[0].text);
      if (result.found) setSelectedDoc(result.document);
    } catch { /* ignore */ }
    finally { setLoading(false); setSelectedId(null); }
  };

  const downloadDocument = async (doc: DocDetail) => {
    const res = await fetch(`/api/documents/${doc.id}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.fileName || "document.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-[#0c0c18] rounded-xl border border-white/[0.08] overflow-hidden">
      <div className="p-4 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <FileText size={14} className="text-indigo-400" />
          <h3 className="text-sm font-semibold text-white/80">Your Documents</h3>
        </div>
        <p className="text-[11px] text-white/40 mt-0.5">Verified documents available for download</p>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-2.5">
        {loading && docs.length === 0 && (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="text-indigo-400/50 animate-spin" />
          </div>
        )}

        {!loading && docs.length === 0 && (
          <div className="text-center py-10">
            <ShieldOff size={28} className="mx-auto text-white/20 mb-3" />
            <p className="text-xs text-white/50 font-medium">No documents yet</p>
            <p className="text-[11px] text-white/30 mt-1">Verify your identity to access documents</p>
          </div>
        )}

        {docs.map((doc) => (
          <button
            key={doc.id}
            onClick={() => openDocument(doc)}
            disabled={selectedId === doc.id}
            className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${docColors[doc.doc_type] || "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"} ${selectedId === doc.id ? "opacity-60" : ""}`}
          >
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${docLabelColors[doc.doc_type] || "text-white/40 bg-white/[0.05]"}`}>
                {docIcons[doc.doc_type] || <FileText size={13} />}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white/70 truncate">{doc.title}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold flex-shrink-0 ${docLabelColors[doc.doc_type] || "text-white/30 bg-white/[0.05]"}`}>
                    {docLabels[doc.doc_type] || doc.doc_type}
                  </span>
                </div>
                <p className="text-[11px] text-white/35 mt-0.5 truncate">{doc.description}</p>
              </div>
              {selectedId === doc.id ? <Loader2 size={14} className="animate-spin text-indigo-400/50 flex-shrink-0 mt-1" /> : <Eye size={14} className="text-white/25 flex-shrink-0 mt-1" />}
            </div>
          </button>
        ))}
      </div>

      {selectedDoc && (
        <div className="flex-shrink-0 border-t border-white/[0.06] p-4 bg-[#0a0a16]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-white/80">{selectedDoc.title}</p>
              <p className="text-[11px] text-white/40">{selectedDoc.type}</p>
            </div>
            <button
              onClick={() => downloadDocument(selectedDoc)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/25 text-indigo-400 text-xs font-semibold hover:bg-indigo-500/30 transition-all active:scale-95"
            >
              <Download size={13} />Download
            </button>
          </div>
          <pre className="text-[11px] text-white/50 bg-black/40 rounded-lg p-3.5 max-h-40 overflow-auto whitespace-pre-wrap leading-relaxed font-mono border border-white/[0.04]">
            {selectedDoc.content?.slice(0, 1000)}
            {(selectedDoc.content?.length || 0) > 1000 && <span className="text-white/30">... (truncated)</span>}
          </pre>
        </div>
      )}
    </div>
  );
}
