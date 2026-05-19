"use client";

import { useState } from "react";
import { usePiAuth } from "@/contexts/pi-auth-context";
import { PRODUCT_CONFIG } from "@/lib/product-config";

interface TipButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function TipButton({ onSuccess, onError }: TipButtonProps) {
  const { sdk, isAuthenticated, products, restoredPurchases } = usePiAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the Tip product from products array
  const tipProduct = products?.find(
    (p) => p.id === PRODUCT_CONFIG.PRODUCT_69c4e504225cf1a6af321c98
  ) ?? null;

  const amount = tipProduct?.price_in_pi ?? 1.0;

  // Check if this product has been purchased before
  const tipPurchased = restoredPurchases?.find(
    (p) => p.productId === tipProduct?.slug
  );
  const tipCount = tipPurchased?.quantity ?? 0;

  const handleTip = async () => {
    if (!isAuthenticated || !sdk) {
      const msg = "Pi Network not connected. Please restart the app.";
      setError(msg);
      onError?.(msg);
      return;
    }

    if (!tipProduct) {
      const msg = "Tip product not available.";
      setError(msg);
      onError?.(msg);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await sdk.makePurchase(tipProduct.slug);
      console.log("[TipButton] Purchase successful:", result);

      // Since Tip is consumable, consume it immediately upon successful purchase
      try {
        await sdk.state.consume(tipProduct.slug, 1);
        console.log("[TipButton] Tip consumed successfully");
      } catch (consumeErr) {
        console.error("[TipButton] Failed to consume tip:", consumeErr);
        // Don't fail the entire operation if consume fails
      }

      onSuccess?.();
      setIsLoading(false);
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      setIsLoading(false);

      if (error?.code === "purchase_cancelled") {
        // User cancelled, don't show error
        return;
      }

      if (error?.code === "product_not_found") {
        const msg = "Tip product not found.";
        setError(msg);
        onError?.(msg);
      } else {
        const msg =
          error?.message ?? "Failed to process tip. Please try again.";
        setError(msg);
        onError?.(msg);
      }
    }
  };

  const isDisabled = isLoading || !tipProduct || !isAuthenticated;

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
        aria-busy={isLoading}
        title={!tipProduct ? "Tip product unavailable" : undefined}
      >
        {isLoading ? (
          <>
            <span
              className="inline-block"
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                border: "2.5px solid rgba(7,9,26,0.3)",
                borderTopColor: "#07091a",
                animation: "spin 0.7s linear infinite",
              }}
            />
            Processing…
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
          className="rounded-xl px-3 py-2"
          style={{
            background: "rgba(200,60,60,0.10)",
            border: "1px solid rgba(200,60,60,0.30)",
            color: "#f08080",
            fontSize: 11,
          }}
          role="alert"
        >
          {error}
        </div>
      )}
    </div>
  );
}
