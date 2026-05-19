"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { PI_NETWORK_CONFIG } from "@/lib/system-config";
import type {
  Product,
  SDKLiteInstance,
  UserPurchaseBalance,
} from "@/lib/sdklite-types";

const FALLBACK_PRODUCTS: Product[] = [
  {
    id: "69bbcacf7ffee4ee3564c7b6",
    name: "Tip - Small",
    description: "A small tip",
    price_in_pi: 0.1,
    total_quantity: 0,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "69bc284d03ac4bc03ee7e245",
    name: "Tip - Medium",
    description: "A medium tip",
    price_in_pi: 0.5,
    total_quantity: 0,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "69c4e504225cf1a6af321c98",
    name: "Tip - Large",
    description: "A large tip",
    price_in_pi: 1.0,
    total_quantity: 0,
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

interface PiAuthContextType {
  isAuthenticated: boolean;
  authMessage: string;
  hasError: boolean;
  user: any | null;
  sdk: SDKLiteInstance | null;
  products: Product[];
  restoredPurchases: UserPurchaseBalance[];
  reinitialize: () => Promise<void>;
}

const PiAuthContext = createContext<PiAuthContextType | undefined>(undefined);

const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();

    const script = document.createElement("script");
    script.src = src;
    script.async = true;

    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script ${src}`));

    document.head.appendChild(script);
  });
};

export function PiAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMessage, setAuthMessage] = useState("Initializing Pi...");
  const [hasError, setHasError] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [sdk, setSdk] = useState<SDKLiteInstance | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [restoredPurchases, setRestoredPurchases] = useState<
    UserPurchaseBalance[]
  >([]);

  const initialize = async () => {
    try {
      setHasError(false);
      setAuthMessage("Loading Pi SDK...");

      await loadScript(PI_NETWORK_CONFIG.SDK_URL || "https://sdk.minepi.com/pi-sdk.js");
      await loadScript(
        PI_NETWORK_CONFIG.SDK_LITE_URL ||
          "https://pi-apps.github.io/pi-sdk-lite/build/production/sdklite.js"
      );

      setAuthMessage("Initializing Pi Network...");
      await window.Pi.init({
        version: "2.0",
        sandbox: PI_NETWORK_CONFIG.SANDBOX,
      });

      setAuthMessage("Authenticating with Pi...");
      const auth = await window.Pi.authenticate(
        ["username", "payments"],
        (payment) => {
          console.log("payment approved:", payment);
        },
        (error) => {
          console.error("payment error:", error);
        }
      );

      setUser(auth);
      setIsAuthenticated(true);

      if (typeof window.SDKLite === "undefined") {
        throw new Error("Pi SDKLite is not available after script load");
      }

      setAuthMessage("Initializing Pi SDKLite...");
      const sdkInstance = await window.SDKLite.init();
      setSdk(sdkInstance);

      setAuthMessage("Loading Pi product catalog...");
      try {
        const productsResponse = await sdkInstance.state.products();
        setProducts(productsResponse.products ?? []);
      } catch (error) {
        console.warn("Failed to load Pi products:", error);
        // Common failure: SDKLite cannot authenticate against App Studio backend.
        // Fall back to a local product catalog so the UI remains functional.
        setProducts(FALLBACK_PRODUCTS);
      }

      setAuthMessage("Restoring purchase history...");
      try {
        const restoreResponse = await sdkInstance.state.restore();
        setRestoredPurchases(restoreResponse.purchases ?? []);
      } catch (error) {
        console.warn("Failed to restore purchases:", error);
        setRestoredPurchases([]);
      }

      setAuthMessage("Authenticated");
    } catch (err) {
      console.error("Pi auth failed:", err);
      setHasError(true);
      setAuthMessage(
        err instanceof Error ? err.message : "Authentication failed"
      );
      setIsAuthenticated(false);
      setSdk(null);
      setProducts([]);
      setRestoredPurchases([]);
    }
  };

  useEffect(() => {
    initialize();
  }, []);

  return (
    <PiAuthContext.Provider
      value={{
        isAuthenticated,
        authMessage,
        hasError,
        user,
        sdk,
        products,
        restoredPurchases,
        reinitialize: initialize,
      }}
    >
      {children}
    </PiAuthContext.Provider>
  );
}

export function usePiAuth() {
  const ctx = useContext(PiAuthContext);
  if (!ctx) throw new Error("usePiAuth must be used inside provider");
  return ctx;
}
