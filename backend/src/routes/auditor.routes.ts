import { Router } from 'express';
import { 
  logAction,
  getAuditLogs,
  getOrderTrace,
  generateComplianceReport,
} from '../controllers/auditor.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth';

const router = Router();

// Log action route (accessible to all authenticated users, not just auditors)
router.post('/logs/record', authenticateToken, logAction);

// All other routes require authentication and AUDITOR role
router.use(authenticateToken);
router.use(authorizeRole('AUDITOR'));

// Get audit logs with filters
router.get('/logs', getAuditLogs);

// Get complete trace for an order
router.get('/orders/:orderId/trace', getOrderTrace);

// Generate compliance report
router.post('/reports/generate', generateComplianceReport);

export default router;