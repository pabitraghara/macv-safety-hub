"use client";

import { useLogto } from "@logto/react";
import { useEffect, useRef, useState } from "react";
import { BrandSplash } from "./BrandSplash";

interface RedirectingToSignInProps {
  /**
   * When true, remember the current path so the callback returns the user here
   * after sign-in. Set by the route guard (a deep link); left false on /login,
   * which has no meaningful path to preserve.
   */
  captureReturnTo?: boolean;
}

/**
 * Fires Logto's `signIn()` immediately and shows the brand splash while the
 * browser navigates to auth.macv.ai. Rendering this instead of routing through
 * a full /login page is what removes the visible hero flicker: the user goes
 * straight from wherever they were to the (identically-styled) sign-in page.
 *
 * A ref guards against React StrictMode's double-invoke and against re-firing
 * once the SDK settles; on network failure we re-arm and surface a retry.
 */
export function RedirectingToSignIn({
  captureReturnTo = false,
}: RedirectingToSignInProps) {
  const { signIn } = useLogto();
  const started = useRef(false);
  const [failed, setFailed] = useState(false);

  const start = () => {
    if (started.current) return;
    started.current = true;
    setFailed(false);
    if (captureReturnTo) {
      sessionStorage.setItem(
        "logto_return_to",
        window.location.pathname + window.location.search,
      );
    }
    signIn({ redirectUri: `${window.location.origin}/callback` }).catch(() => {
      // signIn() only rejects on a failure before it can navigate away.
      started.current = false;
      setFailed(true);
    });
  };

  useEffect(() => {
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <BrandSplash failed={failed} onRetry={start} />;
}
