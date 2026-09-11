"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { BrandSplash } from "@/components/auth/BrandSplash";
import { RedirectingToSignIn } from "@/components/auth/RedirectingToSignIn";

/**
 * Canonical sign-in entry (direct visits, sign-out landing, callback errors).
 * Protected routes now redirect to auth.macv.ai straight from the guard, so
 * most users never see this page. It renders only the brand splash — no hero —
 * then hands off to the (identically-styled) sign-in page with no flicker.
 */
export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // Already signed in — drop any stale destination and go home.
      sessionStorage.removeItem("logto_return_to");
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, router]);

  // While the SDK settles, or if we're about to bounce an authenticated user
  // home, show the plain splash rather than firing a redundant sign-in.
  if (isLoading || isAuthenticated) {
    return <BrandSplash />;
  }

  return <RedirectingToSignIn />;
}
