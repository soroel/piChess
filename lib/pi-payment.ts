export function usePurchase() {
  const makePurchase = async (productId: string) => {
    const Pi = (window as any).Pi;

    if (!Pi) throw new Error("Pi SDK not loaded");

    const products: Record<string, any> = {
      "tip-small": { amount: 0.1 },
      "tip-medium": { amount: 0.5 },
      "tip-large": { amount: 1.0 },
    };

    const product = products[productId];

    if (!product) {
      throw new Error(`Unknown product: ${productId}`);
    }

    return new Promise((resolve, reject) => {
      Pi.createPayment(
        {
          amount: product.amount,
          memo: `Tip - ${productId}`,
          metadata: { productId },
        },
        {
          onReadyForServerApproval: async (paymentId: string) => {
            try {
              await fetch("/api/pi_payment/approve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paymentId }),
              });
            } catch (err) {
              console.error("Approval failed:", err);
              reject(err);
            }
          },

          onReadyForServerCompletion: async (
            paymentId: string,
            txid: string
          ) => {
            try {
              await fetch("/api/pi_payment/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paymentId, txid }),
              });

              resolve({ paymentId, txid });
            } catch (err) {
              console.error("Completion failed:", err);
              reject(err);
            }
          },

          onCancel: () => {
            console.log("Payment cancelled by user");
            resolve({ cancelled: true, productId });
          },

          onError: (err: any) => {
            console.error("Pi payment error:", err);
            reject(err);
          },
        }
      );
    });
  };

  return { makePurchase };
}