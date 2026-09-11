"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";

/**
 * How often a relative label is recomputed. Fine enough that "just now" turns
 * into "a minute ago" while someone is looking at it, coarse enough to be
 * invisible next to the 3-second position poll.
 */
const RELATIVE_TIME_REFRESH_MS = 15000;

function relativeLabel(
  timestamp: string | null | undefined,
  fallback: string,
): string {
  if (!timestamp) return fallback;
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return timestamp;
  }
}

/**
 * A relative timestamp ("2 minutes ago") that keeps counting.
 *
 * The clock is read in an interval rather than only at mount: an alert banner
 * or a crane card that is not re-rendered — because nothing about it changed —
 * would otherwise sit there claiming the breach opened "a few seconds ago"
 * long after it did, which is exactly the number an operator acts on.
 */
export function useRelativeTime(
  timestamp: string | null | undefined,
  fallback = "never",
): string {
  // A bare counter rather than the label itself: the timer only needs to say
  // "time has passed", and keeping the formatting in render means a changed
  // `timestamp` is reflected immediately instead of at the next tick.
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setTick((value) => value + 1),
      RELATIVE_TIME_REFRESH_MS,
    );
    return () => clearInterval(timer);
  }, []);

  return useMemo(
    () => relativeLabel(timestamp, fallback),
    // `tick` is the whole point of the dependency list here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [timestamp, fallback, tick],
  );
}
