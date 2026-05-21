// Types for the official Pi SDK (https://sdk.minepi.com/pi-sdk.js)
// Provides a minimal declaration for `window.Pi` used in the app.

export {};

declare global {
  interface Window {
    Pi: {
      init: (config: { version: string; sandbox?: boolean }) => Promise<void>;
      authenticate: (
        fields: string[],
        onPayment?: (payment: unknown) => void,
        onError?: (error: unknown) => void
      ) => Promise<unknown>;
    };
  }
}
