import { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';

// --- CONFIGURATION ---
const GOOGLE_MAPS_API_KEY = "AIzaSyCo-qWtuSCF2MkDv7AhMGbFwPwauHhALRk"; 

// --- GOOGLE MAP TYPES ---
interface GoogleMapInstance {
  panTo: (latLng: { lat: number; lng: number }) => void;
}

interface GoogleMarkerInstance {
  setPosition: (latLng: { lat: number; lng: number }) => void;
}

declare global {
  interface Window {
    google?: {
      maps: {
        Map: new (element: HTMLElement, options: { center: { lat: number; lng: number }; zoom: number; styles?: object[] }) => GoogleMapInstance;
        Marker: new (options: { position: { lat: number; lng: number }; map: GoogleMapInstance; title: string }) => GoogleMarkerInstance;
      };
    };
  }
}

// --- GOOGLE MAP COMPONENT ---
const GoogleMapViewer = ({ lat, lng }: { lat?: number; lng?: number }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<GoogleMapInstance | null>(null);
  const markerRef = useRef<GoogleMarkerInstance | null>(null);
  const [mapError, setMapError] = useState(false);

  const [scriptLoaded, setScriptLoaded] = useState(() => {
    if (typeof window !== 'undefined' && window.google) return true;
    const scriptId = 'google-maps-script';
    if (typeof document !== 'undefined' && document.getElementById(scriptId)) return false;
    return false;
  });

  const safeLat = typeof lat === 'number' ? lat : 1.3521;
  const safeLng = typeof lng === 'number' ? lng : 103.8198;

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return;
    if (scriptLoaded) return;

    const scriptId = 'google-maps-script';
    const existingScript = document.getElementById(scriptId);

    if (existingScript) {
      if (!window.google) {
        existingScript.addEventListener('load', () => setScriptLoaded(true));
        existingScript.addEventListener('error', () => setMapError(true));
      } else {
        setTimeout(() => setScriptLoaded(true), 0);
      }
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setMapError(true);
    document.body.appendChild(script);
  }, [scriptLoaded]);

  useEffect(() => {
    if (!scriptLoaded || !mapRef.current || !window.google) return;

    const google = window.google;
    const center = { lat: safeLat, lng: safeLng };

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center,
        zoom: 12,
        styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }]
      });
      
      markerRef.current = new google.maps.Marker({
        position: center,
        map: mapInstanceRef.current,
        title: "Shipment Location"
      });
    } else {
      mapInstanceRef.current.panTo(center);
      markerRef.current?.setPosition(center);
    }
  }, [scriptLoaded, safeLat, safeLng]);

  if (!GOOGLE_MAPS_API_KEY || mapError) {
    return (
      <div className="ad-map-placeholder">
        <div className="ad-map-placeholder-content">
          <div className="ad-map-icon">📍</div>
          <h3>Map Unavailable</h3>
          <p>Check API Configuration</p>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className="ad-google-map" />;
};

// --- MAIN ADMIN DASHBOARD ---
const AdminDashboard = () => {
  // Navigation state
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Real data from backend
  const [vendors, setVendors] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteCompanyName, setInviteCompanyName] = useState('');
  const [inviteCapacity, setInviteCapacity] = useState(1000);

  const [ruleProductId, setRuleProductId] = useState('');
  const [ruleRequirement, setRuleRequirement] = useState('');
  const [ruleDocType, setRuleDocType] = useState('');
  const [ruleCategory, setRuleCategory] = useState<'MASTER' | 'TRANSACTIONAL'>('TRANSACTIONAL');

  const [masterDocFile, setMasterDocFile] = useState<File | null>(null);
  const [masterDocProductId, setMasterDocProductId] = useState('');
  const [masterDocType, setMasterDocType] = useState('');

  const [orderVendorId, setOrderVendorId] = useState('');
  const [orderProductId, setOrderProductId] = useState('');
  const [orderQuantity, setOrderQuantity] = useState(500);
  const [orderDestination, setOrderDestination] = useState('');

  const [selectedShipment, setSelectedShipment] = useState<string | null>(null);
  const [loadingTracking, setLoadingTracking] = useState(false);

  // Logout handler
  const handleLogout = () => {
    api.logout();
    window.location.reload(); // Reload to reset app state
  };

  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [productsData, vendorsData, ordersData] = await Promise.all([
        api.getProducts(),
        api.getVendors(),
        api.getOrders(),
      ]);
      
      setProducts(productsData.products || []);
      setVendors(vendorsData.vendors || []);
      setOrders(ordersData.orders || []);
      
      // Load shipments
      try {
        const shipmentsData = await api.getShipments();
        setShipments(shipmentsData.shipments || []);
      } catch (error) {
        console.error('Failed to load shipments:', error);
        setShipments([]);
      }
      
      setDocuments([]);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Computed stats
  const stats = {
    docsPending: documents.filter(d => d.status === 'PENDING_REVIEW').length,
    readyToShip: orders.filter(o => o.status === 'READY_TO_SHIP').length,
    inTransit: shipments.filter(s => s.status === 'IN_TRANSIT').length,
    totalOrders: orders.length,
    totalVendors: vendors.length,
    totalProducts: products.length,
  };

  // ===== HANDLERS =====
  
  const handleInviteVendor = async () => {
    if (!inviteEmail || !inviteCompanyName) {
      alert('Please fill in all fields');
      return;
    }
    
    try {
      await api.inviteVendor({
        email: inviteEmail,
        companyName: inviteCompanyName,
        capacity: inviteCapacity,
      });
      await api.logAction({
      action: 'VENDOR_INVITE_SENT',
      entityType: 'VENDOR',
      details: `Invited vendor ${inviteCompanyName} (${inviteEmail})`,
      changes: { companyName: inviteCompanyName, email: inviteEmail, capacity: inviteCapacity },
    }).catch(err => console.log('Audit log failed:', err));
      alert(`✅ Vendor invite sent to ${inviteCompanyName}!\nTemp password: vendor123`);
      setInviteEmail('');
      setInviteCompanyName('');
      setInviteCapacity(1000);
      
      await loadAllData();
    } catch (error) {
      console.error('Error inviting vendor:', error);
      alert('Failed to invite vendor');
    }
  };

  const handleDefineReqs = async () => {
    if (!ruleProductId || !ruleRequirement || !ruleDocType) {
      alert('Please fill in all fields');
      return;
    }
    
    try {
      await api.defineComplianceRule({
        productId: ruleProductId,
        requirement: ruleRequirement,
        docType: ruleDocType,
        category: ruleCategory,
      });
      
      await api.logAction({
      action: 'COMPLIANCE_RULE_CREATED',
      entityType: 'COMPLIANCE_RULE',
      details: `Created compliance rule for ${ruleDocType}`,
      changes: { docType: ruleDocType, requirement: ruleRequirement, category: ruleCategory },
    }).catch(err => console.log('Audit log failed:', err));

      const product = products.find(p => p.id === ruleProductId);
      alert(`✅ Compliance rule defined for ${product?.name}`);
      setRuleProductId('');
      setRuleRequirement('');
      setRuleDocType('');
      setRuleCategory('TRANSACTIONAL');
    } catch (error) {
      console.error('Error defining rule:', error);
      alert('Failed to define compliance rule');
    }
  };

  const handleMasterDocUpload = async () => {
    if (!masterDocFile || !masterDocProductId || !masterDocType) {
      alert('Please fill in all fields and select a file');
      return;
    }
    
    try {
      await api.uploadMasterSOP({
        productId: masterDocProductId,
        docType: masterDocType,
        fileName: masterDocFile.name,
      });
      
      await api.logAction({
      action: 'MASTER_SOP_UPLOADED',
      entityType: 'DOCUMENT',
      details: `Uploaded master SOP: ${masterDocFile.name} for ${masterDocType}`,
      changes: { fileName: masterDocFile.name, docType: masterDocType },
    }).catch(err => console.log('Audit log failed:', err));

      alert(`✅ Master SOP uploaded: ${masterDocFile.name}`);
      setMasterDocFile(null);
      setMasterDocProductId('');
      setMasterDocType('');
    } catch (error) {
      console.error('Error uploading master doc:', error);
      alert('Failed to upload master SOP');
    }
  };

  const handleCreateRequest = async () => {
    if (!orderVendorId || !orderProductId || !orderDestination) {
      alert('Please fill in all fields');
      return;
    }
    
    try {
      await api.createOrder({
        vendorId: orderVendorId,
        productId: orderProductId,
        quantity: orderQuantity,
        destination: orderDestination,
      });
      
      await api.logAction({
      action: 'ORDER_CREATED',
      entityType: 'ORDER',
      details: `Created order for ${orderQuantity} units to ${orderDestination}`,
      changes: { vendorId: orderVendorId, productId: orderProductId, quantity: orderQuantity, destination: orderDestination },
    }).catch(err => console.log('Audit log failed:', err));
    
      const vendor = vendors.find(v => v.id === orderVendorId);
      const product = products.find(p => p.id === orderProductId);
      alert(`✅ Order created for ${vendor?.companyName} - ${product?.name}`);
      
      setOrderVendorId('');
      setOrderProductId('');
      setOrderQuantity(500);
      setOrderDestination('');
      
      await loadAllData();
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Failed to create order');
    }
  };

  const handleSelectShipment = (shipmentId: string) => {
    setSelectedShipment(shipmentId);
    setLoadingTracking(true);
    setTimeout(() => setLoadingTracking(false), 300);
  };

  const selectedShipmentData = shipments.find(s => s.id === selectedShipment);

  // Show loading state
  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', background: 'white', minHeight: '100vh' }}>
        <h2>Loading dashboard...</h2>
      </div>
    );
  }

  // Render different pages
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <>
            {/* Stats Section */}
            <div className="ad-stats-section">
              <div className="ad-stat-card">
                <div className="ad-stat-icon-circle">
  <img src="total-orders.png" alt="icon" style={{width: '45px', height: '45px'}} />
              </div>
                <div className="ad-stat-label">Total Orders</div>
                <div className="ad-stat-value">{stats.totalOrders}</div>
              </div>
              <div className="ad-stat-card">
                <div className="ad-stat-icon-circle">
  <img src="docs-pending.png" alt="icon" style={{width: '45px', height: '45px'}} />
              </div>
                <div className="ad-stat-label">Docs Pending</div>
                <div className="ad-stat-value pending">{stats.docsPending}</div>
              </div>
              <div className="ad-stat-card">
                <div className="ad-stat-icon-circle">
  <img src="shipping.png" alt="icon" style={{width: '45px', height: '45px'}} />
              </div>
                <div className="ad-stat-label">Ready to Ship</div>
                <div className="ad-stat-value ready">{stats.readyToShip}</div>
              </div>
              <div className="ad-stat-card">
                <div className="ad-stat-icon-circle">
  <img src="transit.png" alt="icon" style={{width: '40px', height: '30px'}} />
              </div>
                <div className="ad-stat-label">In Transit</div>
                <div className="ad-stat-value transit">{stats.inTransit}</div>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="ad-content-grid">
              {/* INVITE VENDOR */}
              <div className="ad-card">
                <div className="ad-card-header">
                  <h3>Invite New Vendor</h3>
                </div>
                <div className="ad-card-body">
                  <div className="ad-form-group">
                    <label>Vendor Email</label>
                    <input 
                      type="email" 
                      placeholder="supply@global-logistics.com" 
                      value={inviteEmail} 
                      onChange={(e) => setInviteEmail(e.target.value)} 
                    />
                  </div>
                  <div className="ad-form-group">
                    <label>Company Name</label>
                    <input 
                      type="text" 
                      placeholder="Global Logistics Inc." 
                      value={inviteCompanyName} 
                      onChange={(e) => setInviteCompanyName(e.target.value)} 
                    />
                  </div>
                  <div className="ad-form-group">
                    <label>Capacity (Units)</label>
                    <input 
                      type="number" 
                      value={inviteCapacity} 
                      onChange={(e) => setInviteCapacity(Number(e.target.value))} 
                    />
                  </div>
                  <button onClick={handleInviteVendor} className="ad-btn primary">Send Invite</button>
                </div>
              </div>

              {/* DEFINE REQUIREMENTS */}
              <div className="ad-card tall">
                <div className="ad-card-header">
                  <h3>Define Compliance Rule</h3>
                </div>
                <div className="ad-card-body">
                  <div className="ad-form-group">
                    <label>Product</label>
                    <select value={ruleProductId} onChange={(e) => setRuleProductId(e.target.value)}>
                      <option value="">Select Product</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="ad-form-group">
                    <label>Requirement</label>
                    <input 
                      type="text" 
                      placeholder="e.g., Purity > 99%" 
                      value={ruleRequirement} 
                      onChange={(e) => setRuleRequirement(e.target.value)} 
                    />
                  </div>
                  <div className="ad-form-group">
                    <label>Document Type</label>
                    <input 
                      type="text" 
                      placeholder="Certificate of Analysis" 
                      value={ruleDocType} 
                      onChange={(e) => setRuleDocType(e.target.value)} 
                    />
                  </div>
                  <div className="ad-form-group">
                    <label>Category</label>
                    <select value={ruleCategory} onChange={(e) => setRuleCategory(e.target.value as 'MASTER' | 'TRANSACTIONAL')}>
                      <option value="MASTER">Master</option>
                      <option value="TRANSACTIONAL">Transactional</option>
                    </select>
                  </div>
                  <button onClick={handleDefineReqs} className="ad-btn primary">Save Rule</button>
                </div>
              </div>

              {/* UPLOAD MASTER SOP */}
              <div className="ad-card">
                <div className="ad-card-header">
                  <h3>Upload Master SOP</h3>
                </div>
                <div className="ad-card-body">
                  <div className="ad-form-group">
                    <label>Product</label>
                    <select value={masterDocProductId} onChange={(e) => setMasterDocProductId(e.target.value)}>
                      <option value="">Select Product</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="ad-form-group">
                    <label>Type</label>
                    <input 
                      type="text" 
                      placeholder="Standard Operating Procedure" 
                      value={masterDocType} 
                      onChange={(e) => setMasterDocType(e.target.value)} 
                    />
                  </div>
                  <div className="ad-form-group">
                    <label>File</label>
                    <input type="file" onChange={e => e.target.files && setMasterDocFile(e.target.files[0])} />
                  </div>
                  <button onClick={handleMasterDocUpload} disabled={!masterDocFile} className="ad-btn primary">Upload</button>
                </div>
              </div>
            </div>
          </>
        );

      case 'orders':
        return (
          <>
            <div className="ad-page-header">
              <h2>Orders</h2>
            </div>

            {/* Create Order Form */}
            <div className="ad-card" style={{marginBottom: '2rem'}}>
              <div className="ad-card-header">
                <h3>Create New Order</h3>
              </div>
              <div className="ad-card-body">
                <div className="ad-form-row">
                  <div className="ad-form-group">
                    <label>Vendor</label>
                    <select value={orderVendorId} onChange={(e) => setOrderVendorId(e.target.value)}>
                      <option value="">Select Vendor</option>
                      {vendors.filter(v => v.status === 'ACCEPTED').map(v => <option key={v.id} value={v.id}>{v.companyName}</option>)}
                    </select>
                  </div>
                  <div className="ad-form-group">
                    <label>Product</label>
                    <select value={orderProductId} onChange={(e) => setOrderProductId(e.target.value)}>
                      <option value="">Select Product</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="ad-form-group">
                    <label>Quantity</label>
                    <input type="number" value={orderQuantity} onChange={(e) => setOrderQuantity(Number(e.target.value))} />
                  </div>
                  <div className="ad-form-group">
                    <label>Destination</label>
                    <input 
                      type="text" 
                      placeholder="USA" 
                      value={orderDestination} 
                      onChange={(e) => setOrderDestination(e.target.value)} 
                    />
                  </div>
                </div>
                <button onClick={handleCreateRequest} className="ad-btn primary" style={{marginTop: '1rem'}}>Create Order</button>
              </div>
            </div>

            {/* Orders Table */}
            <div className="ad-card">
              <div className="ad-card-header">
                <h3>All Orders</h3>
              </div>
              <div className="ad-table-wrapper">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Vendor</th>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Status</th>
                      <th>Destination</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 && (
                      <tr><td colSpan={6} style={{textAlign: 'center', padding: '2rem', color: '#9ca3af'}}>No orders yet</td></tr>
                    )}
                    {orders.map(order => (
                      <tr key={order.id}>
                        <td>#{order.id.slice(0, 8)}</td>
                        <td>{vendors.find(v => v.id === order.vendorId)?.companyName || '-'}</td>
                        <td>{products.find(p => p.id === order.productId)?.name || '-'}</td>
                        <td>{order.quantity}</td>
                        <td><span className={`ad-badge ${order.status.toLowerCase()}`}>{order.status}</span></td>
                        <td>{order.destination}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Active Shipments */}
            <div className="ad-card" style={{marginTop: '2rem'}}>
              <div className="ad-card-header">
                <h3>Active Shipments</h3>
              </div>
              <div className="ad-table-wrapper">
                <table className="ad-table">
                  <thead><tr><th>Order #</th><th>Tracking #</th><th>Status</th><th>Location</th></tr></thead>
                  <tbody>
                    {shipments.length === 0 && <tr><td colSpan={4} style={{textAlign: 'center', padding: '2rem', color: '#9ca3af'}}>No active shipments</td></tr>}
                    {shipments.map(s => (
                      <tr key={s.id} onClick={() => handleSelectShipment(s.id)} className={selectedShipment === s.id ? 'selected' : ''}>
                        <td>{s.orderNumber}</td>
                        <td>{s.trackingNumber}</td>
                        <td><span className={`ad-badge ${s.status.toLowerCase()}`}>{s.status}</span></td>
                        <td>{s.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {selectedShipmentData && (
                <div className="ad-tracking-panel">
                  <div className="ad-tracking-header">
                    <h4>Tracking: {selectedShipmentData.orderNumber}</h4>
                    <button onClick={() => setSelectedShipment(null)} className="ad-close-btn">✕</button>
                  </div>
                  <div className="ad-tracking-content">
                    <div className="ad-tracking-map">
                      {loadingTracking ? <div className="ad-map-loading">Loading...</div> : 
                        <GoogleMapViewer lat={selectedShipmentData.lat} lng={selectedShipmentData.lng} />
                      }
                    </div>
                    <div className="ad-tracking-info">
                      {loadingTracking ? <p>Fetching details...</p> : (
                        <>
                          <div className="ad-info-item"><label>Carrier</label><span>{selectedShipmentData.courier}</span></div>
                          <div className="ad-info-item"><label>ETA</label><span>{selectedShipmentData.estimatedArrival || 'TBD'}</span></div>
                          <div className="ad-info-item"><label>Status</label><span>{selectedShipmentData.status}</span></div>
                          <div className="ad-info-item"><label>Location</label><span>{selectedShipmentData.location}</span></div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        );

      case 'inventory':
        return (
          <>
            <div className="ad-page-header">
              <h2>Inventory of Medicines</h2>
            </div>
            <div className="ad-card">
              <div className="ad-card-header">
                <h3>All Products</h3>
              </div>
              <div className="ad-table-wrapper">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Product ID</th>
                      <th>Name</th>
                      <th>Description</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length === 0 && (
                      <tr><td colSpan={4} style={{textAlign: 'center', padding: '2rem', color: '#9ca3af'}}>No products in inventory</td></tr>
                    )}
                    {products.map(product => (
                      <tr key={product.id}>
                        <td>#{product.id.slice(0, 8)}</td>
                        <td>{product.name}</td>
                        <td>{product.description || '-'}</td>
                        <td><span className="ad-badge active">Active</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        );

      case 'vendors':
        return (
          <>
            <div className="ad-page-header">
              <h2>Vendors & Customers</h2>
            </div>
            <div className="ad-card">
              <div className="ad-card-header">
                <h3>All Vendors</h3>
              </div>
              <div className="ad-table-wrapper">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Vendor ID</th>
                      <th>Company Name</th>
                      <th>Email</th>
                      <th>Capacity</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.length === 0 && (
                      <tr><td colSpan={5} style={{textAlign: 'center', padding: '2rem', color: '#9ca3af'}}>No vendors registered</td></tr>
                    )}
                    {vendors.map(vendor => (
                      <tr key={vendor.id}>
                        <td>#{vendor.id.slice(0, 8)}</td>
                        <td>{vendor.companyName}</td>
                        <td>{vendor.email}</td>
                        <td>{vendor.capacity || '-'}</td>
                        <td><span className={`ad-badge ${vendor.status.toLowerCase()}`}>{vendor.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        );

      case 'notifications':
        return (
          <>
            <div className="ad-page-header">
              <h2>Notifications</h2>
            </div>
            <div className="ad-card">
              <div className="ad-card-body" style={{padding: '3rem', textAlign: 'center', color: '#9ca3af'}}>
                <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🔔</div>
                <p>No new notifications</p>
              </div>
            </div>
          </>
        );

      case 'settings':
        return (
          <>
            <div className="ad-page-header">
              <h2>Settings</h2>
            </div>
            <div className="ad-card">
              <div className="ad-card-header">
                <h3>System Settings</h3>
              </div>
              <div className="ad-card-body">
                <div className="ad-form-group">
                  <label>Company Name</label>
                  <input type="text" placeholder="Your Company Name" />
                </div>
                <div className="ad-form-group">
                  <label>Email Notifications</label>
                  <select>
                    <option>Enabled</option>
                    <option>Disabled</option>
                  </select>
                </div>
                <button className="ad-btn primary">Save Settings</button>
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          margin: 0 !important;
          padding: 0 !important;
          font-family: 'Poppins', sans-serif;
          overflow-x: hidden;
        }

        .ad-container {
          display: flex;
          min-height: 100vh;
          width: 100vw;
          background: linear-gradient(180deg, #001335 0%, #ffffff 40%);
        }

        /* SIDEBAR */
        .ad-sidebar {
          width: 260px;
  background: linear-gradient(180deg, #d8dcfc 0%, #f5f7fa 35%);
          color: white;
          display: flex;
          flex-direction: column;
          position: fixed;
          height: 100vh;
          left: 0;
          top: 0;
          z-index: 100;
          transition: transform 0.3s ease;
        }

        .ad-sidebar.closed {
          transform: translateX(-260px);
        }

      .ad-menu-toggle {
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 101;
  background: #1a2332;
  border: none;
  color: white;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

        .ad-menu-toggle:hover {
          background: #2a3442;
          transform: scale(1.05);
        }

        .ad-menu-toggle.sidebar-open {
          left: 275px;
        }

        .ad-sidebar-header {
          padding: 1.5rem 1.25rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .ad-logo {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
        }

        .ad-nav {
          flex: 1;
          padding: 1rem 0;
          overflow-y: auto;
        }

        .ad-nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1.25rem;
          color: rgba(8, 0, 45, 0.7);
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.9rem;
          border-left: 3px solid transparent;
        }

        .ad-nav-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #713ed0;
        }

        .ad-nav-item.active {
          background: rgba(59, 130, 246, 0.1);
          color: #00142d;
          border-left-color: #001230;
        }

        .ad-nav-icon {
          font-size: 1.1rem;
          width: 20px;
          text-align: center;
        }

        .ad-sidebar-footer {
          padding: 1.25rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .ad-profile {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 6px;
          transition: background 0.2s;
        }

        .ad-profile:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .ad-profile-avatar {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #1f2937, #1f2937);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .ad-profile-info {
          flex: 1;
        }

        .ad-profile-name {
          font-size: 0.9rem;
          font-weight: 500;
          color: #1f2937;
        }

        .ad-profile-role {
          font-size: 0.75rem;
          color: #1f2937;
        }

        /* MAIN CONTENT */
        .ad-main {
  flex: 1;
  margin-left: 260px;
  padding: 5rem 2rem 2rem 2rem;
  transition: all 0.3s ease;
  overflow-x: hidden;
  min-height: 100vh;
  box-sizing: border-box;
  background: linear-gradient(180deg, #acccf4 0%, #f5f7fa 35%);
}

        .ad-main.sidebar-closed {
          margin-left: 0;
        }

        .ad-page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .ad-page-header h2 {
          font-size: 1.75rem;
          font-weight: 600;
          color: #1f2937;
        }

        /* STATS SECTION */
        .ad-stats-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .ad-stat-card {
          padding: 1.75rem;
          border-radius: 20px;
          border: none;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .ad-stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
        }
      
        .ad-stat-card:nth-child(1) {
          background: linear-gradient(180deg, #e7f9d6 0%, #f3f6f0 100%);
        }

        .ad-stat-card:nth-child(2) {
          background: linear-gradient(180deg, #c9eaf7 0%, #e5f6fe 100%);
        }

        .ad-stat-card:nth-child(3) {
          background: linear-gradient(180deg, #daddf7 0%, #f3f4fd 100%);
        }

        .ad-stat-card:nth-child(4) {
          background: linear-gradient(180deg, #f5d5e1 0%, #f3eef0 100%);
        }
      

        .ad-stat-icon-circle {
          position: absolute;
          top: 1.25rem;
          right: 1.25rem;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }

        .ad-stat-label {
          font-size: 0.75rem;
          color: #4a5568;
          font-weight: 600;
          margin-bottom: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .ad-stat-value {
          font-size: 2.5rem;
          font-weight: 700;
          color: #1a202c;
          line-height: 1;
          margin-bottom: 0.5rem;
        }

        .ad-stat-value.pending {
          color: #1a202c;
        }

        .ad-stat-value.ready {
          color: #1a202c;
        }

        .ad-stat-value.transit {
          color: #1a202c;
        }

        /* CONTENT GRID */
        .ad-content-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.25rem;
        }

        .ad-card {
          background: white;
          border-radius: 16px;
          border: none;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
          transition: all 0.3s ease;
        }

        .ad-card:hover {
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
        }

        .ad-card.tall {
          grid-row: span 2;
        }

        .ad-card-header {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #f3f4f6;
          background: #fafbfc;
        }

        .ad-card-header h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
        }

        .ad-card-body {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .ad-form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .ad-form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .ad-form-group label {
          font-size: 0.85rem;
          font-weight: 500;
          color: #374151;
        }

        .ad-form-group input,
.ad-form-group select {
  padding: 0.75rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-size: 0.9rem;
  transition: all 0.2s;
  background: white;
  color: #001932;
}

        .ad-form-group input:focus,
.ad-form-group select:focus {
  outline: none;
  border-color: #667eea;
  background: white;
  color: #001932;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

        .ad-btn {
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          border: none;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.3s ease;
        }

        .ad-btn.primary {
          background: linear-gradient(135deg, #000d45 0%, #000d45 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .ad-btn.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .ad-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* TABLE */
        .ad-table-wrapper {
          overflow-x: auto;
        }

        .ad-table {
          width: 100%;
          border-collapse: collapse;
        }

        .ad-table th {
          background: #f9fafb;
          padding: 0.75rem 1rem;
          text-align: left;
          font-size: 0.8rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #e5e7eb;
        }

        .ad-table td {
          padding: 1rem;
          border-bottom: 1px solid #f3f4f6;
          font-size: 0.9rem;
          color: #1f2937;
        }

        .ad-table tr {
          cursor: pointer;
          transition: background 0.2s;
        }

        .ad-table tbody tr:hover {
          background: #f9fafb;
        }

        .ad-table tr.selected {
          background: #eff6ff;
        }

        .ad-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .ad-badge.pending,
        .ad-badge.pending_review {
          background: #fef3c7;
          color: #92400e;
        }

        .ad-badge.ready_to_ship,
        .ad-badge.active,
        .ad-badge.accepted {
          background: #d1fae5;
          color: #065f46;
        }

        .ad-badge.in_transit {
          background: #dbeafe;
          color: #1e40af;
        }

        .ad-badge.delivered {
          background: #e0e7ff;
          color: #3730a3;
        }

        /* TRACKING PANEL */
        .ad-tracking-panel {
          border-top: 1px solid #e5e7eb;
          animation: slideDown 0.3s ease;
        }

        .ad-tracking-header {
          padding: 1rem 1.5rem;
          background: #f9fafb;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #e5e7eb;
        }

        .ad-tracking-header h4 {
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
        }

        .ad-close-btn {
          background: none;
          border: none;
          font-size: 1.25rem;
          color: #6b7280;
          cursor: pointer;
          padding: 0.25rem;
        }

        .ad-close-btn:hover {
          color: #1f2937;
        }

        .ad-tracking-content {
          display: grid;
          grid-template-columns: 2fr 1fr;
          min-height: 300px;
        }

        .ad-tracking-map {
          background: #f3f4f6;
        }

        .ad-google-map {
          width: 100%;
          height: 100%;
          min-height: 300px;
        }

        .ad-map-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #6b7280;
        }

        .ad-map-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          background: #f9fafb;
        }

        .ad-map-placeholder-content {
          text-align: center;
          padding: 2rem;
        }

        .ad-map-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .ad-tracking-info {
          padding: 1.5rem;
          background: white;
          border-left: 1px solid #e5e7eb;
        }

        .ad-info-item {
          margin-bottom: 1.25rem;
        }

        .ad-info-item label {
          display: block;
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 600;
          text-transform: uppercase;
          margin-bottom: 0.25rem;
          letter-spacing: 0.5px;
        }

        .ad-info-item span {
          font-size: 0.95rem;
          color: #1f2937;
          font-weight: 500;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 1200px) {
          .ad-content-grid {
            grid-template-columns: 1fr;
          }
          .ad-card.tall {
            grid-row: span 1;
          }
        }

        @media (max-width: 768px) {
          .ad-sidebar {
            transform: translateX(-260px);
          }
          .ad-sidebar.closed {
            transform: translateX(-260px);
          }
          .ad-main {
            margin-left: 0;
            padding: 1rem;
          }
          .ad-main.sidebar-closed {
            margin-left: 0;
          }
          .ad-menu-toggle.sidebar-open {
            left: 1.25rem;
          }
          .ad-tracking-content {
            grid-template-columns: 1fr;
          }
          .ad-tracking-info {
            border-left: none;
            border-top: 1px solid #e5e7eb;
          }
          .ad-stats-section {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="ad-container">
        {/* HAMBURGER MENU */}
        <button 
          className={`ad-menu-toggle ${sidebarOpen ? 'sidebar-open' : ''}`}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle Menu"
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>

        {/* SIDEBAR */}
        <div className={`ad-sidebar ${!sidebarOpen ? 'closed' : ''}`}>
          <div className="ad-sidebar-header">
            <div className="ad-logo">MedSupply</div>
          </div>

          <nav className="ad-nav">
            <div 
              className={`ad-nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentPage('dashboard')}
            >
              <span className="ad-nav-icon"></span>
              <span>Dashboard</span>
            </div>
            <div 
              className={`ad-nav-item ${currentPage === 'orders' ? 'active' : ''}`}
              onClick={() => setCurrentPage('orders')}
            >
              <span className="ad-nav-icon"></span>
              <span>Orders</span>
            </div>
            <div 
              className={`ad-nav-item ${currentPage === 'inventory' ? 'active' : ''}`}
              onClick={() => setCurrentPage('inventory')}
            >
              <span className="ad-nav-icon"></span>
              <span>Inventory</span>
            </div>
            <div 
              className={`ad-nav-item ${currentPage === 'vendors' ? 'active' : ''}`}
              onClick={() => setCurrentPage('vendors')}
            >
              <span className="ad-nav-icon"></span>
              <span>Vendors</span>
            </div>
            <div 
              className={`ad-nav-item ${currentPage === 'notifications' ? 'active' : ''}`}
              onClick={() => setCurrentPage('notifications')}
            >
              <span className="ad-nav-icon"></span>
              <span>Notifications</span>
            </div>
            <div 
              className={`ad-nav-item ${currentPage === 'settings' ? 'active' : ''}`}
              onClick={() => setCurrentPage('settings')}
            >
              <span className="ad-nav-icon"></span>
              <span>Settings</span>
            </div>
          </nav>

          <div className="ad-sidebar-footer">
            <div className="ad-profile">
              <div className="ad-profile-avatar">A</div>
              <div className="ad-profile-info">
                <div className="ad-profile-name">Administrator</div>
                <div className="ad-profile-role">Admin</div>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <main className={`ad-main ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
          {renderPage()}
        </main>
      </div>
    </>
  );
};

export default AdminDashboard;