import { Request, Response } from 'express';
import { AppDataSource } from '../database/config';
import { Document } from '../entities';
import { OrderDocumentStatus } from '../entities';
import { Order } from '../entities';

// Get all pending documents
export const getPendingDocuments = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const documentRepo = AppDataSource.getRepository(Document);
    
    const documents = await documentRepo.find({
      where: { 
        companyId: user.companyId,
        status: 'PENDING_REVIEW',
      },
      order: { createdAt: 'DESC' },
    });
    
    res.json({ documents });
  } catch (error) {
    console.error('Error fetching pending documents:', error);
    res.status(500).json({ error: 'Failed to fetch pending documents' });
  }
};

// Get master SOP documents
export const getMasterSOPs = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const documentRepo = AppDataSource.getRepository(Document);
    
    const documents = await documentRepo.find({
      where: { 
        companyId: user.companyId,
        category: 'MASTER',
        status: 'APPROVED',
      },
      order: { createdAt: 'DESC' },
    });
    
    res.json({ documents });
  } catch (error) {
    console.error('Error fetching master documents:', error);
    res.status(500).json({ error: 'Failed to fetch master documents' });
  }
};

// Get document details
export const getDocumentDetails = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { documentId } = req.params;
    
    const documentRepo = AppDataSource.getRepository(Document);
    
    const document = await documentRepo.findOne({
      where: { id: documentId, companyId: user.companyId },
    });
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json({ document });
  } catch (error) {
    console.error('Error fetching document details:', error);
    res.status(500).json({ error: 'Failed to fetch document details' });
  }
};

// Review document (approve/reject)
export const reviewDocument = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { documentId } = req.params;
    const { action, comments } = req.body; // action: 'APPROVE' or 'REJECT'
    
    // Validation
    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be APPROVE or REJECT' });
    }
    
    const documentRepo = AppDataSource.getRepository(Document);
    const docStatusRepo = AppDataSource.getRepository(OrderDocumentStatus);
    const orderRepo = AppDataSource.getRepository(Order);
    
    // Get document
    const document = await documentRepo.findOne({
      where: { id: documentId, companyId: user.companyId },
    });
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    if (document.status !== 'PENDING_REVIEW') {
      return res.status(400).json({ error: 'Document is not pending review' });
    }
    
    // Update document status
    document.status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    document.reviewedById = user.id;
    document.reviewedAt = new Date();
    document.reviewComments = comments || null;
    await documentRepo.save(document);
    
    // Update order document status
    if (document.orderId) {
      const docStatus = await docStatusRepo.findOne({
        where: { 
          orderId: document.orderId,
          docType: document.docType,
        },
      });
      
      if (docStatus) {
        docStatus.status = document.status;
        await docStatusRepo.save(docStatus);
        
        // Check if all documents are approved for this order
        const allDocStatuses = await docStatusRepo.find({
          where: { orderId: document.orderId },
        });
        
        const allApproved = allDocStatuses.every(ds => ds.status === 'APPROVED');
        
        if (allApproved) {
          // Update order to READY_TO_SHIP
          const order = await orderRepo.findOne({ where: { id: document.orderId } });
          if (order && order.status === 'DOCS_PENDING') {
            order.status = 'READY_TO_SHIP';
            await orderRepo.save(order);
          }
        }
      }
    }
    
    res.json({
      message: `Document ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully`,
      document,
    });
  } catch (error) {
    console.error('Error reviewing document:', error);
    res.status(500).json({ error: 'Failed to review document' });
  }
};