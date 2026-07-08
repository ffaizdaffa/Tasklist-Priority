import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "ANTARESTAR · Social Command Center",
  description:
    "Social Media Command Center for ANTARESTAR — Apify data + Gemini AI. Not a dashboard, an operating system.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 min-w-0 lg:ml-[248px]">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
