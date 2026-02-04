import { Request, Response, NextFunction } from 'express';
const jwt = require('jsonwebtoken');
import { AppDataSource } from '../database/config';
import { User } from '../entities';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthRequest extends Request {
  user?: any;
}

// This is what your routes are calling: authenticateToken
export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('Auth middleware - Token received:', token ? 'YES' : 'NO'); // Debug

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    console.log('Auth middleware - Decoded token:', decoded); // Debug
    
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: decoded.userId } });

    if (!user) {
      console.log('Auth middleware - User not found'); // Debug
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log('Auth middleware - User found:', user.email, 'Role:', user.role); // Debug

    // Attach user info to request
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };

    next();
  } catch (error) {
    console.error('Auth middleware - Error:', error); // Debug
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// This is what your routes are calling: authorizeRole
export const authorizeRole = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    console.log('Role check - User role:', req.user?.role, 'Allowed:', allowedRoles); // Debug
    
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Helper function to generate JWT tokens
export const generateToken = (userId: string, email: string, role: string): string => {
  return jwt.sign(
    { userId, email, role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};