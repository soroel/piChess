import React, { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { PaymentButton } from './PaymentButton';

interface Player {
  id: string;
  username: string;
  status: 'online' | 'in-game' | 'offline' | 'challenging';
}

interface MatchmakingProps {
  userId: string;
  username: string;
  accessToken: string;
  onMatchFound: (matchId: string, opponent: Player) => void;
  onBack: () => void;
}

export const Matchmaking: React.FC<MatchmakingProps> = ({ 
  userId, 
  username, 
  accessToken, 
  onMatchFound, 
  onBack 
}) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [showPayment, setShowPayment] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [challengedPlayer, setChallengedPlayer] = useState<Player | null>(null);
  const [incomingChallenge, setIncomingChallenge] = useState<{from: Player, matchId: string} | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // WebSocket connection management
  const connectWebSocket = useCallback(() => {
    try {
      // Use the explicit WebSocket URL from environment variables
      // Default to ws://localhost:3001 if not set
      const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:3001';
      console.log('Connecting to WebSocket server at:', wsUrl);
      
      socketRef.current = new WebSocket(wsUrl);
      
      socketRef.current.onopen = () => {
        console.log('Connected to matchmaking server');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        
        // Authenticate with the server
        socketRef.current?.send(JSON.stringify({
          type: 'authenticate',
          token: accessToken,
          userId,
          username
        }));
      };
      
      socketRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('Received message:', message);
          
          switch (message.type) {
            case 'playerList':
              setPlayers(message.players);
              break;
              
            case 'challengeReceived':
              setIncomingChallenge({
                from: message.from,
                matchId: message.matchId
              });
              break;
              
            case 'challengeAccepted':
              onMatchFound(message.matchId, message.opponent);
              break;
              
            case 'challengeDeclined':
              setChallengedPlayer(null);
              alert(`${message.username} declined your challenge.`);
              break;
              
            case 'error':
              console.error('Server error:', message.error);
              setConnectionError(message.error);
              break;
          }
        } catch (error) {
          console.error('Error processing message:', error, event.data);
        }
      };
      
      socketRef.current.onclose = () => {
        console.log('Disconnected from matchmaking server');
        setIsConnected(false);
        
        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`Attempting to reconnect in ${delay}ms...`);
          
          setTimeout(() => {
            reconnectAttempts.current++;
            connectWebSocket();
          }, delay);
        } else {
          setConnectionError('Unable to connect to the matchmaking server. Please refresh the page to try again.');
        }
      };
      
      socketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('Connection error. Trying to reconnect...');
      };
      
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setConnectionError('Failed to connect to matchmaking service.');
    }
  }, [accessToken, userId, username, onMatchFound]);
  
  // Initialize WebSocket connection with reconnect logic
  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;
    
    const setupWebSocket = () => {
      connectWebSocket();
      
      // Set up reconnect on close
      if (socketRef.current) {
        socketRef.current.onclose = (event) => {
          console.log('WebSocket closed:', event);
          setIsConnected(false);
          
          // Attempt to reconnect with exponential backoff
          if (reconnectAttempts.current < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
            console.log(`Attempting to reconnect in ${delay}ms...`);
            
            reconnectTimeout = setTimeout(() => {
              reconnectAttempts.current++;
              setupWebSocket();
            }, delay);
          } else {
            setConnectionError('Unable to connect to the matchmaking server. Please refresh the page to try again.');
          }
        };
        
        socketRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          setConnectionError('Connection error. Trying to reconnect...');
        };
      }
    };
    
    setupWebSocket();
    
    // Cleanup function
    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connectWebSocket]);

  // Handle sending a challenge to another player
  const handleChallenge = useCallback((player: Player) => {
    if (!socketRef.current || player.status === 'in-game' || player.status === 'challenging') {
      return;
    }
    
    const matchId = `match-${uuidv4()}`;
    setChallengedPlayer(player);
    
    // Update player status to 'challenging'
    setPlayers(prevPlayers => 
      prevPlayers.map(p => 
        p.id === player.id ? { ...p, status: 'challenging' } : p
      )
    );
    
    // Send challenge to the other player
    socketRef.current.send(JSON.stringify({
      type: 'challenge',
      to: player.id,
      matchId
    }));
    
    // Set a timeout for the challenge
    const challengeTimeout = setTimeout(() => {
      if (challengedPlayer?.id === player.id) {
        setChallengedPlayer(null);
        alert(`${player.username} did not respond to your challenge.`);
        
        // Reset player status
        setPlayers(prevPlayers => 
          prevPlayers.map(p => 
            p.id === player.id ? { ...p, status: 'online' } : p
          )
        );
      }
    }, 30000); // 30 second timeout
    
    return () => clearTimeout(challengeTimeout);
  }, [challengedPlayer]);
  
  // Handle accepting a challenge
  const handleAcceptChallenge = useCallback(() => {
    if (!incomingChallenge || !socketRef.current) return;
    
    // Notify the challenger that the challenge was accepted
    socketRef.current.send(JSON.stringify({
      type: 'challengeResponse',
      matchId: incomingChallenge.matchId,
      accepted: true,
      to: incomingChallenge.from.id
    }));
    
    // Proceed to the game
    onMatchFound(incomingChallenge.matchId, incomingChallenge.from);
    setIncomingChallenge(null);
  }, [incomingChallenge, onMatchFound]);
  
  // Handle declining a challenge
  const handleDeclineChallenge = useCallback(() => {
    if (!incomingChallenge || !socketRef.current) return;
    
    // Notify the challenger that the challenge was declined
    socketRef.current.send(JSON.stringify({
      type: 'challengeResponse',
      matchId: incomingChallenge.matchId,
      accepted: false,
      to: incomingChallenge.from.id
    }));
    
    setIncomingChallenge(null);
  }, [incomingChallenge]);

  const handlePaymentComplete = (payment: any) => {
    console.log('Payment completed successfully:', payment);
    setPaymentStatus('success');
    setShowPayment(false);
  };

  const handlePaymentError = (error: Error) => {
    console.error('Payment error:', error);
    setPaymentStatus('error');
    setPaymentError(error.message);
  };

  if (showPayment) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Entry Fee</h2>
        <p className="text-gray-700 mb-6">Pay 1 π to enter the matchmaking pool</p>
        
        <PaymentButton
          amount={1}
          memo="Chess Game Entry Fee"
          onPaymentComplete={handlePaymentComplete}
          onError={handlePaymentError}
        />
        
        {paymentStatus === 'error' && (
          <p className="mt-4 text-red-500">
            Payment failed: {paymentError || 'Unknown error'}
          </p>
        )}
      </div>
    );
  }

  // Handle connection errors
  if (connectionError) {
    return (
      <div className="error-container">
        <p className="error-message">{connectionError}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="retry-button"
        >
          Retry Connection
        </button>
        <button onClick={onBack} className="back-button">
          Back to Menu
        </button>
      </div>
    );
  }

  return (
    <div className="matchmaking-container">
      <div className="connection-status">
        <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></span>
        {isConnected ? 'Connected' : 'Connecting...'}
      </div>
      
      <h2>Find an Opponent</h2>
      
      {!isConnected ? (
        <div className="loading">Connecting to matchmaking service...</div>
      ) : players.length === 0 ? (
        <div className="no-players">No players available. Waiting for opponents...</div>
      ) : (
        <div className="player-list">
          {players
            .filter(player => player.id !== userId) // Don't show current user in the list
            .map((player) => (
              <div key={player.id} className={`player-item ${player.status}`}>
                <span className={`player-status ${player.status}`}></span>
                <span className="player-username">{player.username}</span>
                <span className="player-status-text">
                  {player.status === 'in-game' ? 'In Game' : 
                   player.status === 'challenging' ? 'Challenging...' : 'Online'}
                </span>
                <button 
                  onClick={() => handleChallenge(player)}
                  disabled={player.status === 'in-game' || player.status === 'challenging' || !!challengedPlayer}
                  className="challenge-button"
                  title={player.status === 'in-game' ? 'Player is in a game' : 
                         player.status === 'challenging' ? 'Challenge in progress' : 
                         'Challenge to a match'}
                >
                  {challengedPlayer?.id === player.id ? 'Challenging...' : 'Challenge'}
                </button>
              </div>
            ))}
        </div>
      )}

      {incomingChallenge && (
        <div className="challenge-notification">
          <div className="challenge-content">
            <p>{incomingChallenge.from.username} has challenged you to a match!</p>
            <div className="challenge-buttons">
              <button 
                onClick={handleAcceptChallenge} 
                className="accept-button"
                disabled={!isConnected}
              >
                Accept
              </button>
              <button 
                onClick={handleDeclineChallenge}
                className="decline-button"
                disabled={!isConnected}
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      <button 
        onClick={onBack} 
        className="back-button"
        disabled={!isConnected}
      >
        Back to Menu
      </button>
    </div>
  );
};
