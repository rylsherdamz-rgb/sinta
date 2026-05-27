import MarketingLayout from "../components/site/MarketingLayout";

const faqs = [
  {
    q: "How do students request a document?",
    a: "Students open the assistant, state the document needed, and complete verification when required.",
  },
  {
    q: "Does Sinta support live status updates?",
    a: "Yes. Request updates are tracked through the ticket and MCP tool workflow.",
  },
  {
    q: "Can we enforce identity checks?",
    a: "Yes. Face verification can be required before any protected record is released.",
  },
  {
    q: "Can we deploy this on Render?",
    a: "Yes. The app is configured for Render with `/api/mcp` as health check.",
  },
];

export default function FaqPage() {
  return (
    <MarketingLayout>
      <h1 className="text-4xl font-black text-white">FAQ</h1>
      <div className="mt-8 space-y-4">
        {faqs.map((item) => (
          <article key={item.q} className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-bold text-cyan-200">{item.q}</h2>
            <p className="mt-2 text-slate-200">{item.a}</p>
          </article>
        ))}
      </div>
    </MarketingLayout>
  );
}
