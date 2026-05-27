import MarketingLayout from "../components/site/MarketingLayout";

const steps = [
  ["1. Start session", "Student opens the assistant and joins a secure voice channel."],
  ["2. Ask request", "The AI gathers needed details for the exact document or action."],
  ["3. Verify identity", "Face verification runs for protected requests when required."],
  ["4. Resolve and track", "Ticket gets created/updated and status is returned in the same conversation."],
];

export default function HowItWorksPage() {
  return (
    <MarketingLayout>
      <h1 className="text-4xl font-black text-white">How It Works</h1>
      <div className="mt-8 space-y-4">
        {steps.map(([title, text]) => (
          <div key={title} className="rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-6">
            <h2 className="text-xl font-bold text-cyan-200">{title}</h2>
            <p className="mt-2 text-slate-200">{text}</p>
          </div>
        ))}
      </div>
    </MarketingLayout>
  );
}
