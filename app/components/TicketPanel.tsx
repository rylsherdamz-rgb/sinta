"use client";

import { AlertCircle, Clock, CheckCircle2 } from "lucide-react";

interface TicketData {
  id: string;
  subject: string;
  status: string;
  priority: string;
  category?: string;
  resolution?: string;
  created?: string;
  updated?: string;
}

interface TicketPanelProps {
  tickets: TicketData[];
  loading: boolean;
}

const priorityColors: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-400 border-red-500/20",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/15",
  low: "bg-green-500/10 text-green-400 border-green-500/15",
};

const statusIcon: Record<string, React.ReactNode> = {
  open: <AlertCircle size={11} className="text-red-400" />,
  in_progress: <Clock size={11} className="text-blue-400" />,
  resolved: <CheckCircle2 size={11} className="text-green-400" />,
  closed: <CheckCircle2 size={11} className="text-white/20" />,
};

export default function TicketPanel({ tickets, loading }: TicketPanelProps) {
  return (
    <div className="space-y-2">
      <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest px-5 pt-3">Tickets</p>
      <div className="px-5 pb-4 space-y-2">
        {loading && (
          <div className="flex items-center gap-3 py-8 justify-center">
            <div className="w-4 h-4 border-2 border-white/10 border-t-indigo-400 rounded-full animate-spin" />
            <span className="text-xs text-white/25">Loading tickets...</span>
          </div>
        )}
        {!loading && tickets.length === 0 && (
          <p className="text-[11px] text-white/20 text-center py-6 italic">
            No tickets yet. Describe your issue.
          </p>
        )}
        {tickets.map((ticket) => (
          <div key={ticket.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:border-white/[0.1] transition-all msg-enter">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-xs font-medium text-white/80 truncate flex-1">{ticket.subject}</p>
              <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border ${priorityColors[ticket.priority] || "bg-white/5 text-white/30 border-white/[0.08]"}`}>
                {ticket.priority}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[9px] text-white/25">
              <span className="font-mono">#{ticket.id.slice(0, 8)}</span>
              <span className="flex items-center gap-1">
                {statusIcon[ticket.status] || <span className="w-3" />}
                {ticket.status.replace("_", " ")}
              </span>
              {ticket.created && <span>{new Date(ticket.created).toLocaleDateString()}</span>}
            </div>
            {ticket.resolution && (
              <p className="text-[10px] text-white/30 mt-2 leading-relaxed border-t border-white/[0.04] pt-2">
                {ticket.resolution}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}