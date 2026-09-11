import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  metadataBase: new URL("https://app.macv.ai"),
  title: {
    default: "MacV Hub",
    template: "%s | MacV Hub",
  },
  description:
    "Incident, observation and vehicle monitoring across your sites.",
  applicationName: "MacV Hub",
  // Private dashboard — keep it out of search indexes.
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    title: "MacV Hub",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
