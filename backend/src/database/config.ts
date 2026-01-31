import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { entities } from '../entities';
import * as dotenv from 'dotenv'; // Add this

dotenv.config(); // Add this to load your .env file

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL, // Now this will be read correctly
  synchronize: true,
  logging: false,
  entities,
  subscribers: [],
  migrations: [],
});

export const initializeDatabase = async () => {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');
    await AppDataSource.synchronize();
    console.log('✅ Schema synchronized');
  } catch (error) {
    console.error('❌ Database error:', error);
    process.exit(1);
  }
};