import { Router } from 'express';
import { 
  getAuditLogs,
  getOrderTrace,
  generateComplianceReport,
} from '../controllers/auditor.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth';

const router = Router();

// All routes require authentication and AUDITOR role
router.use(authenticateToken);
router.use(authorizeRole('AUDITOR'));

// Get audit logs with filters
router.get('/logs', getAuditLogs);

// Get complete trace for an order
router.get('/orders/:orderId/trace', getOrderTrace);

// Generate compliance report
router.post('/reports/generate', generateComplianceReport);

export default router;