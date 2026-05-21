"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

import { PI_NETWORK_CONFIG } from "@/lib/system-config";




const LOCAL_PRODUCTS = [
  {
    id: "tip-small",
    name: "Tip - Small",
    description: "A small tip",
    price_in_pi: 0.1,
  },
  {
    id: "tip-medium",
    name: "Tip - Medium",
    description: "A medium tip",
    price_in_pi: 0.5,
  },
  {
    id: "tip-large",
    name: "Tip - Large",
    description: "A large tip",
    price_in_pi: 1.0,
  },
];

interface PiAuthContextType {
  isAuthenticated: boolean;
  authMessage: string;
  hasError: boolean;
  user: any | null;
  products: typeof LOCAL_PRODUCTS;
  sdkReady: boolean;
  pi: any;
  reinitialize: () => Promise<void>;
}

const PiAuthContext = createContext<PiAuthContextType | undefined>(
  undefined
);

const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;

    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error(`Failed to load script ${src}`));

    document.head.appendChild(script);
  });
};

export function PiAuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const hasInitialized = useRef(false);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMessage, setAuthMessage] = useState(
    "Initializing Pi..."
  );
  const [hasError, setHasError] = useState(false);
  const [user, setUser] = useState<any | null>(null);

  const [sdkReady, setSdkReady] = useState(false);
  const [pi, setPi] = useState<any>(null);

  const [products] = useState(LOCAL_PRODUCTS);

  const initialize = async () => {
    try {
      setHasError(false);
      setSdkReady(false);

      setAuthMessage("Loading Pi SDK...");

      await loadScript(
        PI_NETWORK_CONFIG.SDK_URL ||
          "https://sdk.minepi.com/pi-sdk.js"
      );

      if (!window.Pi) {
        throw new Error("Pi SDK failed to load");
      }

      setAuthMessage("Initializing Pi Network...");

      if (!(window as any).__PI_INITIALIZED__) {
        await window.Pi.init({
          version: "2.0",
          sandbox: PI_NETWORK_CONFIG.SANDBOX,
        });

        (window as any).__PI_INITIALIZED__ = true;
      }

      setPi(window.Pi);
      setSdkReady(true);

      setAuthMessage("Authenticating with Pi...");

      const auth = await window.Pi.authenticate([
        "username",
        "payments",
      ]);

      setUser(auth);
      setIsAuthenticated(true);

      setAuthMessage("Authenticated");
    } catch (err) {
      console.error("Pi auth failed:", err);

      setHasError(true);
      setIsAuthenticated(false);
      setUser(null);
      setSdkReady(false);
      setPi(null);

      setAuthMessage(
        err instanceof Error
          ? err.message
          : "Authentication failed"
      );
    }
  };

  useEffect(() => {
    if (hasInitialized.current) return;

    hasInitialized.current = true;
    initialize();
  }, []);

  return (
    <PiAuthContext.Provider
      value={{
        isAuthenticated,
        authMessage,
        hasError,
        user,
        products,
        sdkReady,
        pi,
        reinitialize: initialize,
      }}
    >
      {children}
    </PiAuthContext.Provider>
  );
}

export function usePiAuth() {
  const ctx = useContext(PiAuthContext);

  if (!ctx) {
    throw new Error(
      "usePiAuth must be used inside provider"
    );
  }

  return ctx;
}