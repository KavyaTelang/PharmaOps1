import { Request, Response } from 'express';
import { In } from 'typeorm';
import { AppDataSource } from '../database/config';
import { Product } from '../entities';
import { User } from '../entities';
import { VendorProfile } from '../entities';
import { Order } from '../entities';
import { OrderDocumentStatus } from '../entities';
import { DocumentRequirement } from '../entities';
import { Document } from '../entities';
import { Shipment } from '../entities';
import bcrypt from 'bcrypt';

// Get all products
export const getProducts = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const productRepo = AppDataSource.getRepository(Product);
    
    const products = await productRepo.find({
      where: { companyId: user.companyId },
    });
    
    res.json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

// Get all vendors
export const getVendors = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const vendorProfileRepo = AppDataSource.getRepository(VendorProfile);
    const userRepo = AppDataSource.getRepository(User);
    
    const vendorProfiles = await vendorProfileRepo.find({
      where: { companyId: user.companyId },
    });
    
    // Get user details for each vendor
    const vendors = await Promise.all(
      vendorProfiles.map(async (profile) => {
        const vendorUser = await userRepo.findOne({ where: { id: profile.userId } });
        return {
          id: profile.id,
          email: vendorUser?.email,
          companyName: profile.companyName,
          status: profile.status,
          capacity: profile.capacity,
          userId: profile.userId,
        };
      })
    );
    
    res.json({ vendors });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
};

// Get all orders
export const getOrders = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const orderRepo = AppDataSource.getRepository(Order);
    
    const orders = await orderRepo.find({
      where: { companyId: user.companyId },
      order: { createdAt: 'DESC' },
    });
    
    res.json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

// Get all shipments
export const getShipments = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const shipmentRepo = AppDataSource.getRepository(Shipment);
    const orderRepo = AppDataSource.getRepository(Order);
    
    // Get all shipments for orders in this company
    const orders = await orderRepo.find({
      where: { companyId: user.companyId },
      select: ['id'],
    });
    
    const orderIds = orders.map(o => o.id);
    
    const shipments = await shipmentRepo.find({
      where: orderIds.length > 0 ? { orderId: In(orderIds) } : {},
      order: { createdAt: 'DESC' },
    });
    
    res.json({ shipments });
  } catch (error) {
    console.error('Error fetching shipments:', error);
    res.status(500).json({ error: 'Failed to fetch shipments' });
  }
};

// Create new order request
export const createOrderRequest = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { vendorId, productId, quantity, destination } = req.body;
    
    // Validation
    if (!vendorId || !productId || !quantity || !destination) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    const orderRepo = AppDataSource.getRepository(Order);
    const docStatusRepo = AppDataSource.getRepository(OrderDocumentStatus);
    const docReqRepo = AppDataSource.getRepository(DocumentRequirement);
    
    // Generate order number
    const orderCount = await orderRepo.count();
    const orderNumber = `ORD-${String(orderCount + 1).padStart(5, '0')}`;
    
    // Create order
    const order = orderRepo.create({
      orderNumber,
      vendorId,
      productId,
      quantity,
      destination,
      status: 'REQUESTED',
      companyId: user.companyId,
      createdById: user.userId,
    });
    await orderRepo.save(order);
    
    // Get document requirements for this product (match both specific destination and 'ALL')
    const requirements = await docReqRepo.find({
      where: [
        { productId, destination },
        { productId, destination: 'ALL' }
      ],
    });
    
    // Create document status entries for each requirement
    for (const req of requirements) {
      const docStatus = docStatusRepo.create({
        orderId: order.id,
        docType: req.docType,
        required: true,
        status: 'MISSING',
        category: req.category,
      });
      await docStatusRepo.save(docStatus);
    }
    
    res.json({ 
      message: 'Order created successfully',
      order,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

// Invite new vendor
export const inviteVendor = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { email, companyName, capacity } = req.body;
    
    // Validation
    if (!email || !companyName) {
      return res.status(400).json({ error: 'Email and company name are required' });
    }
    
    const userRepo = AppDataSource.getRepository(User);
    const vendorProfileRepo = AppDataSource.getRepository(VendorProfile);
    
    // Check if user already exists
    const existingUser = await userRepo.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    // Create vendor user account with temporary password
    const tempPassword = 'vendor123'; // In production, generate random password and send via email
    const vendorUser = userRepo.create({
      email,
      passwordHash: await bcrypt.hash(tempPassword, 10),
      role: 'VENDOR',
      name: companyName,
      companyId: user.companyId,
    });
    await userRepo.save(vendorUser);
    
    // Create vendor profile
    const vendorProfile = vendorProfileRepo.create({
      userId: vendorUser.id,
      companyName,
      status: 'INVITED',
      capacity: capacity || 1000,
      companyId: user.companyId,
    });
    await vendorProfileRepo.save(vendorProfile);
    
    res.json({
      message: 'Vendor invited successfully',
      vendor: {
        id: vendorProfile.id,
        email: vendorUser.email,
        companyName: vendorProfile.companyName,
        status: vendorProfile.status,
        tempPassword, // In production, don't return this - send via email
      },
    });
  } catch (error) {
    console.error('Error inviting vendor:', error);
    res.status(500).json({ error: 'Failed to invite vendor' });
  }
};

// Define compliance rule
export const defineComplianceRule = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { productId, requirement, docType, category, destination } = req.body;
    
    // Validation
    if (!productId || !requirement || !docType) {
      return res.status(400).json({ error: 'Product, requirement, and document type are required' });
    }
    
    const docReqRepo = AppDataSource.getRepository(DocumentRequirement);
    
    // Create document requirement
    const docRequirement = docReqRepo.create({
      productId,
      destination: destination || 'ALL',
      requirement,
      docType,
      category: category || 'TRANSACTIONAL',
      companyId: user.companyId,
    });
    await docReqRepo.save(docRequirement);
    
    res.json({
      message: 'Compliance rule defined successfully',
      requirement: docRequirement,
    });
  } catch (error) {
    console.error('Error defining compliance rule:', error);
    res.status(500).json({ error: 'Failed to define compliance rule' });
  }
};

// Upload master SOP
export const uploadMasterSOP = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { productId, docType, fileName } = req.body;
    
    // Validation
    if (!productId || !docType || !fileName) {
      return res.status(400).json({ error: 'Product, document type, and file are required' });
    }
    
    const documentRepo = AppDataSource.getRepository(Document);
    
    // In a real implementation, you would:
    // 1. Upload file to S3/MinIO
    // 2. Store file URL in database
    // For now, we'll just store metadata
    
    const document = documentRepo.create({
      productId,
      docType,
      fileName,
      filePath: `/uploads/master/${fileName}`, // Mock path
      status: 'APPROVED', // Master docs are pre-approved
      category: 'MASTER',
      companyId: user.companyId,
      uploadedById: user.userId,
      uploadedBy: user.userId,
    });
    await documentRepo.save(document);
    
    res.json({
      message: 'Master SOP uploaded successfully',
      document,
    });
  } catch (error) {
    console.error('Error uploading master SOP:', error);
    res.status(500).json({ error: 'Failed to upload master SOP' });
  }
};