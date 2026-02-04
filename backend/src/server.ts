import express from 'express';
import cors from 'cors';
import { AppDataSource } from './database/config';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import vendorRoutes from './routes/vendor.routes';
import qaRoutes from './routes/qa.routes';
import auditorRoutes from './routes/auditor.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: AppDataSource.isInitialized ? 'connected' : 'disconnected',
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/qa', qaRoutes);
app.use('/api/auditor', auditorRoutes);

// Error handling
app.use(errorHandler);

// Initialize database and start server
AppDataSource.initialize()
  .then(() => {
    console.log('✅ Database connected');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`📍 API base: http://localhost:${PORT}/api`);
    });
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  });

export default app;