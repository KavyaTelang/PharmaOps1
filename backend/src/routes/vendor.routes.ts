import { Router } from 'express';
import { 
  getMyProfile,
  acceptInvitation,
  getMyOrders,
  acceptOrder,
  uploadDocument,
  createShipment,
} from '../controllers/vendor.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth';

const router = Router();

// All routes require authentication and VENDOR role
router.use(authenticateToken);
router.use(authorizeRole('VENDOR'));

// Get vendor's own profile
router.get('/profile', getMyProfile);

// Accept partnership invitation
router.post('/accept-invitation', acceptInvitation);

// Get orders assigned to this vendor
router.get('/orders', getMyOrders);

// Accept an order request
router.post('/orders/:orderId/accept', acceptOrder);

// Upload a compliance document
router.post('/documents/upload', uploadDocument);

// Create shipment with tracking
router.post('/shipments/create', createShipment);

export default router;