"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { PI_NETWORK_CONFIG } from "@/lib/system-config";

interface PiAuthContextType {
  isAuthenticated: boolean;
  authMessage: string;
  hasError: boolean;
  user: any | null;
  reinitialize: () => Promise<void>;
}

const PiAuthContext = createContext<PiAuthContextType | undefined>(undefined);

const loadPiSDK = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window.Pi !== "undefined") return resolve();

    const script = document.createElement("script");
    script.src = PI_NETWORK_CONFIG.SDK_URL || "https://sdk.minepi.com/pi-sdk.js";
    script.async = true;

    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Pi SDK script"));

    document.head.appendChild(script);
  });
};

export function PiAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMessage, setAuthMessage] = useState("Initializing Pi...");
  const [hasError, setHasError] = useState(false);
  const [user, setUser] = useState<any | null>(null);

  const initialize = async () => {
    try {
      setHasError(false);
      setAuthMessage("Loading Pi SDK...");

      await loadPiSDK();

      setAuthMessage("Initializing Pi Network...");

      window.Pi.init({
        version: "2.0",
        sandbox: PI_NETWORK_CONFIG.SANDBOX,
      });

      setAuthMessage("Authenticating...");

      const auth = await window.Pi.authenticate(
        ["username"],
        (payment) => {
          console.log("payment approved:", payment);
        },
        (error) => {
          console.error("payment error:", error);
        }
      );

      setUser(auth);
      setIsAuthenticated(true);
      setAuthMessage("Authenticated");
    } catch (err) {
      console.error("Pi auth failed:", err);
      setHasError(true);
      setAuthMessage(
        err instanceof Error ? err.message : "Authentication failed"
      );
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