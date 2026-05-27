import Link from "next/link";

const navItems = [
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/security", label: "Security" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(14,116,144,0.30),transparent_34%),radial-gradient(circle_at_86%_16%,rgba(217,119,6,0.22),transparent_32%),radial-gradient(circle_at_50%_90%,rgba(14,165,233,0.24),transparent_38%)]" />
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight text-cyan-300">
            Sinta
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-slate-300 transition hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/assistant"
            className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Open Assistant
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-5 py-16">{children}</main>

      <footer className="relative z-10 border-t border-white/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-slate-300 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Sinta. School document support platform.</p>
          <div className="flex items-center gap-4">
            <Link href="/security" className="hover:text-white">
              Security
            </Link>
            <Link href="/contact" className="hover:text-white">
              Contact
            </Link>
            <Link href="/assistant" className="hover:text-white">
              Assistant
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
