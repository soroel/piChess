import React, { useState, useEffect } from 'react';

interface ResultHandlerProps {
  result: { winner: string | null; gameId: string };
  onComplete: () => void;
}

export const ResultHandler: React.FC<ResultHandlerProps> = ({ result, onComplete }) => {
  const [status, setStatus] = useState('Sending result...');

  useEffect(() => {
    const sendResult = async () => {
      try {
        const response = await fetch('/api/match/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: result.gameId,
            winner: result.winner
          })
        });

        if (!response.ok) throw new Error('Failed to send result');

        const data = await response.json();
        if (data.success) {
          setStatus(result.winner 
            ? `You ${result.winner === 'white' ? 'won' : 'lost'}!`
            : 'Game ended in a draw!');
        }
      } catch (error) {
        console.error('Error:', error);
        setStatus('Error processing result');
      } finally {
        setTimeout(onComplete, 3000);
      }
    };

    sendResult();
  }, [result, onComplete]);

  return (
    <div className="result-handler">
      <p>{status}</p>
    </div>
  );
};