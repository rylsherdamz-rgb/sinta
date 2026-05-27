import MarketingLayout from "../components/site/MarketingLayout";

const items = [
  ["Voice-first requests", "Students describe what they need naturally without filling long forms."],
  ["Automated ticketing", "Support tickets are created and updated through MCP tools in real time."],
  ["Knowledge search", "The agent can search policy docs and answer with school-specific guidance."],
  ["Document workflows", "Handles transcripts, enrollment certificates, and billing records."],
  ["Face verification", "Sensitive requests can trigger verification before processing."],
  ["Built for operations", "Runs on Next.js with API endpoints and SQLite-backed records."],
];

export default function FeaturesPage() {
  return (
    <MarketingLayout>
      <h1 className="text-4xl font-black text-white">Features</h1>
      <p className="mt-3 max-w-2xl text-slate-300">Sinta combines voice, automation, and campus workflows into one service desk experience.</p>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {items.map(([title, text]) => (
          <article key={title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <p className="mt-2 text-slate-300">{text}</p>
          </article>
        ))}
      </div>
    </MarketingLayout>
  );
}
