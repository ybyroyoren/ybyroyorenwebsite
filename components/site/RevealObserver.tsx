"use client";

import { useEffect } from "react";

// Marks [data-reveal] elements with data-in as they scroll into view, which
// starts their entrance animation (see "motion" in app/globals.css). Elements
// that arrive together are staggered automatically. Also picks up elements
// added later (client-side navigation, filtered lists) via a MutationObserver.
export function RevealObserver() {
  useEffect(() => {
    const html = document.documentElement;

    if (typeof IntersectionObserver === "undefined") {
      document.querySelectorAll("[data-reveal]").forEach((el) => el.setAttribute("data-in", ""));
      html.setAttribute("data-reveal-ready", "");
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        let order = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          if (!el.style.getPropertyValue("--i")) el.style.setProperty("--i", String(Math.min(order++, 6)));
          el.setAttribute("data-in", "");
          io.unobserve(el);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -4% 0px" }
    );

    const observeWithin = (root: ParentNode) => {
      root.querySelectorAll("[data-reveal]:not([data-in])").forEach((el) => io.observe(el));
    };

    observeWithin(document);
    html.setAttribute("data-reveal-ready", "");

    const mo = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches("[data-reveal]:not([data-in])")) io.observe(node);
          observeWithin(node);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
