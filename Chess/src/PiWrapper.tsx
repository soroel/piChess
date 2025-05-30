import React, { useEffect, useState } from 'react';
import Chess from './Chess/Chess';

// Define Pi SDK types
interface PiNetwork {
  init: { sandbox: boolean };
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

// Add Pi to the window object
declare global {
  var Pi: PiNetwork | undefined;
}

const PiWrapper: React.FC = () => {
  const [username, setUsername] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const onIncompletePayment = (payment: any) => {
    console.log('Incomplete payment found:', payment);
    // Handle incomplete payment here
  };

  useEffect(() => {
    const authenticate = async () => {
      try {
        if (window.Pi) {
          const result = await window.Pi.authenticate(['username'], onIncompletePayment);
          setUsername(result.user.username);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Authentication error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    authenticate();
  }, []);

  if (!isAuthenticated) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f5f7fa'
      }}>
        <div style={{
          padding: '20px',
          borderRadius: '10px',
          backgroundColor: 'white',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <h2>Connecting to Pi Network...</h2>
          <p>Please wait while we authenticate your Pi account.</p>
        </div>
      </div>
    );
  }

  return <Chess username={username} />;
};

export default PiWrapper; 