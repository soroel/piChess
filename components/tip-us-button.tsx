"use client";

import React, { useState } from "react";
import { usePiAuth } from "@/contexts/pi-auth-context";
import { PRODUCT_CONFIG } from "@/lib/product-config";

interface TipUsButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function TipUsButton({ onSuccess, onError }: TipUsButtonProps) {
  const { sdk, isAuthenticated, products, restoredPurchases } = usePiAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Get the Tip Us product from products array
  const tipUsProduct = products?.find(
    (p) => p.id === PRODUCT_CONFIG.PRODUCT_6a0c452940b13b6ca1fb4cb9
  ) ?? null;

  const amount = tipUsProduct?.price_in_pi ?? 1.0;

  // Check if this product has been purchased before
  const tipUsPurchased = restoredPurchases?.find(
    (p) => p.productId === tipUsProduct?.slug
  );
  const tipUsCount = tipUsPurchased?.quantity ?? 0;

  const handleTipUs = async () => {
    if (!isAuthenticated || !sdk) {
      const msg = "Pi Network not connected. Please restart the app.";
      setError(msg);
      onError?.(msg);
      return;
    }

    if (!tipUsProduct) {
      const msg = "Tip Us product not available.";
      setError(msg);
      onError?.(msg);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await sdk.makePurchase(tipUsProduct.slug);
      console.log("[TipUsButton] Purchase successful:", result);

      // Since Tip Us is consumable, consume it immediately upon successful purchase
      try {
        await sdk.state.consume(tipUsProduct.slug, 1);
        console.log("[TipUsButton] Tip Us consumed successfully");
      } catch (consumeErr) {
        console.error("[TipUsButton] Failed to consume tip:", consumeErr);
        // Don't fail the entire operation if consume fails
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
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
        const msg = "Tip Us product not found.";
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

  const isDisabled = isLoading || !tipUsProduct || !isAuthenticated;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
      <button
        onClick={handleTipUs}
        disabled={isDisabled}
        className="w-full rounded-2xl py-4 font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
        style={{
          background: isDisabled
            ? "rgba(212,175,55,0.20)"
            : showSuccess
            ? "rgba(74,173,76,0.88)"
            : "rgba(212,175,55,0.88)",
          color: isDisabled ? "#7a6820" : "#07091a",
          border: "none",
          fontSize: 15,
          letterSpacing: "0.02em",
          cursor: isDisabled ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.7 : 1,
        }}
        aria-busy={isLoading}
        title={!tipUsProduct ? "Tip Us product unavailable" : undefined}
      >
        {isLoading ? (
          <>
            <span
              className="inline-block"
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                border: "2.5px solid rgba(7,9,26,0.3)",
                borderTopColor: "#07091a",
                animation: "spin 0.7s linear infinite",
              }}
            />
            Processing…
          </>
        ) : showSuccess ? (
          <>
            <span style={{ fontSize: 16 }}>✓</span>
            Thank you for the tip!
          </>
        ) : !tipUsProduct ? (
          "Tip Us Unavailable"
        ) : (
          <>
            <span style={{ fontSize: 16 }}>π</span>
            Tip Us • {amount} Pi
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
