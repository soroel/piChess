import express from 'express';
import { authenticate } from '../middleware/auth';
import { 
  joinMatch, 
  submitResult, 
  verifyPayment 
} from '../controllers/gameController';

const router = express.Router();

// Public routes
router.post('/auth/login', (req, res) => {
  // This would handle Pi authentication
  res.json({ success: true });
});

// Protected routes
router.post('/match/join', authenticate, joinMatch);
router.post('/match/result', authenticate, submitResult);
router.post('/payment/verify', authenticate, verifyPayment);

export default router;