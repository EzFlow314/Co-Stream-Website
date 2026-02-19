import "./globals.css";
import "@/src/styles/theme.css";
import type { Metadata } from "next";
import { BRAND } from "@/src/config/brand";
import { ThemeProvider } from "@/components/theme-provider";
import { HelperBot } from "@/components/support/helper-bot";

export const metadata: Metadata = {
  title: `${BRAND.name} | ${BRAND.tagline}`,
  description: "EzPlay is the fun esports co-stream arena for crews, battles, and live interactive viewers.",
  openGraph: {
    title: `${BRAND.name} Arena`,
    description: BRAND.tagline,
    siteName: BRAND.name,
    type: "website"
  },
  icons: {
    icon: "/icon.svg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
          <HelperBot />
        </ThemeProvider>
      </body>
    </html>
  );
}
