import { Request, Response } from 'express';
import { AppDataSource } from '../database/config';
import { AuditTrail } from '../entities';
import { Order } from '../entities';
import { Document } from '../entities';
import { Shipment } from '../entities';
import { OrderDocumentStatus } from '../entities';

// Get audit logs with filters
export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { startDate, endDate, entityType, action, limit = 100 } = req.query;
    
    const auditRepo = AppDataSource.getRepository(AuditTrail);
    
    const queryBuilder = auditRepo.createQueryBuilder('audit')
      .where('audit.companyId = :companyId', { companyId: user.companyId })
      .orderBy('audit.timestamp', 'DESC')
      .limit(parseInt(limit as string));
    
    // Apply filters
    if (startDate) {
      queryBuilder.andWhere('audit.timestamp >= :startDate', { startDate });
    }
    if (endDate) {
      queryBuilder.andWhere('audit.timestamp <= :endDate', { endDate });
    }
    if (entityType) {
      queryBuilder.andWhere('audit.entityType = :entityType', { entityType });
    }
    if (action) {
      queryBuilder.andWhere('audit.action = :action', { action });
    }
    
    const auditLogs = await queryBuilder.getMany();
    
    res.json({ 
      auditLogs,
      total: auditLogs.length,
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

// Get complete trace for an order
export const getOrderTrace = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { orderId } = req.params;
    
    const orderRepo = AppDataSource.getRepository(Order);
    const documentRepo = AppDataSource.getRepository(Document);
    const shipmentRepo = AppDataSource.getRepository(Shipment);
    const docStatusRepo = AppDataSource.getRepository(OrderDocumentStatus);
    const auditRepo = AppDataSource.getRepository(AuditTrail);
    
    // Get order
    const order = await orderRepo.findOne({
      where: { id: orderId, companyId: user.companyId },
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Get all related entities
    const documents = await documentRepo.find({
      where: { orderId },
      order: { createdAt: 'ASC' },
    });
    
    const documentStatuses = await docStatusRepo.find({
      where: { orderId },
    });
    
    const shipments = await shipmentRepo.find({
      where: { orderId },
      order: { createdAt: 'ASC' },
    });
    
    const auditLogs = await auditRepo.find({
      where: { entityId: orderId },
      order: { timestamp: 'ASC' },
    });
    
    // Build timeline
    const timeline = [
      {
        timestamp: order.createdAt,
        event: 'ORDER_CREATED',
        description: `Order ${order.orderNumber} created`,
        data: order,
      },
      ...documents.map(doc => ({
        timestamp: doc.createdAt,
        event: 'DOCUMENT_UPLOADED',
        description: `Document ${doc.docType} uploaded`,
        data: doc,
      })),
      ...documents
        .filter(doc => doc.reviewedAt)
        .map(doc => ({
          timestamp: doc.reviewedAt,
          event: `DOCUMENT_${doc.status}`,
          description: `Document ${doc.docType} ${doc.status.toLowerCase()}`,
          data: doc,
        })),
      ...shipments.map(shipment => ({
        timestamp: shipment.createdAt,
        event: 'SHIPMENT_CREATED',
        description: `Shipment created with tracking ${shipment.trackingNumber}`,
        data: shipment,
      })),
    ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    res.json({
      order,
      documents,
      documentStatuses,
      shipments,
      auditLogs,
      timeline,
    });
  } catch (error) {
    console.error('Error fetching order trace:', error);
    res.status(500).json({ error: 'Failed to fetch order trace' });
  }
};

// Generate compliance report
export const generateComplianceReport = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { startDate, endDate, reportType } = req.body;
    
    const orderRepo = AppDataSource.getRepository(Order);
    const documentRepo = AppDataSource.getRepository(Document);
    
    // Get orders in date range
    const queryBuilder = orderRepo.createQueryBuilder('order')
      .where('order.companyId = :companyId', { companyId: user.companyId })
      .orderBy('order.createdAt', 'DESC');
    
    if (startDate) {
      queryBuilder.andWhere('order.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      queryBuilder.andWhere('order.createdAt <= :endDate', { endDate });
    }
    
    const orders = await queryBuilder.getMany();
    
    // Calculate statistics
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === 'DELIVERED').length;
    const pendingOrders = orders.filter(o => ['REQUESTED', 'DOCS_PENDING', 'READY_TO_SHIP', 'IN_TRANSIT'].includes(o.status)).length;
    
    // Document statistics
    const documents = await documentRepo.find({
      where: { companyId: user.companyId },
    });
    
    const totalDocuments = documents.length;
    const approvedDocuments = documents.filter(d => d.status === 'APPROVED').length;
    const rejectedDocuments = documents.filter(d => d.status === 'REJECTED').length;
    const pendingDocuments = documents.filter(d => d.status === 'PENDING_REVIEW').length;
    
    const report = {
      reportType: reportType || 'COMPLIANCE_SUMMARY',
      generatedAt: new Date(),
      generatedBy: user.email,
      dateRange: {
        startDate: startDate || 'All time',
        endDate: endDate || 'Present',
      },
      summary: {
        orders: {
          total: totalOrders,
          completed: completedOrders,
          pending: pendingOrders,
          completionRate: totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(2) + '%' : '0%',
        },
        documents: {
          total: totalDocuments,
          approved: approvedDocuments,
          rejected: rejectedDocuments,
          pending: pendingDocuments,
          approvalRate: totalDocuments > 0 ? ((approvedDocuments / totalDocuments) * 100).toFixed(2) + '%' : '0%',
        },
      },
      orders: orders.map(order => ({
        orderNumber: order.orderNumber,
        status: order.status,
        quantity: order.quantity,
        destination: order.destination,
        createdAt: order.createdAt,
      })),
    };
    
    res.json({ report });
  } catch (error) {
    console.error('Error generating compliance report:', error);
    res.status(500).json({ error: 'Failed to generate compliance report' });
  }
};