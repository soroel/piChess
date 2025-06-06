import React, { useState, useEffect } from 'react';
import type { PiSDK, PiPaymentData, PiPaymentCallbacks } from '../types/pi-sdk';

interface PaymentButtonProps {
  amount: number;
  memo: string;
  onPaymentComplete: (payment: any) => void;
  onError: (error: Error) => void;
}

export const PaymentButton: React.FC<PaymentButtonProps> = ({
  amount,
  memo,
  onPaymentComplete,
  onError,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    // Check if Pi SDK is available
    if (window.Pi) {
      setSdkReady(true);
    } else {
      const checkSdk = setInterval(() => {
        if (window.Pi) {
          setSdkReady(true);
          clearInterval(checkSdk);
        }
      }, 500);
      
      return () => clearInterval(checkSdk);
    }
  }, []);

  const handlePayment = async () => {
    const pi = (window as any).Pi as PiSDK | undefined;
    if (!pi) {
      onError(new Error('Pi SDK not initialized'));
      return;
    }

    setIsProcessing(true);
    
    try {
      // Create payment data
      const paymentData: PiPaymentData = {
        amount,
        memo,
        metadata: {
          gameType: 'chess',
          timestamp: new Date().toISOString(),
        },
      };

      console.log('Initiating payment:', paymentData);
      
      // Define payment callbacks
      const callbacks: PiPaymentCallbacks = {
        onReadyForServerApproval: (paymentId: string) => {
          console.log('Payment ready for server approval:', paymentId);
          return paymentId;
        },
        onReadyForServerCompletion: (paymentId: string, txid: string) => {
          console.log('Payment ready for server completion:', { paymentId, txid });
          return { identifier: paymentId };
        },
        onCancel: (paymentId: string) => {
          console.log('Payment cancelled:', paymentId);
          setIsProcessing(false);
        },
        onError: (error: Error, payment?: any) => {
          console.error('Payment error:', error);
          onError(error);
          setIsProcessing(false);
        },
      };

      // Initiate the payment
      const payment = await pi.createPayment(paymentData, callbacks);
      console.log('Payment completed:', payment);
      onPaymentComplete(payment);
    } catch (error) {
      console.error('Payment failed:', error);
      onError(error instanceof Error ? error : new Error('Payment failed'));
      setIsProcessing(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={isProcessing}
      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
    >
      {isProcessing ? 'Processing...' : `Pay ${amount} π`}
    </button>
  );
};
