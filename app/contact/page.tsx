import Link from "next/link";
import MarketingLayout from "../components/site/MarketingLayout";

export default function ContactPage() {
  return (
    <MarketingLayout>
      <h1 className="text-4xl font-black text-white">Contact</h1>
      <p className="mt-3 max-w-2xl text-slate-300">Need deployment help or registrar onboarding? Use these channels.</p>
      <div className="mt-8 space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="font-bold text-white">Support</h2>
          <p className="mt-2 text-slate-300">Email: support@sinta.ai</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="font-bold text-white">Try the product</h2>
          <p className="mt-2 text-slate-300">Open the live experience and start a voice session.</p>
          <Link href="/assistant" className="mt-3 inline-flex rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950">
            Open Assistant
          </Link>
        </div>
      </div>
    </MarketingLayout>
  );
}
