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
      const timeout = setTimeout(() => {
        reject(new Error("Payment timeout"));
      }, 120000);

      Pi.createPayment(
        {
          amount: product.amount,
          memo: `Tip - ${productId}`,
          metadata: { productId },
        },
        {
          onReadyForServerApproval: async (paymentId: string) => {
            try {
              const res = await fetch("/api/pi_payment/approve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paymentId }),
              });

              if (!res.ok) {
                throw new Error("Approval failed");
              }
            } catch (err) {
              clearTimeout(timeout);
              reject(err);
            }
          },

          onReadyForServerCompletion: async (
            paymentId: string,
            txid: string
          ) => {
            try {
              const res = await fetch("/api/pi_payment/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paymentId, txid }),
              });

              if (!res.ok) {
                throw new Error("Completion failed");
              }

              clearTimeout(timeout);
              resolve({ paymentId, txid });
            } catch (err) {
              clearTimeout(timeout);
              reject(err);
            }
          },

          onCancel: () => {
            clearTimeout(timeout);
            resolve({ cancelled: true, productId });
          },

          onError: (err: any) => {
            clearTimeout(timeout);
            reject(err);
          },
        }
      );
    });
  };

  return { makePurchase };
}