"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { CartItemView } from "@/lib/cart";
import { computeCartTotals, GREETING_CARD_FEE } from "@/lib/pricing";
import { addDaysIso } from "@/lib/date";

export const GREETING_CARD_MAX_LENGTH = 200;

interface CartContextValue {
  items: CartItemView[];
  count: number;
  totals: ReturnType<typeof computeCartTotals>;
  minPickupDate: string;
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

async function cartRequest(method: string, body?: unknown): Promise<CartItemView[]> {
  const res = await fetch("/api/cart", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error("Cart request failed");
  const data = await res.json();
  return data.items as CartItemView[];
}

export function CartProvider({
  initialItems,
  children,
}: {
  initialItems: CartItemView[];
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<CartItemView[]>(initialItems);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [discountPct, setDiscountPct] = useState(0);
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [couponStatus, setCouponStatus] = useState<"idle" | "success" | "error">("idle");
  const [greetingCardEnabled, setGreetingCardEnabled] = useState(false);
  const [greetingCardMessage, setGreetingCardMessage] = useState("");

  const count = items.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = items.reduce((sum, item) => sum + item.priceBeforeVat * item.qty, 0);
  const extraFee = greetingCardEnabled ? GREETING_CARD_FEE : 0;
  const totals = useMemo(
    () => computeCartTotals(subtotal, discountPct, extraFee),
    [subtotal, discountPct, extraFee]
  );
  const maxLeadTime = items.reduce((max, item) => Math.max(max, item.leadTimeDays), 0);
  const minPickupDate = useMemo(() => addDaysIso(maxLeadTime), [maxLeadTime]);

  const addItem = useCallback(async (productSizeId: string, qty = 1) => {
    setIsLoading(true);
    try {
      const updated = await cartRequest("POST", { productSizeId, qty });
      setItems(updated);
      setIsOpen(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateQty = useCallback(async (cartItemId: string, qty: number) => {
    setIsLoading(true);
    try {
      const updated = await cartRequest("PATCH", { cartItemId, qty });
      setItems(updated);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeItem = useCallback(async (cartItemId: string) => {
    setIsLoading(true);
    try {
      const updated = await cartRequest("DELETE", { cartItemId });
      setItems(updated);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const applyCoupon = useCallback(async (code: string) => {
    if (!code.trim()) {
      setDiscountPct(0);
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
    if (data.valid) {
      setDiscountPct(data.discountPct);
      setCouponCode(code.trim().toUpperCase());
      setCouponStatus("success");
    } else {
      setDiscountPct(0);
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
    open: () => setIsOpen(true),
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
