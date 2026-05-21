"use client";

import { useState } from "react";
import { usePiAuth } from "@/contexts/pi-auth-context";
import { usePurchase } from "@/lib/pi-payment";

interface TipButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function TipButton({ onSuccess, onError }: TipButtonProps) {
  const { isAuthenticated, products } = usePiAuth();
  const { makePurchase } = usePurchase();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ FIXED: use correct product system (NO Mongo IDs, NO PRODUCT_CONFIG)
  const tipProduct = products?.find((p) => p.id === "tip-small") ?? null;

  const amount = tipProduct?.price_in_pi ?? 0.1;

  const handleTip = async () => {
    setError(null);

    // 🔒 auth guard
    if (!isAuthenticated) {
      const msg = "Pi not connected. Please open inside Pi Browser and authenticate.";
      setError(msg);
      onError?.(msg);
      return;
    }

    // 🔒 product guard
    if (!tipProduct) {
      const msg = "Tip product is not configured correctly.";
      setError(msg);
      onError?.(msg);
      return;
    }

    setIsLoading(true);

    try {
      const result = await makePurchase(tipProduct.id);

      console.log("[TipButton] Success:", result);

      setIsLoading(false);
      onSuccess?.();
    } catch (err: any) {
      setIsLoading(false);

      // user cancel (Pi sometimes doesn't always send structured error)
      if (
        err?.message?.toLowerCase?.().includes("cancel") ||
        err?.code === "purchase_cancelled"
      ) {
        return;
      }

      const msg =
        err?.message || "Failed to process tip. Please try again.";

      console.error("[TipButton] Error:", err);

      setError(msg);
      onError?.(msg);
    }
  };

  const isDisabled = isLoading || !isAuthenticated || !tipProduct;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button
        onClick={handleTip}
        disabled={isDisabled}
        className="w-full rounded-2xl py-3 font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
        style={{
          background: isDisabled
            ? "rgba(212,175,55,0.20)"
            : "rgba(212,175,55,0.88)",
          color: isDisabled ? "#7a6820" : "#07091a",
          border: "none",
          fontSize: 13,
          letterSpacing: "0.02em",
          cursor: isDisabled ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.7 : 1,
        }}
      >
        {isLoading ? (
          <>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                border: "2px solid rgba(7,9,26,0.3)",
                borderTopColor: "#07091a",
                animation: "spin 0.7s linear infinite",
              }}
            />
            Processing...
          </>
        ) : !tipProduct ? (
          "Tip Unavailable"
        ) : (
          <>
            <span style={{ fontSize: 14 }}>π</span>
            Send {amount} Pi Tip
          </>
        )}
      </button>

      {error && (
        <div
          role="alert"
          className="rounded-xl px-3 py-2"
          style={{
            background: "rgba(200,60,60,0.10)",
            border: "1px solid rgba(200,60,60,0.30)",
            color: "#f08080",
            fontSize: 11,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}