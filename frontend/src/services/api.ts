const API_BASE_URL = 'http://localhost:3000/api';

const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('authToken');
  
  console.log('Making API call:', endpoint, 'with token:', token ? 'YES' : 'NO'); // Debug log
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  console.log('Response status:', response.status); // Debug log

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
};

export const api = {
  // ===== AUTH =====
  login: async (email: string, password: string) => {
    const data = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    console.log('Login response:', data); // Debug log
    
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },

  getCurrentUser: () => apiCall('/auth/me'),

  // ===== ADMIN ENDPOINTS =====
  getProducts: () => apiCall('/admin/products'),
  getVendors: () => apiCall('/admin/vendors'),
  getOrders: () => apiCall('/admin/orders'),
  getShipments: () => apiCall('/admin/shipments'),
  
  createOrder: (data: { vendorId: string; productId: string; quantity: number; destination: string }) =>
    apiCall('/admin/orders/create-request', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  inviteVendor: (data: { email: string; companyName: string; capacity: number }) =>
    apiCall('/admin/vendors/invite', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  defineComplianceRule: (data: { productId: string; requirement: string; docType: string; category: string; destination?: string }) =>
    apiCall('/admin/compliance/define-rule', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  uploadMasterSOP: (data: { productId: string; docType: string; fileName: string }) =>
    apiCall('/admin/documents/upload-master', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ===== VENDOR ENDPOINTS =====
  getMyProfile: () => apiCall('/vendor/profile'),
  
  acceptInvitation: () => apiCall('/vendor/accept-invitation', {
    method: 'POST',
  }),
  
  getMyOrders: () => apiCall('/vendor/orders'),

  acceptOrder: (orderId: string) =>
    apiCall(`/vendor/orders/${orderId}/accept`, {
      method: 'POST',
    }),

  uploadDocument: (data: { orderId: string; docType: string; fileName: string }) =>
    apiCall('/vendor/documents/upload', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createShipment: (data: { orderId: string; trackingNumber: string; courier: string }) =>
    apiCall('/vendor/shipments/create', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ===== QA ENDPOINTS =====
  getPendingDocuments: () => apiCall('/qa/documents/pending'),

  getMasterSOPs: () => apiCall('/qa/documents/master'),

  getDocumentDetails: (documentId: string) => apiCall(`/qa/documents/${documentId}`),

  reviewDocument: (documentId: string, action: 'APPROVE' | 'REJECT', comments?: string) =>
    apiCall(`/qa/documents/${documentId}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, comments }),
    }),

  // ===== SHARED DATA ENDPOINTS =====
  getDashboardStats: () => apiCall('/admin/dashboard-stats').catch(() => ({})),

  // ===== AUDITOR ENDPOINTS =====
  logAction: (data: { action: string; entityType: string; entityId?: string; details?: string; changes?: any }) =>
    apiCall('/auditor/logs/record', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAuditLogs: (filters?: { startDate?: string; endDate?: string; entityType?: string; action?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.entityType) params.append('entityType', filters.entityType);
    if (filters?.action) params.append('action', filters.action);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    return apiCall(`/auditor/logs?${params.toString()}`);
  },

  getOrderTrace: (orderId: string) => apiCall(`/auditor/orders/${orderId}/trace`),

  generateComplianceReport: (data: { startDate?: string; endDate?: string; reportType?: string }) =>
    apiCall('/auditor/reports/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};