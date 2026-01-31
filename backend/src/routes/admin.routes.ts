import { Router } from 'express';
import { 
  getProducts, 
  getVendors, 
  getOrders,
  getShipments,
  createOrderRequest,
  inviteVendor,
  defineComplianceRule,
  uploadMasterSOP,
} from '../controllers/admin.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(authorizeRole('ADMIN'));

// Get all products
router.get('/products', getProducts);

// Get all vendors
router.get('/vendors', getVendors);

// Get all orders
router.get('/orders', getOrders);

// Get all shipments
router.get('/shipments', getShipments);

// Create new order request
router.post('/orders/create-request', createOrderRequest);

// Invite new vendor
router.post('/vendors/invite', inviteVendor);

// Define compliance rule for product
router.post('/compliance/define-rule', defineComplianceRule);

// Upload master SOP document
router.post('/documents/upload-master', uploadMasterSOP);

export default router;