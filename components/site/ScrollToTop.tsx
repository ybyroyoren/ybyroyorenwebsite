"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * A new page should open at its top. Next.js keeps the scroll position when the
 * new page's first element is still somewhere in the viewport — which, with the
 * page wrapped in a tall layout, is always the case — so someone at the bottom of
 * one page landed at the bottom of the next. This scrolls to the top on every
 * route change, except back/forward navigation, where the browser's remembered
 * position is the right one.
 */
export function ScrollToTop() {
  const pathname = usePathname();
  const first = useRef(true);
  const fromHistory = useRef(false);

  useEffect(() => {
    const onPop = () => {
      fromHistory.current = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (fromHistory.current) {
      fromHistory.current = false;
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return null;
}
