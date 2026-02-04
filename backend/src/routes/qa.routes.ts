import { Router } from 'express';
import { 
  getPendingDocuments,
  getMasterSOPs,
  reviewDocument,
  getDocumentDetails,
} from '../controllers/qa.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth';

const router = Router();

// All routes require authentication and QA role
router.use(authenticateToken);
router.use(authorizeRole('QA'));

// Get all documents pending review
router.get('/documents/pending', getPendingDocuments);

// Get master SOP documents
router.get('/documents/master', getMasterSOPs);

// Get details of a specific document
router.get('/documents/:documentId', getDocumentDetails);

// Review a document (approve/reject)
router.post('/documents/:documentId/review', reviewDocument);

export default router;