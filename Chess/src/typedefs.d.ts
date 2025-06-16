export interface PiNetwork {
  init: (config: { version: string; sandbox: boolean }) => void;
  authenticate: (
    scopes: string[], 
    callbacks?: {
      onIncompletePaymentFound?: (payment: any) => void;
    }
  ) => Promise<{
    user: { 
      username: string;
    };
    accessToken: string;
  }>;
}

declare global {
  interface Window {
    Pi?: PiNetwork;
  }
}
