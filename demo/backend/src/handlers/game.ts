import { Request, Response } from 'express';
import { Pi } from '@pi-apps/pi-sdk';
import { PiPlatform } from '@pi-apps/pi-platform';

// Initialize Pi SDK in sandbox mode
const pi = new Pi({
  environment: 'sandbox',
  appId: process.env.PI_APP_ID || 'your-app-id',
  appSecret: process.env.PI_APP_SECRET || 'your-app-secret'
});

const platform = new PiPlatform({
  environment: 'sandbox',
  appId: process.env.PI_APP_ID || 'your-app-id',
  appSecret: process.env.PI_APP_SECRET || 'your-app-secret'
});

interface GameSession {
  gameId: string;
  players: string[];
  status: 'waiting' | 'playing' | 'completed';
  winner?: string;
  paymentIds: string[];
}

const games: Record<string, GameSession> = {};

export const createGame = async (req: Request, res: Response) => {
  try {
    const { username } = req.body;
    
    // Create new game session
    const gameId = Date.now().toString();
    games[gameId] = {
      gameId,
      players: [username],
      status: 'waiting',
      paymentIds: [],
    };

    res.json(games[gameId]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create game' });
  }
};

export const handleGameResult = async (req: Request, res: Response) => {
  try {
    const { gameId, winner } = req.body;
    const game = games[gameId];

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Verify both players have made payments
    if (game.paymentIds.length !== 2) {
      return res.status(400).json({ error: 'Both players must make payments first' });
    }

    // Update game status and winner
    game.status = 'completed';
    game.winner = winner;

    // Simulate reward distribution for development
    console.log(`Winner: ${winner}`);
    console.log(`Game ID: ${gameId}`);

    res.json(game);
  } catch (error) {
    console.error('Error handling game result:', error);
    res.status(500).json({ error: 'Failed to handle game result' });
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.body;
    const game = Object.values(games).find(g => g.paymentIds.length < 2);

    if (!game) {
      return res.status(404).json({ error: 'No active game found' });
    }

    // Simulate payment verification for development
    game.paymentIds.push(paymentId);
  
    if (game.paymentIds.length === 2) {
      game.status = 'playing';
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
};
