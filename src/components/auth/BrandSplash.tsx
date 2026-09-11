"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BrandSplashProps {
  /** When true, sign-in couldn't be reached — show a manual retry. */
  failed?: boolean;
  onRetry?: () => void;
}

/**
 * Full-screen brand-matched loading screen shown while the SDK boots and the
 * browser hands off to auth.macv.ai. It intentionally renders on the app's
 * `bg-background` (same token the branded auth UI uses) with just the logo and
 * a spinner, so the transition to the sign-in page reads as one continuous
 * surface rather than a hero page that flashes and jumps.
 */
export function BrandSplash({ failed, onRetry }: BrandSplashProps) {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <img
        src="/macv-logo-dark.png"
        alt="MacV"
        className="h-9 w-auto dark:brightness-0 dark:invert"
      />

      {failed ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-muted-foreground text-sm">
            Couldn&apos;t reach sign-in. Check your connection.
          </p>
          <Button
            size="lg"
            onClick={onRetry}
            className="h-11 bg-[#00a690] text-sm font-medium tracking-wide text-white transition-all duration-200 hover:bg-[#009480] active:scale-[0.98]"
          >
            Try again
          </Button>
        </div>
      ) : (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span role="status">Signing you in…</span>
        </div>
      )}
    </div>
  );
}
