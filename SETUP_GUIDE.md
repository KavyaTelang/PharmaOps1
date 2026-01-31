# PharmaOps Backend - Complete Setup Guide

## 📦 What You'll Get

A complete pharmaceutical supply chain compliance backend with:
- ✅ Multi-role authentication (Admin, Vendor, QA, Auditor)
- ✅ Document compliance tracking
- ✅ 21 CFR Part 11 electronic signatures
- ✅ Blockchain anchoring (mock, production-ready)
- ✅ Immutable audit trails
- ✅ File storage (S3/MinIO)
- ✅ Real-time shipment tracking
- ✅ RESTful API with 40+ endpoints

## 🚀 Installation Steps

### Step 1: Project Structure

Create this directory structure:

```
pharmaops/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── entities/
│   │   ├── middleware/
│   │   ├── utils/
│   │   ├── database/
│   │   └── server.ts
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
├── docker-compose.yml
└── README.md
```

### Step 2: Copy All Files

Copy all the artifact files I've created:

1. `docker-compose.yml` (root directory)
2. `backend/Dockerfile`
3. `backend/package.json`
4. `backend/tsconfig.json`
5. All source files in `backend/src/`

### Step 3: Environment Setup

Create `backend/.env` file:

```bash
cd backend
cp .env.example .env
```

Edit `.env` if needed (defaults work for Docker setup).

### Step 4: Start Services

From the root directory:

```bash
# Start all services
docker-compose up -d

# Check if everything is running
docker-compose ps

# View logs
docker-compose logs -f backend
```

Expected output:
```
✅ Database connection established
✅ Database schema synchronized
🚀 PharmaOps Backend running on port 3000
```

### Step 5: Seed Initial Data

```bash
# Enter the backend container
docker-compose exec backend npm run seed
```

This creates:
- Default company (PharmaCorp)
- 4 test users (Admin, QA, Vendor, Auditor)
- 3 sample products

### Step 6: Test the API

```bash
# Health check
curl http://localhost:3000/health

# Login as admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@pharmacorp.com",
    "password": "admin123"
  }'
```

You should receive a JWT token!

## 🔧 Configuration

### Database Access

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U pharmaops -d pharmaops_db

# List tables
\dt

# View users
SELECT * FROM users;
```

### MinIO (File Storage)

Access MinIO console:
- URL: http://localhost:9001
- Username: `minioadmin`
- Password: `minioadmin123`

The bucket `pharmaops-documents` will be auto-created.

### Redis (Caching)

```bash
# Connect to Redis
docker-compose exec redis redis-cli

# Check keys
KEYS *
```

## 📝 API Testing Guide

### 1. Register/Login

**Login as Admin:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@pharmacorp.com",
    "password": "admin123"
  }'
```

Save the token from response:
```bash
export TOKEN="your-jwt-token-here"
```

### 2. Admin: Create Order

```bash
# First, get vendor and product IDs
curl http://localhost:3000/api/admin/vendors \
  -H "Authorization: Bearer $TOKEN"

curl http://localhost:3000/api/admin/products \
  -H "Authorization: Bearer $TOKEN"

# Create order
curl -X POST http://localhost:3000/api/admin/orders/create-request \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vendorId": "vendor-uuid",
    "productId": "product-uuid",
    "quantity": 500,
    "destination": "Germany"
  }'
```

### 3. Vendor: Accept Order

**Login as Vendor:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "vendor@fastlogistics.com",
    "password": "vendor123"
  }'

export VENDOR_TOKEN="vendor-jwt-token"
```

**Get requests and accept:**
```bash
# View my requests
curl http://localhost:3000/api/vendor/my-requests \
  -H "Authorization: Bearer $VENDOR_TOKEN"

# Accept order
curl -X POST http://localhost:3000/api/vendor/orders/{orderId}/accept \
  -H "Authorization: Bearer $VENDOR_TOKEN"

# View checklist
curl http://localhost:3000/api/vendor/orders/{orderId}/checklist \
  -H "Authorization: Bearer $VENDOR_TOKEN"
```

### 4. Vendor: Upload Document

```bash
curl -X POST http://localhost:3000/api/vendor/documents/upload \
  -H "Authorization: Bearer $VENDOR_TOKEN" \
  -F "file=@/path/to/document.pdf" \
  -F "orderId=order-uuid" \
  -F "docType=Certificate of Analysis"
```

### 5. QA: Review & Approve

**Login as QA:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "qa@pharmacorp.com",
    "password": "qa123"
  }'

export QA_TOKEN="qa-jwt-token"
```

**Review queue:**
```bash
curl http://localhost:3000/api/qa/review-queue \
  -H "Authorization: Bearer $QA_TOKEN"
```

