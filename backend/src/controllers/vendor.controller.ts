import { Request, Response } from 'express';
import { AppDataSource } from '../database/config';
import { Order, OrderDocumentStatus, Document, Shipment, VendorProfile, Product } from '../entities';

// Get vendor's own profile
export const getMyProfile = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const vendorProfileRepo = AppDataSource.getRepository(VendorProfile);
    
    // Get vendor profile for this user
    const vendorProfile = await vendorProfileRepo.findOne({
      where: { userId: user.userId },
    });
    
    if (!vendorProfile) {
      return res.status(404).json({ error: 'Vendor profile not found' });
    }
    
    res.json({ 
      vendor: {
        id: vendorProfile.id,
        companyName: vendorProfile.companyName,
        status: vendorProfile.status,
        capacity: vendorProfile.capacity,
        licenseNumber: vendorProfile.licenseNumber,
        warehouseAddress: vendorProfile.warehouseAddress,
      },
    });
  } catch (error) {
    console.error('Error fetching vendor profile:', error);
    res.status(500).json({ error: 'Failed to fetch vendor profile' });
  }
};

// Accept partnership invitation
export const acceptInvitation = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const vendorProfileRepo = AppDataSource.getRepository(VendorProfile);
    
    // Get vendor profile for this user
    const vendorProfile = await vendorProfileRepo.findOne({
      where: { userId: user.userId },
    });
    
    if (!vendorProfile) {
      return res.status(404).json({ error: 'Vendor profile not found' });
    }
    
    if (vendorProfile.status !== 'INVITED') {
      return res.status(400).json({ error: 'Vendor is not in INVITED status' });
    }
    
    // Update status to ACCEPTED
    vendorProfile.status = 'ACCEPTED';
    await vendorProfileRepo.save(vendorProfile);
    
    res.json({ 
      message: 'Partnership accepted successfully',
      vendor: {
        id: vendorProfile.id,
        companyName: vendorProfile.companyName,
        status: vendorProfile.status,
        capacity: vendorProfile.capacity,
      },
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
};

// Get orders for this vendor
export const getMyOrders = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const orderRepo = AppDataSource.getRepository(Order);
    const vendorProfileRepo = AppDataSource.getRepository(VendorProfile);
    const docStatusRepo = AppDataSource.getRepository(OrderDocumentStatus);
    const productRepo = AppDataSource.getRepository(Product);
    
    // Get vendor profile for this user
    const vendorProfile = await vendorProfileRepo.findOne({
      where: { userId: user.userId },
    });
    
    if (!vendorProfile) {
      return res.status(404).json({ error: 'Vendor profile not found' });
    }
    
    // Get all orders for this vendor
    const orders = await orderRepo.find({
      where: { vendorId: vendorProfile.id },
      order: { createdAt: 'DESC' },
    });
    
    // Get document requirements for each order and product details
    const ordersWithRequirements = await Promise.all(
      orders.map(async (order) => {
        const requirements = await docStatusRepo.find({
          where: { orderId: order.id },
        });
        
        // Get product details
        const product = await productRepo.findOne({
          where: { id: order.productId },
        });
        
        return {
          ...order,
          requirements,
          productName: product?.name || 'Unknown Product',
        };
      })
    );
    
    res.json({ 
      orders: ordersWithRequirements,
      vendorProfile: {
        id: vendorProfile.id,
        companyName: vendorProfile.companyName,
        status: vendorProfile.status,
        capacity: vendorProfile.capacity,
      },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

// Accept an order
export const acceptOrder = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { orderId } = req.params;
    
    const orderRepo = AppDataSource.getRepository(Order);
    
    const order = await orderRepo.findOne({ where: { id: orderId } });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (order.status !== 'REQUESTED') {
      return res.status(400).json({ error: 'Order cannot be accepted in current status' });
    }
    
    // Update order status
    order.status = 'DOCS_PENDING';
    await orderRepo.save(order);
    
    res.json({
      message: 'Order accepted successfully',
      order,
    });
  } catch (error) {
    console.error('Error accepting order:', error);
    res.status(500).json({ error: 'Failed to accept order' });
  }
};

// Upload document
export const uploadDocument = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { orderId, docType, fileName } = req.body;
    
    // Validation
    if (!orderId || !docType || !fileName) {
      return res.status(400).json({ error: 'Order ID, document type, and file are required' });
    }
    
    const documentRepo = AppDataSource.getRepository(Document);
    const docStatusRepo = AppDataSource.getRepository(OrderDocumentStatus);
    const orderRepo = AppDataSource.getRepository(Order);
    
    // Get order and product info
    const order = await orderRepo.findOne({ where: { id: orderId } });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const document = documentRepo.create({
      orderId,
      productId: order.productId,
      docType,
      fileName,
      filePath: `/uploads/documents/${orderId}/${fileName}`,
      status: 'PENDING_REVIEW',
      category: 'TRANSACTIONAL',
      companyId: user.companyId,
      uploadedById: user.userId,
      uploadedBy: user.userId,
    });
    await documentRepo.save(document);
    
    // Update order document status
    const docStatus = await docStatusRepo.findOne({
      where: { orderId, docType },
    });
    
    if (docStatus) {
      docStatus.status = 'PENDING_REVIEW';
      docStatus.uploadedDocId = document.id;
      await docStatusRepo.save(docStatus);
    }
    
    res.json({
      message: 'Document uploaded successfully',
      document,
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
};

// Create shipment
export const createShipment = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { orderId, trackingNumber, courier } = req.body;
    
    // Validation
    if (!orderId || !trackingNumber || !courier) {
      return res.status(400).json({ error: 'Order ID, tracking number, and courier are required' });
    }
    
    const shipmentRepo = AppDataSource.getRepository(Shipment);
    const orderRepo = AppDataSource.getRepository(Order);
    
    // Get order
    const order = await orderRepo.findOne({ where: { id: orderId } });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (order.status !== 'READY_TO_SHIP') {
      return res.status(400).json({ error: 'Order is not ready to ship' });
    }
    
    // Create shipment
    const shipment = shipmentRepo.create({
      orderId,
      orderNumber: order.orderNumber,
      trackingNumber,
      courier,
      courierName: courier,
      status: 'IN_TRANSIT',
      location: 'Warehouse',
      currentLocation: 'Warehouse',
      companyId: user.companyId,
      createdById: user.userId,
    });
    await shipmentRepo.save(shipment);
    
    // Update order status
    order.status = 'IN_TRANSIT';
    await orderRepo.save(order);
    
    res.json({
      message: 'Shipment created successfully',
      shipment,
    });
  } catch (error) {
    console.error('Error creating shipment:', error);
    res.status(500).json({ error: 'Failed to create shipment' });
  }
};