import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { api } from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface Document {
  id: string;
  fileName: string;
  status: string;
  priority: string;
  orderNumber?: string;
  docType?: string;
  orderId?: string;
  createdAt?: string;
  blockchainTx?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  vendorId?: string;
  productId?: string;
  status: string;
  createdAt?: string;
}

interface Product {
  id: string;
  name: string;
  sku?: string;
}

interface Vendor {
  id: string;
  name: string;
  email: string;
}

interface AuditLog {
  id: string;
  action: string;
  actor: { name: string; role: string };
  entity: string;
  timestamp: string;
  changes?: any;
}

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  documents: Document[];
  orders: Order[];
  products: Product[];
  vendors: Vendor[];
  masterSOPs: Document[];
  auditLogs: AuditLog[];
  loading: boolean;
  error: string | null;
  loadDashboardData: () => Promise<void>;
  approveDocument: (docId: string, reviewer: string, password: string, comments?: string) => void;
  rejectDocument: (docId: string, reviewer: string, comments: string) => void;
  getVendorById: (id: string) => Vendor | undefined;
  getProductById: (id: string) => Product | undefined;
  getOrderById: (id: string) => Order | undefined;
  getOrderTimeline: (orderId: string) => any[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const [documents, setDocuments] = useState<Document[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [masterSOPs, setMasterSOPs] = useState<Document[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      if (user.role === 'ADMIN') {
        const [productsRes, vendorsRes, ordersRes] = await Promise.all([
          api.getProducts().catch(() => ({ products: [] })),
          api.getVendors().catch(() => ({ vendors: [] })),
          api.getOrders().catch(() => ({ orders: [] })),
        ]);
        setProducts(productsRes.products || []);
        setVendors(vendorsRes.vendors || []);
        setOrders(ordersRes.orders || []);
      } else if (user.role === 'VENDOR') {
        try {
          const ordersRes = await api.getMyOrders();
          setOrders(ordersRes.orders || []);
        } catch (err) {
          setOrders([]);
        }
      } else if (user.role === 'QA') {
        try {
          const [docsRes, masterRes] = await Promise.all([
            api.getPendingDocuments().catch(() => ({ documents: [] })),
            api.getMasterSOPs().catch(() => ({ documents: [] })),
          ]);
          setDocuments(docsRes.documents || []);
          setMasterSOPs(masterRes.documents || []);
        } catch (err) {
          setDocuments([]);
          setMasterSOPs([]);
        }
      } else if (user.role === 'AUDITOR') {
        try {
          const logsRes = await api.getAuditLogs();
          setAuditLogs(logsRes.logs || []);
        } catch (err) {
          setAuditLogs([]);
        }
        // Don't try to load admin orders for Auditor
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const approveDocument = async (docId: string, reviewer: string, password: string, comments?: string) => {
    try {
      await api.reviewDocument(docId, 'APPROVE', comments);
      // Reload documents after approval
      await loadDashboardData();
    } catch (error) {
      console.error('Error approving document:', error);
    }
  };

  const rejectDocument = async (docId: string, reviewer: string, comments: string) => {
    try {
      await api.reviewDocument(docId, 'REJECT', comments);
      // Reload documents after rejection
      await loadDashboardData();
    } catch (error) {
      console.error('Error rejecting document:', error);
    }
  };

  const getVendorById = (id: string) => vendors.find(v => v.id === id);
  const getProductById = (id: string) => products.find(p => p.id === id);
  const getOrderById = (id: string) => orders.find(o => o.id === id);
  
  const getOrderTimeline = (orderId: string) => {
    const order = getOrderById(orderId);
    if (!order) return [];
    // Return mock timeline data
    return [
      { action: 'ORDER_CREATED', timestamp: order.createdAt || new Date().toISOString(), actor: 'Admin' },
      { action: 'DOCUMENTS_PENDING', timestamp: new Date().toISOString(), actor: 'System' },
    ];
  };

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        documents,
        orders,
        products,
        vendors,
        masterSOPs,
        auditLogs,
        loading,
        error,
        loadDashboardData,
        approveDocument,
        rejectDocument,
        getVendorById,
        getProductById,
        getOrderById,
        getOrderTimeline,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};