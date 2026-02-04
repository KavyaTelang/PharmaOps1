import { AppDataSource } from '../database/config';
import { AuditTrail } from '../entities';

export const createAuditLog = async (data: {
  companyId: string;
  actorUserId: string;
  action: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  comments?: string;
}) => {
  try {
    const auditRepo = AppDataSource.getRepository(AuditTrail);
    const audit = auditRepo.create(data);
    await auditRepo.save(audit);
  } catch (error) {
    console.error('Audit log failed:', error);
  }
};

export const AuditActions = {
  USER_LOGIN: 'USER_LOGIN',
  USER_CREATED: 'USER_CREATED',
  VENDOR_INVITED: 'VENDOR_INVITED',
  VENDOR_ACCEPTED: 'VENDOR_ACCEPTED',
  ORDER_CREATED: 'ORDER_CREATED',
  ORDER_ACCEPTED: 'ORDER_ACCEPTED',
  DOCUMENT_UPLOADED: 'DOCUMENT_UPLOADED',
  DOCUMENT_APPROVED: 'DOCUMENT_APPROVED',
  DOCUMENT_REJECTED: 'DOCUMENT_REJECTED',
  SHIPMENT_CREATED: 'SHIPMENT_CREATED',
};