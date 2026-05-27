import MarketingLayout from "../components/site/MarketingLayout";

export default function SecurityPage() {
  return (
    <MarketingLayout>
      <h1 className="text-4xl font-black text-white">Security</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-bold text-white">Identity Verification</h2>
          <p className="mt-2 text-sm text-slate-300">Face verification can be enforced before releasing sensitive records.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-bold text-white">Private API Keys</h2>
          <p className="mt-2 text-sm text-slate-300">Secrets stay server-side via Node runtime routes and environment variables.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-bold text-white">Operational Controls</h2>
          <p className="mt-2 text-sm text-slate-300">Registrar actions map to auditable tool calls and ticket updates.</p>
        </div>
      </div>
    </MarketingLayout>
  );
}
