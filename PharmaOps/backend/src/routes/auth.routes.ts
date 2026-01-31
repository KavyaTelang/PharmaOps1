import { Router } from 'express';
import { login, getCurrentUser } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Login - no authentication required
router.post('/login', login);

// Get current user - requires authentication
router.get('/me', authenticateToken, getCurrentUser);

export default router;