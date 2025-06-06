import React, { useState, useEffect } from 'react';

interface Player {
  id: string;
  username: string;
}

interface PlayForPiProps {
  userId: string;
  username: string;
  opponent: Player;
  matchId: string;
  onGameStart: (gameId: string) => void;
  onBack: () => void;
}

export const PlayForPi: React.FC<PlayForPiProps> = ({
  userId,
  username,
  opponent,
  matchId,
  onGameStart,
  onBack
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [opponentPaid, setOpponentPaid] = useState(false);
  const [iHavePaid, setIHavePaid] = useState(false);

  // Simulate opponent paying (in a real app, this would come from WebSocket)
  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(() => {
      if (mounted) {
        setOpponentPaid(true);
      }
    }, 2000);
    
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  const handleMakePayment = async () => {
    if (iHavePaid || isLoading) return;
    
    setIsLoading(true);
    setStatus('Processing your payment...');
    
    // Reset any previous payment state
    setIHavePaid(false);

    try {
      const Pi = (window as any).Pi;
      if (!Pi) {
        throw new Error('Pi SDK not loaded. Please refresh the page.');
      }

      await Pi.init({
        version: '2.0',
        sandbox: true,
      });

      const paymentData = {
        amount: 0.01,
        memo: `Pi Chess Game vs ${opponent.username}`,
        metadata: { 
          matchId,
          opponentId: opponent.id,
          gameType: 'chess'
        },
      };

      // Create mock payment with callbacks
      await new Promise((resolve, reject) => {
        Pi.createPayment(paymentData, {
          onReadyForServerApproval: (paymentId: string) => {
            console.log('Ready for server approval:', paymentId);
            setStatus('Approving your payment...');
          },
          onReadyForServerCompletion: (txid: string) => {
            console.log('Payment completed with txid:', txid);
            setStatus('Payment successful!');
            setIHavePaid(true);
            // In a real app, we would notify the server that we've paid
            resolve(true);
          },
          onCancel: () => {
            setStatus('Payment was cancelled');
            reject(new Error('Payment was cancelled'));
          },
          onError: (error: any) => {
            console.error('Payment error:', error);
            setStatus('Payment failed. Please try again.');
            reject(error);
          },
        });
      });
    } catch (error: any) {
      console.error('Payment error:', error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Start game when both players have paid
  useEffect(() => {
    let mounted = true;
    
    if (iHavePaid && opponentPaid) {
      setStatus('Both players ready! Starting game...');
      
      // In a real app, we would wait for the server to confirm both payments
      const timer = setTimeout(() => {
        if (mounted) {
          onGameStart(matchId);
        }
      }, 1500);
      
      return () => {
        mounted = false;
        clearTimeout(timer);
      };
    }
    
    return () => {
      mounted = false;
    };
  }, [iHavePaid, opponentPaid, onGameStart, matchId]);

  return (
    <div className="play-for-pi">
      <h3>Match Found!</h3>
      <p>You're playing against: <strong>{opponent.username}</strong></p>
      
      <div className="payment-status">
        <div className={`status-item ${iHavePaid ? 'paid' : ''}`}>
          <span>You: {iHavePaid ? '✅ Paid' : '❌ Not paid'}</span>
        </div>
        <div className={`status-item ${opponentPaid ? 'paid' : ''}`}>
          <span>{opponent.username}: {opponentPaid ? '✅ Paid' : '❌ Not paid'}</span>
        </div>
      </div>

      {!iHavePaid && (
        <button 
          onClick={handleMakePayment} 
          disabled={isLoading}
          className="pay-button"
        >
          {isLoading ? 'Processing...' : 'Pay 0.01 π to Play'}
        </button>
      )}

      {iHavePaid && !opponentPaid && (
        <p className="waiting">Waiting for {opponent.username} to pay...</p>
      )}

      {status && <p className="status">{status}</p>}
      
      <button 
        onClick={onBack}
        className="back-button"
        disabled={isLoading}
      >
        Back to Lobby
      </button>
    </div>
  );
};
