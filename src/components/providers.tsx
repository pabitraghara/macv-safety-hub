"use client";

import { ThemeProvider } from "next-themes";
import { LogtoProvider } from "@logto/react";
import { logtoConfig } from "@/lib/logto-config";
import { AuthProvider } from "@/lib/auth-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <LogtoProvider config={logtoConfig}>
        <AuthProvider>{children}</AuthProvider>
      </LogtoProvider>
    </ThemeProvider>
  );
}
