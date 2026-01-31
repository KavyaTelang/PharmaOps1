import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';

const VendorDashboard = () => {
  // ===== USE CONTEXT =====
  const { user } = useAppContext();
  
  // ===== REAL DATA FROM BACKEND =====
  const [vendors, setVendors] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Load vendor's profile and orders
      const [profileData, ordersData] = await Promise.all([
        api.getMyProfile().catch(() => ({ vendor: null })),
        api.getMyOrders().catch(() => ({ orders: [] })),
      ]);
      
      // Set vendor profile as the only vendor
      if (profileData.vendor) {
        setVendors([profileData.vendor]);
        setSelectedVendorId(profileData.vendor.id);
      } else {
        setVendors([]);
      }
      
      setOrders(ordersData.orders || []);
      setProducts([]);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ===== LOCAL STATE =====
  const [shipmentModalOpen, setShipmentModalOpen] = useState<string | null>(null);
  const [trackingInput, setTrackingInput] = useState('');
  const [courierInput, setCourierInput] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

  // ===== AUTO-SELECT FIRST VENDOR =====
  useEffect(() => {
    if (vendors.length > 0 && !selectedVendorId) {
      setSelectedVendorId(vendors[0].id);
    }
  }, [vendors, selectedVendorId]);

  // Get current vendor
  const currentVendor = vendors.find(v => v.id === selectedVendorId);
  
  // Filter orders for this vendor
  const vendorOrders = orders.filter(o => o.vendorId === selectedVendorId);

  // ===== HELPER: Get Product by ID =====
  const getProductById = (order: any) => {
    // First check if product name is in the order itself
    if (order.productName) return order.productName;
    // Fallback to looking in products array
    const product = products.find(p => p.id === order.productId);
    return product?.name || 'Unknown Product';
  };

  // ===== COMPUTED STATS =====
  const stats = {
    newRequests: vendorOrders.filter(o => o.status === 'REQUESTED').length,
    actionRequired: vendorOrders.flatMap(o => o.requirements || []).filter(r => r.status === 'MISSING').length,
    readyToShip: vendorOrders.filter(o => o.status === 'READY_TO_SHIP').length,
  };

  // ===== HANDLERS (updated to use real API) =====
  const handleAcceptInvitation = async () => {
    if (!selectedVendorId) return;
    
    try {
      await api.acceptInvitation();
      alert(`✅ Partnership accepted! You can now receive orders.`);
      await loadAllData();
    } catch (error) {
      console.error('Error accepting invitation:', error);
      alert('Failed to accept invitation');
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    try {
      await api.acceptOrder(orderId);
      
      const order = orders.find(o => o.id === orderId);
      alert(`✅ Order ${order?.orderNumber} accepted! Compliance checklist generated.`);
      await loadAllData();
    } catch (error) {
      console.error('Error accepting order:', error);
      alert('Failed to accept order');
    }
  };

  const handleUpload = (orderId: string, docType: string) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/pdf';
    fileInput.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        try {
          await api.uploadDocument({
            orderId,
            docType,
            fileName: file.name,
          });
          
          alert(`✅ Document uploaded: ${file.name}\nSent to QA for review.`);
          await loadAllData();
        } catch (error) {
          console.error('Error uploading document:', error);
          alert('Failed to upload document');
        }
      }
    };
    fileInput.click();
  };

  const handleShipOrder = async () => {
    if (!shipmentModalOpen) return;
    if (!trackingInput || !courierInput) {
      alert("Please enter tracking details.");
      return;
    }

    try {
      await api.createShipment({
        orderId: shipmentModalOpen,
        trackingNumber: trackingInput,
        courier: courierInput,
      });
      
      const order = orders.find(o => o.id === shipmentModalOpen);
      alert(`✅ Shipment created for Order ${order?.orderNumber}!\nTracking: ${trackingInput}`);
      
      setShipmentModalOpen(null);
      setTrackingInput('');
      setCourierInput('');
      
      await loadAllData();
    } catch (error) {
      console.error('Error creating shipment:', error);
      alert('Failed to create shipment');
    }
  };

  // ===== HELPERS =====
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return '#10b981'; 
      case 'PENDING_REVIEW': return '#f59e0b'; 
      case 'MISSING': return '#ef4444'; 
      default: return '#9ca3af';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return '✅';
      case 'PENDING_REVIEW': return '⏳';
      case 'MISSING': return '❌';
      default: return '•';
    }
  };

  // ===== SUB-COMPONENTS =====
  const renderInvitationNotice = () => {
    if (!currentVendor || currentVendor.status !== 'INVITED') return null;

    return (
      <div className="vd-card vd-animate-in" style={{background: '#fef3c7', borderLeft: '4px solid #f59e0b', marginBottom: '2rem'}}>
        <div style={{padding: '1.5rem'}}>
          <h3 style={{margin: '0 0 0.5rem 0', color: '#92400e'}}>🎉 Partnership Invitation</h3>
          <p style={{margin: '0 0 1rem 0', color: '#78350f'}}>
            You have been invited to join the PharmaOps platform. Accept to start receiving orders.
          </p>
          <button onClick={handleAcceptInvitation} className="vd-btn primary">
            Accept Partnership
          </button>
        </div>
      </div>
    );
  };

  const renderIncomingRequests = () => {
    const requested = vendorOrders.filter(o => o.status === 'REQUESTED');
    if (requested.length === 0) return <div className="vd-empty">No new requests.</div>;

    return (
      <div className="vd-card vd-animate-in">
        <table className="vd-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Destination</th>
              <th className="align-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {requested.map(order => {
              const productName = getProductById(order);
              return (
                <tr key={order.id} className="vd-table-row-hover">
                  <td className="font-medium">{order.orderNumber}</td>
                  <td>{productName}</td>
                  <td>{order.quantity.toLocaleString()}</td>
                  <td>{order.destination}</td>
                  <td className="align-right">
                    <button onClick={() => handleAcceptOrder(order.id)} className="vd-btn primary">
                      Accept Order
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderComplianceList = () => {
    const activeOrders = vendorOrders.filter(o => o.status === 'DOCS_PENDING' || o.status === 'READY_TO_SHIP');
    
    if (activeOrders.length === 0) return <div className="vd-empty">No active compliance tasks.</div>;

    return (
      <div className="vd-compliance-section">
        {activeOrders.map(order => {
          const productName = getProductById(order);
          const requirements = order.requirements || [];
          const totalReqs = requirements.length;
          const approvedReqs = requirements.filter(r => r.status === 'APPROVED').length;
          const progress = totalReqs > 0 ? Math.round((approvedReqs / totalReqs) * 100) : 0;
          const isReady = order.status === 'READY_TO_SHIP';

          return (
            <div key={order.id} className={`vd-card vd-todo-item vd-animate-in ${isReady ? 'ready-border' : ''}`}>
              <div className="vd-todo-header">
                <div>
                  <div className="vd-order-id">
                    {order.orderNumber} 
                    <span className="vd-badge-count">{productName}</span>
                  </div>
                  <div className="vd-order-meta">
                    <span className="meta-label">Dest:</span> {order.destination} &nbsp;|&nbsp; 
                    <span className="meta-label">Qty:</span> {order.quantity.toLocaleString()}
                  </div>
                  <div className="vd-progress-container">
                    <div className="vd-progress-bar">
                      <div className="vd-progress-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                    <span className="vd-progress-text">{progress}% Compliant</span>
                  </div>
                </div>
                <div className="action-container">
                  <button 
                    className={`vd-btn ${isReady ? 'primary' : 'disabled'}`}
                    disabled={!isReady}
                    onClick={() => isReady && setShipmentModalOpen(order.id)}
                  >
                    {isReady ? '🚚 Ship Order' : `Wait for QA (${approvedReqs}/${totalReqs})`}
                  </button>
                </div>
              </div>

              <div className="vd-req-list">
                {requirements.map(req => (
                  <div key={req.id} className="vd-req-row">
                    <div className="vd-req-info">
                      <span className="vd-req-status-icon" style={{ color: getStatusColor(req.status) }}>
                        {getStatusIcon(req.status)}
                      </span>
                      <div>
                        <div className="req-title-row">
                          <span className="vd-req-name">{req.docType}</span>
                          <span className={`vd-req-tag ${req.category === 'MASTER' ? 'master' : 'trans'}`}>
                            {req.category}
                          </span>
                        </div>
                        {req.expiryDate && (
                          <div className="vd-req-expiry">Valid until: {req.expiryDate}</div>
                        )}
                      </div>
                    </div>
                    <div className="vd-req-action">
                      {req.status === 'MISSING' && (
                        <button onClick={() => handleUpload(order.id, req.docType)} className="vd-btn upload small">
                          📎 Upload PDF
                        </button>
                      )}
                      {req.status === 'PENDING_REVIEW' && <span className="vd-status-pill pending">QA Reviewing</span>}
                      {req.status === 'APPROVED' && <span className="vd-status-pill approved">Verified ✓</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Show loading state
  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', background: 'white', minHeight: '100vh' }}>
        <h2>Loading vendor dashboard...</h2>
      </div>
    );
  }

  // If no vendor exists or not accepted, show limited view
  if (!currentVendor) {
    return (
      <div className="vd-container">
        <header className="vd-header">
          <div className="vd-brand">
            <h1>PharmaOps <span>Vendor</span></h1>
          </div>
        </header>
        <main className="vd-main">
          <div className="vd-empty" style={{marginTop: '3rem'}}>
            No vendor profile found. Admin needs to invite you first.
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <style>{`
        /* FORCE FULL WIDTH */
        * { box-sizing: border-box; }
        body { margin: 0 !important; padding: 0 !important; overflow-x: hidden !important; }

        /* Reset & Base */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        .vd-container {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #f8fafc;
          min-height: 100vh;
          color: #1e293b;
          width: 100vw !important;
          max-width: 100vw !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .vd-container * { box-sizing: border-box; }

        /* Header */
        .vd-header {
          background-color: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          padding: 0 2rem;
          height: 70px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 50;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          width: 100% !important;
        }

        .vd-brand h1 { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin: 0; letter-spacing: -0.025em; }
        .vd-brand span { color: #059669; }

        .vd-user-profile { display: flex; align-items: center; gap: 12px; font-size: 0.875rem; font-weight: 500; color: #64748b; }
        .vd-avatar { width: 36px; height: 36px; background-color: #ecfdf5; color: #059669; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1rem; border: 1px solid #d1fae5; }

        /* Main Layout - FULL WIDTH */
        .vd-main { 
          max-width: none !important; 
          width: 100% !important; 
          margin: 0 !important; 
          padding: 2.5rem 2rem !important; 
        }

        /* Stats Grid */
        .vd-stats-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); 
          gap: 1.5rem; 
          margin-bottom: 3rem; 
        }
        
        .vd-stat-card { 
          background: white;
          padding: 1.5rem; 
          border-radius: 16px; 
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); 
          border: 1px solid #e2e8f0; 
          transition: transform 0.2s, box-shadow 0.2s;
          display: flex; 
          flex-direction: column;
          color: #1e293b;
          position: relative;
          overflow: hidden;
        }
        .vd-stat-card:hover { transform: translateY(-4px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
        
        /* Left Border Indicators */
        .vd-stat-card.yellow { border-left: 5px solid #f59e0b; }
        .vd-stat-card.red { border-left: 5px solid #ef4444; }
        .vd-stat-card.green { border-left: 5px solid #10b981; }

        .vd-stat-title { 
          font-size: 0.75rem; 
          font-weight: 600; 
          color: #64748b; 
          text-transform: uppercase; 
          letter-spacing: 0.05em; 
          margin-bottom: 8px; 
        }
        
        .vd-stat-value { 
          font-size: 2.5rem; 
          font-weight: 800; 
          line-height: 1; 
        }

        /* Colored Values */
        .vd-stat-card.yellow .vd-stat-value { color: #d97706; }
        .vd-stat-card.red .vd-stat-value { color: #dc2626; }
        .vd-stat-card.green .vd-stat-value { color: #059669; }

        /* Section Headers */
        .vd-section-title { font-size: 1.125rem; font-weight: 700; color: #334155; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.75rem; }
        .vd-badge-count { background: #f1f5f9; color: #475569; font-size: 0.75rem; padding: 0.2rem 0.6rem; border-radius: 99px; border: 1px solid #e2e8f0; }

        /* Tables */
        .vd-card { background: white; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02); border: 1px solid #e2e8f0; overflow: hidden; margin-bottom: 2.5rem; }
        .vd-table { width: 100%; border-collapse: collapse; text-align: left; }
        .vd-table th { background-color: #f8fafc; padding: 1rem 1.5rem; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; letter-spacing: 0.05em; }
        .vd-table td { padding: 1.25rem 1.5rem; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 0.9rem; vertical-align: middle; }
        .vd-table tr:last-child td { border-bottom: none; }
        .vd-table-row-hover:hover { background-color: #f8fafc; }
        
        /* Alignment Classes */
        .align-right { text-align: right !important; }
        .font-medium { font-weight: 500; color: #0f172a; }

        /* Compliance Item */
        .vd-todo-item { padding: 1.5rem; border-bottom: 1px solid #e2e8f0; }
        .vd-todo-item.ready-border { border-left: 4px solid #10b981; } 
        
        .vd-todo-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem; }
        .vd-order-id { font-weight: 700; font-size: 1.125rem; color: #0f172a; margin-bottom: 4px; }
        .vd-order-meta { font-size: 0.875rem; color: #64748b; }
        .meta-label { font-weight: 600; }
        
        .vd-progress-container { display: flex; align-items: center; gap: 10px; margin-top: 0.75rem; }
        .vd-progress-bar { height: 6px; background-color: #e2e8f0; border-radius: 3px; overflow: hidden; width: 140px; }
        .vd-progress-fill { height: 100%; background-color: #059669; transition: width 0.5s ease-out; }
        .vd-progress-text { font-size: 0.75rem; font-weight: 600; color: #059669; }

        /* Requirement List */
        .vd-req-list { background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
        .vd-req-row { display: flex; align-items: center; justify-content: space-between; padding: 0.875rem 1.25rem; border-bottom: 1px solid #e2e8f0; }
        .vd-req-row:last-child { border-bottom: none; }
        
        .vd-req-info { display: flex; align-items: flex-start; gap: 12px; }
        .vd-req-status-icon { font-size: 1.1rem; margin-top: 2px; }
        .req-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }
        .vd-req-name { font-weight: 600; color: #334155; font-size: 0.9rem; }
        .vd-req-tag { font-size: 0.65rem; padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.025em; }
        .vd-req-tag.master { background-color: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
        .vd-req-tag.trans { background-color: #f3e8ff; color: #7e22ce; border: 1px solid #e9d5ff; }
        .vd-req-expiry { font-size: 0.75rem; color: #64748b; margin-left: 0; }

        /* Status Pills */
        .vd-status-pill { display: inline-flex; align-items: center; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
        .vd-status-pill.pending { background-color: #fffbeb; color: #b45309; border: 1px solid #fcd34d; }
        .vd-status-pill.approved { background-color: #dcfce7; color: #15803d; border: 1px solid #86efac; }

        /* Buttons */
        .vd-btn { padding: 0.625rem 1.25rem; border-radius: 8px; font-size: 0.875rem; font-weight: 600; border: none; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
        .vd-btn.small { padding: 0.4rem 0.9rem; font-size: 0.8rem; }
        .vd-btn.primary { background-color: #059669; color: white; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
        .vd-btn.primary:hover { background-color: #047857; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .vd-btn.upload { background-color: white; border: 1px solid #cbd5e1; color: #334155; }
        .vd-btn.upload:hover { background-color: #f1f5f9; border-color: #94a3b8; color: #0f172a; }
        .vd-btn.disabled { background-color: #f1f5f9; color: #94a3b8; cursor: not-allowed; border: 1px solid #e2e8f0; }

        /* Empty State */
        .vd-empty { text-align: center; padding: 3rem; color: #94a3b8; font-style: italic; background: white; border-radius: 12px; border: 1px dashed #e2e8f0; }

        /* Shipment Modal */
        .vd-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.4); display: flex; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(4px); }
        .vd-modal { background: white; padding: 2rem; border-radius: 16px; width: 100%; max-width: 420px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); border: 1px solid #e2e8f0; }
        .vd-modal h3 { margin-top: 0; color: #0f172a; font-size: 1.25rem; font-weight: 700; }
        .vd-input { width: 100%; padding: 0.75rem 1rem; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 1rem; font-size: 0.9rem; transition: border-color 0.2s; }
        .vd-input:focus { outline: none; border-color: #059669; box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1); }
        .vd-modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 2rem; }

        /* Animations */
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .vd-animate-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      <div className="vd-container">
        <header className="vd-header">
          <div className="vd-brand">
            <h1>PharmaOps <span>Vendor</span></h1>
          </div>
          <div className="vd-user-profile">
            <span>{currentVendor.companyName}</span>
            <div className="vd-avatar">{currentVendor.companyName.charAt(0)}</div>
          </div>
        </header>

        <main className="vd-main">
          {/* Invitation Notice */}
          {renderInvitationNotice()}

          {/* Stats Grid */}
          {currentVendor.status === 'ACCEPTED' && (
            <div className="vd-stats-grid">
              <div className="vd-stat-card yellow">
                <span className="vd-stat-title">📬 New Requests</span>
                <span className="vd-stat-value">{stats.newRequests}</span>
              </div>
              <div className="vd-stat-card red">
                <span className="vd-stat-title">⚠️ Action Required</span>
                <span className="vd-stat-value">{stats.actionRequired}</span>
              </div>
              <div className="vd-stat-card green">
                <span className="vd-stat-title">✅ Ready to Ship</span>
                <span className="vd-stat-value">{stats.readyToShip}</span>
              </div>
            </div>
          )}

          {/* Incoming Requests */}
          {currentVendor.status === 'ACCEPTED' && (
            <section>
              <div className="vd-section-title">
                📋 Incoming Requests
                {stats.newRequests > 0 && <span className="vd-badge-count">{stats.newRequests}</span>}
              </div>
              {renderIncomingRequests()}
            </section>
          )}

          {/* Compliance & Shipping Tasks */}
          {currentVendor.status === 'ACCEPTED' && (
            <section>
              <div className="vd-section-title">
                📦 Compliance & Shipping Tasks
              </div>
              {renderComplianceList()}
            </section>
          )}
        </main>

        {/* Shipment Modal */}
        {shipmentModalOpen && (
          <div className="vd-modal-overlay">
            <div className="vd-modal vd-animate-in">
              <h3>Create Shipment for {vendorOrders.find(o => o.id === shipmentModalOpen)?.orderNumber}</h3>
              <p style={{marginBottom:'1.5rem', color:'#6b7280', fontSize:'0.9rem'}}>
                Compliance verified. Enter logistics details to generate label.
              </p>
              
              <label style={{display:'block', marginBottom:'0.5rem', fontWeight:500}}>Courier Service</label>
              <input 
                className="vd-input" 
                placeholder="e.g. DHL, FedEx, Maersk" 
                value={courierInput}
                onChange={e => setCourierInput(e.target.value)}
              />

              <label style={{display:'block', marginBottom:'0.5rem', fontWeight:500}}>Tracking Number</label>
              <input 
                className="vd-input" 
                placeholder="Scan or enter tracking ID"
                value={trackingInput}
                onChange={e => setTrackingInput(e.target.value)}
              />

              <div className="vd-modal-actions">
                <button onClick={() => setShipmentModalOpen(null)} className="vd-btn">Cancel</button>
                <button onClick={handleShipOrder} className="vd-btn primary">Confirm Shipment</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default VendorDashboard;