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
  const [connectionStatus, setConnectionStatus] = useState('Connecting to Pi Network...');

  const onIncompletePayment = (payment: any) => {
    console.log('Incomplete payment found:', payment);
    // Handle incomplete payment here
  };

  useEffect(() => {
    console.log('Initializing Pi SDK...');
    setConnectionStatus('Checking for Pi Browser...');
    
    const checkPiBrowser = () => {
      // Check if we're in the Pi Browser
      const isPiBrowser = window.navigator.userAgent.includes('PiBrowser');
      if (!isPiBrowser) {
        setError('Please use the Pi Browser to access this application.');
        setIsLoading(false);
        return false;
      }
      return true;
    };

    const initializePiSdk = () => {
      setConnectionStatus('Initializing Pi Network SDK...');
      if (!window.Pi) {
        setError('Pi Network SDK not loaded. Please refresh the page or try again later.');
        setIsLoading(false);
        return false;
      }

      try {
        console.log('Initializing Pi SDK with sandbox mode...');
        window.Pi.init({ version: '2.0', sandbox: true }); // Set sandbox to false for production
        console.log('Pi SDK initialized successfully');
        return true;
      } catch (err) {
        console.error('Failed to initialize Pi SDK:', err);
        setError('Failed to initialize Pi Network SDK. Please try again.');
        setIsLoading(false);
        return false;
      }
    };

    const authenticate = async () => {
      if (!checkPiBrowser() || !initializePiSdk()) {
        return;
      }

      setIsLoading(true);
      setError(null);
      setConnectionStatus('Connecting to Pi Network...');
      
      try {
        if (!window.Pi) {
          throw new Error('Pi Network SDK is not available');
        }
        
        console.log('Starting Pi authentication...');
        const result = await window.Pi.authenticate(
          ['username', 'payments'], 
          { 
            onIncompletePaymentFound: onIncompletePayment 
          }
        );
        
        console.log('Authentication successful:', result);
        setUsername(result.user.username);
        setIsAuthenticated(true);
        setConnectionStatus('Connected');
      } catch (err: any) {
        console.error('Authentication failed:', err);
        let errorMessage = 'Failed to authenticate with Pi Network';
        
        if (err.message) {
          errorMessage += `: ${err.message}`;
        }
        
        if (err.response) {
          console.error('Response data:', err.response.data);
          console.error('Response status:', err.response.status);
        }
        
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    // Start the authentication process
    const timer = setTimeout(() => {
      authenticate();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        textAlign: 'center',
        padding: '20px'
      }}>
        <h2>Pi Network Chess</h2>
        <p>{connectionStatus}</p>
        {!error && (
          <div>
            <div className="spinner" style={{
              border: '4px solid rgba(0, 0, 0, 0.1)',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              borderTopColor: '#14f195',
              animation: 'spin 1s ease-in-out infinite',
              margin: '20px auto'
            }}></div>
            <style>{
              `@keyframes spin { to { transform: rotate(360deg); } }`
            }</style>
          </div>
        )}
        {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      </div>
    );
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
