// Type definitions for Pi Network SDK

export interface PiConfig {
  version: string;
  sandbox: boolean;
}

export interface PiUser {
  uid: string;
  username: string;
}

export interface PiAuthResult {
  accessToken: string;
  user: PiUser;
}

export interface PiPaymentCallbacks {
  onReadyForServerApproval: (paymentId: string) => any;
  onReadyForServerCompletion: (paymentId: string, txid: string) => any;
  onCancel: (paymentId: string) => void;
  onError: (error: Error, payment?: any) => void;
}

export interface PiPaymentData {
  amount: number;
  memo: string;
  metadata?: {
    [key: string]: any;
  };
}

export interface PiSDK {
  init(config: PiConfig): Promise<void>;
  authenticate(scopes: string[], onIncompletePayment: (payment: any) => void): Promise<PiAuthResult>;
  createPayment(paymentData: PiPaymentData, callbacks: PiPaymentCallbacks): Promise<any>;
  logout(): Promise<void>;
}

declare global {
  interface Window {
    Pi: PiSDK;
    piSDK: PiSDK;
  }
}
