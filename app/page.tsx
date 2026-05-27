import Link from "next/link";
import MarketingLayout from "./components/site/MarketingLayout";

export default function LandingPage() {
  return (
    <MarketingLayout>
      <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-200">
            AI Student Services
          </p>
          <h1 className="mt-5 text-4xl font-black leading-tight text-white md:text-6xl">
            Your school documents, requested by voice in under a minute.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-300">
            Sinta helps students request transcripts, certificates, and billing records through secure voice conversations and guided verification.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/assistant" className="rounded-full bg-amber-400 px-6 py-3 font-semibold text-slate-950 hover:bg-amber-300">
              Launch Assistant
            </Link>
            <Link href="/how-it-works" className="rounded-full border border-white/20 px-6 py-3 font-semibold text-white hover:bg-white/10">
              See the flow
            </Link>
          </div>
        </div>
        <div className="rounded-3xl border border-white/15 bg-slate-900/70 p-6 shadow-2xl">
          <h2 className="text-xl font-bold text-white">What students get</h2>
          <ul className="mt-4 space-y-3 text-slate-300">
            <li className="rounded-xl bg-white/5 p-4">Real-time voice + chat support with your AI agent</li>
            <li className="rounded-xl bg-white/5 p-4">Identity checks before releasing private records</li>
            <li className="rounded-xl bg-white/5 p-4">Direct ticket creation for registrar follow-up</li>
          </ul>
        </div>
      </section>
    </MarketingLayout>
  );
}
