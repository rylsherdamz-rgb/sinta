import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Sinta | AI Student Services",
    template: "%s | Sinta",
  },
  description:
    "Voice-first school document assistant for transcript requests, verification, and registrar support.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="app-shell antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <div className="app-shell-background" aria-hidden />
          <div className="app-shell-content">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
