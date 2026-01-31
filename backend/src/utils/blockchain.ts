import crypto from 'crypto';
import { AppDataSource } from '../database/config';
import { BlockchainAnchor } from '../entities';

export const anchorToBlockchain = async (entityId: string, entityType: 'DOCUMENT' | 'SHIPMENT', dataHash: string) => {
  const txHash = `0x${crypto.randomBytes(32).toString('hex')}`;
  const blockTimestamp = new Date();

  const anchorRepo = AppDataSource.getRepository(BlockchainAnchor);
  const anchor = anchorRepo.create({
    entityId,
    entityType,
    txHash,
    blockTimestamp,
    blockchainNetwork: 'mock',
  });
  await anchorRepo.save(anchor);

  return { txHash, blockTimestamp, network: 'mock' };
};

export const generateFileHash = (buffer: Buffer): string => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};