// src/components/Login.tsx
import React, { useEffect, useState } from 'react';
import type { PiSDK, PiAuthResult, PiUser } from '../types/pi-sdk';

interface LoginProps {
  onLogin: (user: { uid: string; username: string; accessToken: string }) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);

  // Initialize Pi SDK
  useEffect(() => {
    const initPi = async () => {
      try {
        if (!window.Pi) {
          throw new Error('Pi SDK not loaded');
        }

        await window.Pi.init({
          version: '2.0',
          sandbox: process.env.REACT_APP_SANDBOX_SDK === 'true'
        });
        
        setSdkReady(true);
      } catch (err) {
        console.error('Pi SDK initialization failed:', err);
        setError('Failed to initialize Pi SDK. Please refresh the page.');
      }
    };

    initPi();
  }, []);

  const handleLogin = async () => {
    const pi = (window as any).Pi as PiSDK | undefined;
    if (!pi) {
      setError('Pi SDK not available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Initialize the Pi SDK
      await pi.init({ version: '2.0', sandbox: true });

      // Authenticate the user
      const { accessToken, user } = await pi.authenticate(
        ['username', 'payments', 'wallet_address'],
        (payment: any) => {
          console.log('Incomplete payment:', payment);
          // Handle incomplete payment if needed
        }
      );

      onLogin({
        uid: user.uid,
        username: user.username,
        accessToken,
      });
    } catch (err) {
      console.error('Login failed:', err);
      setError('Failed to log in with Pi Network');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Welcome to Pi Chess</h2>
      {error && <div className="error-message">{error}</div>}
      <button
        onClick={handleLogin}
        disabled={isLoading || !sdkReady}
        className="pi-connect-button"
      >
        {isLoading ? 'Connecting...' : 'Connect with Pi Network'}
      </button>
    </div>
  );
};