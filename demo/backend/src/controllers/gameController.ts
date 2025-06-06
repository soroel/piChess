import { Request, Response } from 'express';
import { Pi } from '@pi-apps/pi-sdk';

// In-memory storage (replace with Redis/Database in production)
const waitingPlayers: Array<{ userId: string; paymentId: string }> = [];
const activeGames: Record<string, any> = {};

export const joinMatch = async (req: Request, res: Response) => {
  try {
    const { userId, paymentId } = req.body;

    // Check if payment is verified (in a real app, verify with Pi SDK)
    const paymentVerified = await verifyPiPayment(paymentId);
    if (!paymentVerified) {
      return res.status(400).json({ error: 'Payment not verified' });
    }

    // Check for waiting opponent
    const opponentIndex = waitingPlayers.findIndex(p => p.userId !== userId);
    
    if (opponentIndex >= 0) {
      // Match found
      const opponent = waitingPlayers[opponentIndex];
      const gameId = `game-${Date.now()}`;
      
      // Create new game
      activeGames[gameId] = {
        players: [userId, opponent.userId],
        status: 'playing',
        createdAt: new Date()
      };

      // Remove opponent from waiting list
      waitingPlayers.splice(opponentIndex, 1);

      return res.json({ 
        gameId,
        opponent: opponent.userId
      });
    } else {
      // Add to waiting list
      if (!waitingPlayers.some(p => p.userId === userId)) {
        waitingPlayers.push({ userId, paymentId });
      }
      return res.json({ waiting: true });
    }
  } catch (error) {
    console.error('Error in joinMatch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const submitResult = async (req: Request, res: Response) => {
  try {
    const { gameId, winner } = req.body;
    const game = activeGames[gameId];

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Update game result
    game.winner = winner;
    game.endedAt = new Date();
    game.status = 'completed';

    // Process payout if there's a winner
    if (winner) {
      try {
        await processPayout(gameId, winner);
      } catch (payoutError) {
        console.error('Payout failed:', payoutError);
        // Handle payout failure (log, retry, etc.)
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in submitResult:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.body;
    
    // In a real app, verify with Pi SDK
    const pi = new Pi({
      environment: 'sandbox',
      apiKey: process.env.PI_API_KEY
    });

    const payment = await pi.getPayment(paymentId);
    
    if (payment.status === 'completed') {
      return res.json({ verified: true });
    }
    
    res.status(400).json({ verified: false });
  } catch (error) {
    console.error('Error in verifyPayment:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
};

// Helper functions
async function verifyPiPayment(paymentId: string): Promise<boolean> {
  // Implement actual Pi payment verification
  return true; // Mock implementation
}

async function processPayout(gameId: string, winnerId: string): Promise<void> {
  // Implement actual payout logic using Pi SDK
  const pi = new Pi({
    environment: 'sandbox',
    apiKey: process.env.PI_API_KEY
  });

  // Payout 0.018 π to winner (0.02 - 0.002 fee)
  await pi.createPayout({
    amount: 0.018,
    recipient: winnerId,
    memo: `You won the chess game ${gameId}`
  });
}