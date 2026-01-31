# PharmaOps Backend - Supply Chain Compliance Platform

A pharmaceutical supply chain management platform with multi-role authentication, document compliance tracking, and blockchain anchoring.

## 🏗️ Architecture

- **Backend**: Node.js + TypeScript + Express
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT with role-based access control
- **Storage**: AWS S3 / MinIO (S3-compatible)
- **Caching**: Redis
- **Blockchain**: Mock implementation (production-ready for Hyperledger/Ethereum)
- **Compliance**: 21 CFR Part 11 compliant audit trails

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)

### Setup

1. **Clone and navigate to backend directory**
```bash
cd backend
```

2. **Create environment file**
```bash
cp .env.example .env
```

3. **Start all services with Docker**
```bash
docker-compose up -d
```

This will start:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Backend API (port 3000)
- MinIO (ports 9000, 9001)

4. **Check service health**
```bash
curl http://localhost:3000/health
```

### Local Development (without Docker)

1. **Install dependencies**
```bash
npm install
```

2. **Ensure PostgreSQL and Redis are running**

3. **Run migrations and seed data**
```bash
npm run migrate
npm run seed
```

4. **Start development server**
```bash
npm run dev
```

## 📋 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Admin Role
- `POST /api/admin/invite-vendor` - Invite vendor
- `GET /api/admin/vendors` - List vendors
- `POST /api/admin/rules/define-requirement` - Define compliance rule
- `POST /api/admin/documents/master-upload` - Upload master SOP
- `POST /api/admin/orders/create-request` - Create order
- `GET /api/admin/orders` - List orders
- `GET /api/admin/shipments` - List shipments
- `GET /api/admin/shipments/:id/tracking-data` - Get tracking data
- `GET /api/admin/dashboard-stats` - Dashboard statistics

### Vendor Role
- `GET /api/vendor/my-requests` - Get order requests
- `POST /api/vendor/orders/:id/accept` - Accept order
- `GET /api/vendor/orders/:id/checklist` - Get document checklist
- `POST /api/vendor/documents/upload` - Upload document
- `POST /api/vendor/shipments/create` - Create shipment

### QA Role
- `GET /api/qa/review-queue` - Get documents pending review
- `GET /api/qa/documents/:id/details` - Get document details
- `POST /api/qa/documents/:id/approve` - Approve document (21 CFR Part 11)
- `POST /api/qa/documents/:id/reject` - Reject document
- `GET /api/qa/stats` - QA statistics

### Auditor Role
- `GET /api/auditor/action-logs` - Get audit logs
- `GET /api/auditor/evidence-pack/:docId` - Get document evidence pack
- `GET /api/auditor/trace-order/:orderId` - Trace order lifecycle
- `GET /api/auditor/user-history/:userId` - Get user action history

## 🔐 Authentication

All protected endpoints require a JWT token in the Authorization header:

```bash
Authorization: Bearer <token>
```

### Example Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@pharmaops.com",
    "password": "admin123"
  }'
```

## 📊 Database Schema

The system uses 12 main tables:

1. **companies** - Multi-tenant organization data
2. **users** - User accounts (Admin, Vendor, QA, Auditor)
3. **vendor_profiles** - Extended vendor information
4. **products** - Product catalog
5. **vendor_product_assignments** - Vendor-product relationships
6. **document_requirements** - Compliance rules
7. **orders** - Procurement orders
8. **order_document_status** - Document compliance checklists
9. **documents** - Uploaded files metadata
10. **shipments** - Logistics tracking
11. **blockchain_anchors** - Blockchain proof records
12. **audit_trails** - Immutable action logs

## 🔄 Key Workflows

### 1. Order Creation & Acceptance
```
Admin creates order → Vendor receives request → Vendor accepts →
System generates checklist → Order status: DOCS_PENDING
```

### 2. Document Upload & Review
```
Vendor uploads docs → Status: PENDING_REVIEW → QA reviews →
QA approves with e-signature → Blockchain anchor created →
Document status: APPROVED
```

### 3. Compliance Gate
```
All documents approved → Order status: READY_TO_SHIP →
Vendor creates shipment → Order status: IN_TRANSIT
```

## 🛡️ Security Features

- **JWT Authentication** with role-based access control
- **21 CFR Part 11 Compliance** - Electronic signatures with password verification
- **Immutable Audit Trail** - All actions logged permanently
- **Blockchain Anchoring** - Document integrity verification
- **File Hash Verification** - SHA-256 hashing
- **Password Hashing** - bcrypt with salt

## 🧪 Testing

```bash
npm test
```

## 📝 Environment Variables

See `.env.example` for all available configuration options.

## 🐳 Docker Services

- **postgres**: PostgreSQL 15
- **redis**: Redis 7
- **backend**: Node.js API server
- **minio**: S3-compatible object storage

### Access MinIO Console
```
URL: http://localhost:9001
Username: minioadmin
Password: minioadmin123
```

## 📦 Project Structure

```
backend/
├── src/
│   ├── controllers/      # Business logic
│   ├── routes/          # API routes
│   ├── entities/        # TypeORM entities
│   ├── middleware/      # Auth, error handling
│   ├── utils/           # Helpers (blockchain, storage, audit)
│   ├── database/        # DB config & migrations
│   └── server.ts        # Entry point
├── Dockerfile
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

## 🔧 Troubleshooting

### Database connection issues
```bash
docker-compose logs postgres
```

### Backend not starting
```bash
docker-compose logs backend
```

### Reset database
```bash
docker-compose down -v
docker-compose up -d
```

## 📄 License

MIT

## 👥 Support

For issues or questions, please open a GitHub issue.