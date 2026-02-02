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
      
      // TODO: Add these endpoints later
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
      
      // Log action
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
      
      // Reload vendors
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
      
      // Log action
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
      
      // Log action
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
      
      // Log action
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

  return (
    <>
      <style>{`
        /* FORCE FULL WIDTH */
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0 !important;
          padding: 0 !important;
          overflow-x: hidden !important;
        }

        /* Reset & Base */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        .ad-container {
          font-family: 'Inter', sans-serif;
          background-color: #f3f4f6;
          min-height: 100vh;
          color: #1f2937;
          width: 100vw !important;
          max-width: 100vw !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow-x: hidden;
        }

        .ad-container * { box-sizing: border-box; }

        /* Header */
        .ad-header {
          background-color: white;
          border-bottom: 1px solid #e5e7eb;
          padding: 0 2rem;
          height: 70px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 50;
          width: 100% !important;
        }

        .ad-brand h1 { font-size: 1.5rem; margin: 0; color: #111827; }
        .ad-brand span { color: #4f46e5; }
        .ad-user-profile { display: flex; gap: 10px; align-items: center; font-weight: 500; }
        .ad-avatar { width: 32px; height: 32px; background: #e0e7ff; color: #4338ca; border-radius: 50%; display: flex; justify-content: center; align-items: center; }

        /* Layout - FULL WIDTH */
        .ad-main { 
          max-width: none !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 2rem !important;
        }

        /* Stats */
        .ad-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
        .ad-stat-card { background: white; padding: 1.5rem; border-radius: 8px; border-left: 4px solid transparent; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .ad-stat-card.blue { border-left-color: #3b82f6; }
        .ad-stat-card.green { border-left-color: #10b981; }
        .ad-stat-card.orange { border-left-color: #f59e0b; }
        .ad-stat-title { display: block; font-size: 0.875rem; color: #6b7280; text-transform: uppercase; font-weight: 600; }
        .ad-stat-value { display: block; font-size: 2.25rem; font-weight: 700; color: #111827; margin-top: 0.5rem; }

        /* Forms Grid */
        .ad-operations-grid { 
          display: grid; 
          grid-template-columns: 1fr; 
          gap: 1.5rem; 
          margin-bottom: 2rem; 
        }
        
        @media (min-width: 1024px) {
          .ad-operations-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .ad-card { background: white; border-radius: 10px; border: 1px solid #e5e7eb; display: flex; flex-direction: column; overflow: hidden; }
        .ad-card-header { padding: 1rem 1.5rem; border-bottom: 1px solid #f3f4f6; background: white; }
        .ad-card-header h3 { margin: 0; font-size: 1.1rem; }
        .ad-card-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; flex: 1; }

        .ad-form-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .ad-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .ad-form-group label { font-size: 0.875rem; font-weight: 500; color: #374151; }
        .ad-form-group input, .ad-form-group select { padding: 0.6rem; border: 1px solid #d1d5db; border-radius: 6px; width: 100%; }
        .ad-form-group input:focus, .ad-form-group select:focus { outline: none; border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }

        .ad-btn { padding: 0.6rem 1.2rem; border-radius: 6px; border: none; font-weight: 500; cursor: pointer; margin-top: auto; }
        .ad-btn.primary { background: #4f46e5; color: white; }
        .ad-btn.primary:hover { background: #4338ca; }
        .ad-btn.success { background: #059669; color: white; }
        .ad-btn.success:hover { background: #047857; }
        .ad-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Table */
        .ad-table-wrapper { overflow-x: auto; }
        .ad-table { width: 100%; border-collapse: collapse; text-align: left; }
        .ad-table th { background: #f9fafb; padding: 0.75rem 1.5rem; font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; }
        .ad-table td { padding: 1rem 1.5rem; border-bottom: 1px solid #e5e7eb; font-size: 0.9rem; }
        .ad-table tr { cursor: pointer; transition: background 0.2s; }
        .ad-table tr:hover { background: #f9fafb; }
        .ad-table tr.selected { background: #eff6ff; }
        .ad-status-pill { padding: 0.2rem 0.6rem; border-radius: 99px; font-size: 0.75rem; font-weight: 600; }
        .ad-status-pill.delivered { background: #d1fae5; color: #065f46; }
        .ad-status-pill.in_transit { background: #dbeafe; color: #1e40af; }

        /* Tracking Panel */
        .ad-tracking-panel { border-top: 1px solid #e5e7eb; background: #f8fafc; animation: slideDown 0.3s ease-out; }
        .ad-tracking-header { padding: 1rem 1.5rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
        .ad-tracking-header h4 { margin: 0; color: #4b5563; }
        .ad-close-btn { background: none; border: none; font-size: 1.2rem; color: #9ca3af; cursor: pointer; }

        .ad-tracking-content { display: grid; grid-template-columns: 2fr 1fr; gap: 0; min-height: 300px; }
        .ad-tracking-map-container { background: #e2e8f0; position: relative; min-height: 300px; }
        .ad-tracking-info { padding: 1.5rem; background: white; border-left: 1px solid #e5e7eb; }
        .ad-info-item { margin-bottom: 1.2rem; }
        .ad-info-item label { display: block; font-size: 0.75rem; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-bottom: 4px; }
        .ad-info-item span { font-size: 1rem; color: #111827; font-weight: 500; }

        /* Map Placeholders */
        .ad-google-map { width: 100%; height: 100%; min-height: 300px; }
        .ad-map-loading { display: flex; justify-content: center; align-items: center; height: 100%; color: #64748b; }
        .ad-map-placeholder { display: flex; justify-content: center; align-items: center; height: 100%; background: linear-gradient(45deg, #f1f5f9 25%, #e2e8f0 25%, #e2e8f0 50%, #f1f5f9 50%, #f1f5f9 75%, #e2e8f0 75%, #e2e8f0 100%); background-size: 20px 20px; padding: 2rem; text-align: center; }
        .ad-map-placeholder-content { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); max-width: 400px; }
        .ad-map-icon { font-size: 3rem; margin-bottom: 1rem; }

        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 800px) {
          .ad-tracking-content { grid-template-columns: 1fr; }
          .ad-tracking-info { border-left: none; border-top: 1px solid #e5e7eb; }
        }
      `}</style>

      <div className="ad-container">
        <div className="ad-header">
          <div className="ad-brand"><h1>Admin<span>Portal</span></h1></div>
          <div className="ad-user-profile"><div className="ad-avatar">A</div><span>Administrator</span></div>
        </div>

        <main className="ad-main">
          <section className="ad-section-stats">
            <div className="ad-stats-grid">
              <div className="ad-stat-card blue"><span className="ad-stat-title">Docs Pending</span><span className="ad-stat-value">{stats.docsPending}</span></div>
              <div className="ad-stat-card green"><span className="ad-stat-title">Ready to Ship</span><span className="ad-stat-value">{stats.readyToShip}</span></div>
              <div className="ad-stat-card orange"><span className="ad-stat-title">In Transit</span><span className="ad-stat-value">{stats.inTransit}</span></div>
            </div>
          </section>

          <div className="ad-operations-grid">
            {/* INVITE VENDOR */}
            <div className="ad-card">
              <div className="ad-card-header"><h3>Invite New Vendor</h3></div>
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
            <div className="ad-card">
              <div className="ad-card-header"><h3>Define Compliance Rule</h3></div>
              <div className="ad-card-body">
                <div className="ad-form-group">
                  <label>Product</label>
                  <select value={ruleProductId} onChange={(e) => setRuleProductId(e.target.value)}>
                    <option value="">Select</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="ad-form-group">
                  <label>Requirement (e.g., Purity &gt; 99%)</label>
                  <input 
                    type="text" 
                    placeholder="Purity > 99%" 
                    value={ruleRequirement} 
                    onChange={(e) => setRuleRequirement(e.target.value)} 
                  />
                </div>
                <div className="ad-form-group">
                  <label>Doc Type</label>
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
                    <option value="MASTER">MASTER</option>
                    <option value="TRANSACTIONAL">TRANSACTIONAL</option>
                  </select>
                </div>
                <button onClick={handleDefineReqs} className="ad-btn primary">Save Rule</button>
              </div>
            </div>

            {/* UPLOAD MASTER SOP */}
            <div className="ad-card">
              <div className="ad-card-header"><h3>Upload Master SOP</h3></div>
              <div className="ad-card-body">
                <div className="ad-form-group">
                  <label>Product</label>
                  <select value={masterDocProductId} onChange={(e) => setMasterDocProductId(e.target.value)}>
                    <option value="">Select</option>
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

            {/* CREATE ORDER */}
            <div className="ad-card">
              <div className="ad-card-header"><h3>Create Order</h3></div>
              <div className="ad-card-body">
                <div className="ad-form-group">
                  <label>Vendor</label>
                  <select value={orderVendorId} onChange={(e) => setOrderVendorId(e.target.value)}>
                    <option value="">Select</option>
                    {vendors.filter(v => v.status === 'ACCEPTED').map(v => <option key={v.id} value={v.id}>{v.companyName}</option>)}
                  </select>
                </div>
                <div className="ad-form-group">
                  <label>Product</label>
                  <select value={orderProductId} onChange={(e) => setOrderProductId(e.target.value)}>
                    <option value="">Select</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="ad-form-row">
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
                <button onClick={handleCreateRequest} className="ad-btn success">Create Order</button>
              </div>
            </div>
          </div>

          {/* ACTIVE SHIPMENTS TABLE */}
          <section className="ad-section-table">
            <div className="ad-card">
              <div className="ad-card-header"><h3>Active Shipments</h3></div>
              <div className="ad-table-wrapper">
                <table className="ad-table">
                  <thead><tr><th>Order #</th><th>Tracking #</th><th>Status</th><th>Location</th></tr></thead>
                  <tbody>
                    {shipments.length === 0 && <tr><td colSpan={4} style={{textAlign: 'center', padding: '2rem', color: '#9ca3af'}}>No active shipments</td></tr>}
                    {shipments.map(s => (
                      <tr key={s.id} onClick={() => handleSelectShipment(s.id)} className={selectedShipment === s.id ? 'selected' : ''}>
                        <td>{s.orderNumber}</td>
                        <td>{s.trackingNumber}</td>
                        <td><span className={`ad-status-pill ${s.status.toLowerCase()}`}>{s.status}</span></td>
                        <td>{s.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {selectedShipmentData && (
                <div className="ad-tracking-panel">
                  <div className="ad-tracking-header">
                    <h4>Tracking Details: {selectedShipmentData.orderNumber}</h4>
                    <button onClick={() => setSelectedShipment(null)} className="ad-close-btn">✕</button>
                  </div>
                  <div className="ad-tracking-content">
                    <div className="ad-tracking-map-container">
                      {loadingTracking ? <div className="ad-map-loading">Loading Map Data...</div> : 
                        <GoogleMapViewer lat={selectedShipmentData.lat} lng={selectedShipmentData.lng} />
                      }
                    </div>
                    <div className="ad-tracking-info">
                      {loadingTracking ? <p>Fetching details...</p> : (
                        <>
                          <div className="ad-info-item"><label>Carrier</label><span>{selectedShipmentData.courier}</span></div>
                          <div className="ad-info-item"><label>ETA</label><span>{selectedShipmentData.estimatedArrival || 'TBD'}</span></div>
                          <div className="ad-info-item"><label>Current Status</label><span>{selectedShipmentData.status}</span></div>
                          <div className="ad-info-item"><label>Last Location</label><span>{selectedShipmentData.location}</span></div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </>
  );
};

export default AdminDashboard;