**Approve document (21 CFR Part 11):**
```bash
curl -X POST http://localhost:3000/api/qa/documents/{docId}/approve \
  -H "Authorization: Bearer $QA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "qa123",
    "comments": "Document verified and compliant"
  }'
```

### 6. Vendor: Create Shipment

**After all docs approved:**
```bash
curl -X POST http://localhost:3000/api/vendor/shipments/create \
  -H "Authorization: Bearer $VENDOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order-uuid",
    "trackingNumber": "TRACK-12345",
    "courierName": "DHL Express"
  }'
```

### 7. Auditor: View Logs

**Login as Auditor:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "auditor@pharmacorp.com",
    "password": "auditor123"
  }'

export AUDITOR_TOKEN="auditor-jwt-token"
```

**View audit logs:**
```bash
curl "http://localhost:3000/api/auditor/action-logs?limit=50" \
  -H "Authorization: Bearer $AUDITOR_TOKEN"
```

**Trace order:**
```bash
curl http://localhost:3000/api/auditor/trace-order/{orderId} \
  -H "Authorization: Bearer $AUDITOR_TOKEN"
```

## 🐛 Troubleshooting

### Backend won't start

```bash
# Check logs
docker-compose logs backend

# Rebuild and restart
docker-compose down
docker-compose up --build
```

### Database connection failed

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### File upload fails

```bash
# Check MinIO is running
docker-compose ps minio

# Check MinIO logs
docker-compose logs minio

# Access MinIO console and verify bucket exists
# http://localhost:9001
```

### "Invalid token" errors

Your token might have expired (24h default). Login again to get a new token.

## 🔄 Development Workflow

### Making code changes

```bash
# Code changes are automatically reloaded (nodemon)
# Just save your files and check logs
docker-compose logs -f backend
```

### Reset database

```bash
# Stop containers and remove volumes
docker-compose down -v

# Start fresh
docker-compose up -d

# Re-seed data
docker-compose exec backend npm run seed
```

### View database changes

```bash
# Connect to database
docker-compose exec postgres psql -U pharmaops -d pharmaops_db

# Useful queries
SELECT * FROM users;
SELECT * FROM orders;
SELECT * FROM documents;
SELECT * FROM audit_trails ORDER BY timestamp DESC LIMIT 10;
```

## 📊 Monitoring

### API Performance

```bash
# Check response times
docker-compose logs backend | grep "Request completed"
```

### Database Connections

```bash
docker-compose exec postgres psql -U pharmaops -d pharmaops_db -c "SELECT count(*) FROM pg_stat_activity;"
```

### Storage Usage

```bash
# Check MinIO storage
curl http://localhost:9000/minio/health/live
```

## 🚢 Production Deployment

### Environment Changes

For production, update `.env`:

```bash
NODE_ENV=production
JWT_SECRET=<generate-strong-secret>
DATABASE_URL=<production-db-url>
AWS_S3_BUCKET=<production-bucket>
BLOCKCHAIN_NETWORK=hyperledger  # or ethereum
```

### Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secret
- [ ] Enable SSL/TLS for database
- [ ] Use production-grade S3 (AWS, not MinIO)
- [ ] Implement rate limiting
- [ ] Enable CORS properly
- [ ] Use environment-specific secrets
- [ ] Enable database backups
- [ ] Set up monitoring (DataDog, NewRelic)
- [ ] Configure log aggregation

### Docker Production Build

```bash
# Build production image
docker build -t pharmaops-backend:prod ./backend

# Run with production env
docker run -d \
  --env-file .env.production \
  -p 3000:3000 \
  pharmaops-backend:prod
```

## 📚 Next Steps

1. **Integrate with Frontend**: Connect your React dashboards
2. **Add AI Document Scanner**: Implement OCR for document verification
3. **Real Blockchain**: Replace mock with Hyperledger Fabric
4. **External APIs**: Integrate real carrier tracking (UPS, DHL)
5. **Notifications**: Add email/SMS alerts
6. **Advanced Analytics**: Build reporting dashboards
7. **Mobile App**: Create React Native companion app

## 🆘 Support

If you encounter issues:

1. Check logs: `docker-compose logs -f`
2. Verify all services: `docker-compose ps`
3. Test connectivity: `curl http://localhost:3000/health`
4. Check database: Connect with psql
5. Review error messages in terminal

Common issues are documented in the main README.md.

## ✅ Verification Checklist

After setup, verify:

- [ ] All 4 Docker containers running
- [ ] API health check returns 200
- [ ] Can login with test credentials
- [ ] Database has seeded data
- [ ] MinIO console accessible
- [ ] Can create and accept orders
- [ ] Document upload works
- [ ] QA approval flow works
- [ ] Audit logs are created
- [ ] Blockchain anchors created

If all checks pass, you're ready to go! 🎉