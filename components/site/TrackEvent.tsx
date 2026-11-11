"use client";

import { useEffect } from "react";
import { track, type EventType } from "@/lib/analytics/client";

/** Fires one analytics event when it appears on the page (for server-rendered pages: product page, payment success...). */
export function TrackEvent({
  type,
  props,
  value,
  dedupe,
}: {
  type: EventType;
  props?: Record<string, unknown>;
  value?: number;
  dedupe?: string;
}) {
  const key = JSON.stringify(props ?? {});
  useEffect(() => {
    track(type, JSON.parse(key), { value, dedupe });
  }, [type, key, value, dedupe]);
  return null;
}
