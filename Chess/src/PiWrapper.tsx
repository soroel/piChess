import React, { useEffect, useState } from 'react';
import Chess from './Chess/Chess';

// Import the PiNetwork interface from typedefs
import { PiNetwork } from './typedefs';

// Extend Window interface to include Pi SDK
declare global {
  interface Window {
    Pi?: PiNetwork;
  }
}

const PiWrapper: React.FC = () => {
  const [username, setUsername] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const onIncompletePayment = (payment: any) => {
    console.log('Incomplete payment found:', payment);
    // Handle incomplete payment here
  };

  useEffect(() => {
    // Initialize Pi SDK
    if (window.Pi) {
      window.Pi.init({ version: '2.0', sandbox: true }); // Set sandbox to false for production
    }

    const authenticate = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        if (!window.Pi) {
          throw new Error('Pi Network SDK not loaded. Please make sure you are accessing this app through the Pi Browser.');
        }

        const result = await window.Pi.authenticate(['username', 'payments'], { 
          onIncompletePaymentFound: onIncompletePayment 
        });
        
        setUsername(result.user.username);
        setIsAuthenticated(true);
      } catch (err: any) {
        console.error('Authentication failed:', err);
        setError(err.message || 'Failed to authenticate with Pi Network');
      } finally {
        setIsLoading(false);
      }
    };

    // Add a small delay to ensure Pi SDK is fully loaded
    const timer = setTimeout(() => {
      authenticate();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <div>Connecting to Pi Network...</div>;
  }

  if (error) {
    return (
      <div>
        <h2>Error</h2>
        <p>{error}</p>
        <p>Please make sure you are:</p>
        <ul>
          <li>Using the Pi Browser</li>
          <li>Your app is properly configured in the Pi Developer Portal</li>
          <li>You have a stable internet connection</li>
        </ul>
      </div>
    );
  }

  return (
    <div>
      {isAuthenticated ? (
        <Chess username={username} />
      ) : (
        <div>
          <h2>Welcome to Pi Chess</h2>
          <p>Please wait while we connect to Pi Network...</p>
        </div>
      )}
    </div>
  );
};

export default PiWrapper;
