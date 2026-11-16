"use client";

import { track } from "@/lib/analytics/client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CartItemView } from "@/lib/cart";
import { computeCartTotals, GREETING_CARD_FEE, VAT_RATE } from "@/lib/pricing";
import { shiftIso, todayIsraelIso } from "@/lib/date";
import { pctForCart, type CouponValue } from "@/lib/couponMath";

export const GREETING_CARD_MAX_LENGTH = 200;

interface CartContextValue {
  items: CartItemView[];
  count: number;
  totals: ReturnType<typeof computeCartTotals>;
  minPickupDate: string;
  /** Minimum order in shekels incl. VAT (0 = none), the amount counted toward it, and whether the cart is still short. */
  minOrder: number;
  amountTowardMinOrder: number;
  belowMinOrder: boolean;
  missingForMinOrder: number;
  discountPct: number;
  couponCode: string;
  couponMessage: string;
  couponStatus: "idle" | "success" | "error";
  greetingCardEnabled: boolean;
  greetingCardMessage: string;
  setGreetingCardEnabled: (enabled: boolean) => void;
  setGreetingCardMessage: (message: string) => void;
  isOpen: boolean;
  isLoading: boolean;
  open: () => void;
  close: () => void;
  addItem: (productSizeId: string, qty?: number) => Promise<void>;
  updateQty: (cartItemId: string, qty: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

async function cartRequest(method: string, body?: unknown): Promise<{ items: CartItemView[]; minOrder?: number }> {
  const res = await fetch("/api/cart", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error("Cart request failed");
  return (await res.json()) as { items: CartItemView[]; minOrder?: number };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Fetched client-side after mount rather than server-rendered in the root
  // layout: the layout wraps every page, and awaiting the cart there (2-3
  // sequential Supabase round trips) blocked the first paint of every
  // navigation on the site, cart-related or not.
  const [items, setItems] = useState<CartItemView[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [minOrder, setMinOrder] = useState(0);
  // The applied coupon (a percentage or a fixed amount); the effective percentage follows the cart as it changes.
  const [couponValue, setCouponValue] = useState<CouponValue | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [couponStatus, setCouponStatus] = useState<"idle" | "success" | "error">("idle");
  const [greetingCardEnabled, setGreetingCardEnabled] = useState(false);
  const [greetingCardMessage, setGreetingCardMessage] = useState("");

  const count = items.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = items.reduce((sum, item) => sum + item.priceBeforeVat * item.qty, 0);
  const extraFee = greetingCardEnabled ? GREETING_CARD_FEE : 0;
  const discountPct = couponValue ? pctForCart(subtotal, couponValue) : 0;
  const totals = useMemo(
    () => computeCartTotals(subtotal, discountPct, extraFee),
    [subtotal, discountPct, extraFee]
  );
  // Minimum order: the products before any coupon, VAT included (the greeting card extra doesn't count).
  const amountTowardMinOrder = totals.subtotal * (1 + VAT_RATE);
  const belowMinOrder = minOrder > 0 && items.length > 0 && amountTowardMinOrder < minOrder - 0.005;
  const missingForMinOrder = belowMinOrder ? Math.ceil(minOrder - amountTowardMinOrder) : 0;
  const maxLeadTime = items.reduce((max, item) => Math.max(max, item.leadTimeDays), 0);
  const minPickupDate = useMemo(() => shiftIso(todayIsraelIso(), maxLeadTime), [maxLeadTime]);

  useEffect(() => {
    let cancelled = false;
    cartRequest("GET")
      .then((fetched) => {
        if (cancelled) return;
        setItems(fetched.items);
        setMinOrder(fetched.minOrder ?? 0);
      })
      .catch(() => {
        // Cart stays empty client-side; the drawer will pick up the real
        // state on the next successful add/update/remove call.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Re-reads the cart and the minimum order (they may have changed since this page loaded). */
  const refresh = useCallback(() => {
    cartRequest("GET")
      .then((fetched) => {
        setItems(fetched.items);
        if (typeof fetched.minOrder === "number") setMinOrder(fetched.minOrder);
      })
      .catch(() => {});
  }, []);

  // A tab left open while the owner changed the minimum: pick it up again when the visitor comes back to it.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  const addItem = useCallback(async (productSizeId: string, qty = 1) => {
    setIsLoading(true);
    // Open right away: the server round trip takes a moment, and a click
    // that visibly does nothing for that long feels broken.
    setIsOpen(true);
    try {
      const updated = await cartRequest("POST", { productSizeId, qty });
      setItems(updated.items);
      if (typeof updated.minOrder === "number") setMinOrder(updated.minOrder);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateQty = useCallback(async (cartItemId: string, qty: number) => {
    setIsLoading(true);
    try {
      const updated = await cartRequest("PATCH", { cartItemId, qty });
      setItems(updated.items);
      if (typeof updated.minOrder === "number") setMinOrder(updated.minOrder);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeItem = useCallback(async (cartItemId: string) => {
    track("remove_from_cart");
    setIsLoading(true);
    try {
      const updated = await cartRequest("DELETE", { cartItemId });
      setItems(updated.items);
      if (typeof updated.minOrder === "number") setMinOrder(updated.minOrder);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const applyCoupon = useCallback(async (code: string) => {
    if (!code.trim()) {
      setCouponValue(null);
      setCouponMessage("");
      setCouponStatus("idle");
      return;
    }
    const res = await fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    track("coupon_apply", { valid: Boolean(data.valid) });
    if (data.valid) {
      setCouponValue({ kind: data.kind === "amount" ? "amount" : "percent", pct: data.discountPct ?? 0, amount: data.discountAmount ?? 0 });
      setCouponCode(code.trim().toUpperCase());
      setCouponStatus("success");
    } else {
      setCouponValue(null);
      setCouponCode("");
      setCouponStatus("error");
    }
    setCouponMessage(data.message);
  }, []);

  const value: CartContextValue = {
    items,
    count,
    totals,
    minPickupDate,
    minOrder,
    amountTowardMinOrder,
    belowMinOrder,
    missingForMinOrder,
    discountPct,
    couponCode,
    couponMessage,
    couponStatus,
    greetingCardEnabled,
    greetingCardMessage,
    setGreetingCardEnabled,
    setGreetingCardMessage: (message: string) => setGreetingCardMessage(message.slice(0, GREETING_CARD_MAX_LENGTH)),
    isOpen,
    isLoading,
    open: () => {
      track("cart_open");
      setIsOpen(true);
      refresh();
    },
    close: () => setIsOpen(false),
    addItem,
    updateQty,
    removeItem,
    applyCoupon,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
