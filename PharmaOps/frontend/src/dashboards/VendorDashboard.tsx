import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';

const VendorDashboard = () => {
  // ===== USE CONTEXT =====
  const { user } = useAppContext();
  
  // Navigation state
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // ===== REAL DATA FROM BACKEND =====
  const [vendors, setVendors] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ===== LOCAL STATE =====
  const [shipmentModalOpen, setShipmentModalOpen] = useState<string | null>(null);
  const [trackingInput, setTrackingInput] = useState('');
  const [courierInput, setCourierInput] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [profileData, ordersData] = await Promise.all([
        api.getMyProfile().catch(() => ({ vendor: null })),
        api.getMyOrders().catch(() => ({ orders: [] })),
      ]);
      
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

  // ===== AUTO-SELECT FIRST VENDOR =====
  useEffect(() => {
    if (vendors.length > 0 && !selectedVendorId) {
      setSelectedVendorId(vendors[0].id);
    }
  }, [vendors, selectedVendorId]);

  const currentVendor = vendors.find(v => v.id === selectedVendorId);
  const vendorOrders = orders.filter(o => o.vendorId === selectedVendorId);

  const getProductById = (order: any) => {
    if (order.productName) return order.productName;
    const product = products.find(p => p.id === order.productId);
    return product?.name || 'Unknown Product';
  };

  const stats = {
    newRequests: vendorOrders.filter(o => o.status === 'REQUESTED').length,
    actionRequired: vendorOrders.flatMap(o => o.requirements || []).filter(r => r.status === 'MISSING').length,
    readyToShip: vendorOrders.filter(o => o.status === 'READY_TO_SHIP').length,
    totalOrders: vendorOrders.length,
  };

  // ===== HANDLERS =====
  const handleAcceptInvitation = async () => {
    if (!selectedVendorId) return;
    
    try {
      await api.acceptInvitation();
      await api.logAction({
      action: 'INVITATION_ACCEPTED',
      entityType: 'VENDOR_PROFILE',
      details: 'Vendor accepted partnership invitation',
      changes: { status: 'ACCEPTED' },
    }).catch(err => console.log('Audit log failed:', err));
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

      await api.logAction({
      action: 'ORDER_ACCEPTED',
      entityType: 'ORDER',
      entityId: orderId,
      details: `Vendor accepted order`,
      changes: { status: 'ACCEPTED' },
    }).catch(err => console.log('Audit log failed:', err));

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

          await api.logAction({
          action: 'DOCUMENT_UPLOADED',
          entityType: 'DOCUMENT',
          entityId: orderId,
          details: `Vendor uploaded ${docType} document: ${file.name}`,
          changes: { fileName: file.name, docType: docType },
        }).catch(err => console.log('Audit log failed:', err));
          
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
      
      await api.logAction({
      action: 'SHIPMENT_CREATED',
      entityType: 'SHIPMENT',
      entityId: shipmentModalOpen,
      details: `Vendor created shipment via ${courierInput} with tracking ${trackingInput}`,
      changes: { trackingNumber: trackingInput, courier: courierInput },
    }).catch(err => console.log('Audit log failed:', err));

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

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', background: 'white', minHeight: '100vh' }}>
        <h2>Loading vendor dashboard...</h2>
      </div>
    );
  }

  if (!currentVendor) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', background: 'white', minHeight: '100vh' }}>
        <h2>No vendor profile found. Admin needs to invite you first.</h2>
      </div>
    );
  }

  const renderDashboard = () => (
    <>
      {/* Invitation Notice */}
      {currentVendor.status === 'INVITED' && (
        <div className="invitation-banner">
          <h3>🎉 Partnership Invitation</h3>
          <p>You have been invited to join the PharmaOps platform. Accept to start receiving orders.</p>
          <button onClick={handleAcceptInvitation} className="vd-btn primary">
            Accept Partnership
          </button>
        </div>
      )}

      {/* Stats Section */}
      <div className="vd-stats-section">
        <div className="vd-stat-card">
          <div className="vd-stat-icon-circle">
            <img src="new-requests.png" alt="icon" style={{width: '40px', height: '35px'}} />
          </div>
          <div className="vd-stat-label">New Requests</div>
          <div className="vd-stat-value">{stats.newRequests}</div>
        </div>
        <div className="vd-stat-card">
          <div className="vd-stat-icon-circle">
            <img src="action-required.png" alt="icon" style={{width: '40px', height: '40px'}} />
          </div>
          <div className="vd-stat-label">Action Required</div>
          <div className="vd-stat-value">{stats.actionRequired}</div>
        </div>
        <div className="vd-stat-card">
          <div className="vd-stat-icon-circle">
            <img src="shipping.png" alt="icon" style={{width: '45px', height: '45px'}} />
          </div>
          <div className="vd-stat-label">Ready to Ship</div>
          <div className="vd-stat-value">{stats.readyToShip}</div>
        </div>
        <div className="vd-stat-card">
          <div className="vd-stat-icon-circle">
            <img src="total-orders-vendor.png" alt="icon" style={{width: '40px', height: '40px'}} />
          </div>
          <div className="vd-stat-label">Total Orders</div>
          <div className="vd-stat-value">{stats.totalOrders}</div>
        </div>
      </div>

      {/* Incoming Requests */}
      <div className="vd-card">
        <div className="vd-card-header">
          <h3>📋 Incoming Requests</h3>
        </div>
        <div className="vd-table-wrapper">
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
              {vendorOrders.filter(o => o.status === 'REQUESTED').map(order => (
                <tr key={order.id}>
                  <td className="font-medium">{order.orderNumber}</td>
                  <td>{getProductById(order)}</td>
                  <td>{order.quantity.toLocaleString()}</td>
                  <td>{order.destination}</td>
                  <td className="align-right">
                    <button onClick={() => handleAcceptOrder(order.id)} className="vd-btn primary small">
                      Accept Order
                    </button>
                  </td>
                </tr>
              ))}
              {vendorOrders.filter(o => o.status === 'REQUESTED').length === 0 && (
                <tr><td colSpan={5} style={{textAlign: 'center', padding: '2rem', color: '#9ca3af'}}>No new requests</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  const renderOrders = () => {
    const activeOrders = vendorOrders.filter(o => o.status === 'DOCS_PENDING' || o.status === 'READY_TO_SHIP');
    
    return (
      <>
        <div className="vd-page-header">
          <h2>Compliance & Shipping Tasks</h2>
        </div>

        {activeOrders.map(order => {
          const productName = getProductById(order);
          const requirements = order.requirements || [];
          const totalReqs = requirements.length;
          const approvedReqs = requirements.filter((r: any) => r.status === 'APPROVED').length;
          const progress = totalReqs > 0 ? Math.round((approvedReqs / totalReqs) * 100) : 0;
          const isReady = order.status === 'READY_TO_SHIP';

          return (
            <div key={order.id} className={`vd-card ${isReady ? 'ready-border' : ''}`} style={{marginBottom: '1.5rem'}}>
              <div className="vd-card-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <h3>{order.orderNumber} - {productName}</h3>
                  <div style={{fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem'}}>
                    Dest: {order.destination} | Qty: {order.quantity.toLocaleString()}
                  </div>
                </div>
                <button 
                  className={`vd-btn ${isReady ? 'primary' : 'disabled'}`}
                  disabled={!isReady}
                  onClick={() => isReady && setShipmentModalOpen(order.id)}
                >
                  {isReady ? '🚚 Ship Order' : `Wait for QA (${approvedReqs}/${totalReqs})`}
                </button>
              </div>
              
              <div className="vd-card-body">
                <div className="vd-progress-container">
                  <div className="vd-progress-bar">
                    <div className="vd-progress-fill" style={{ width: `${progress}%` }}></div>
                  </div>
                  <span className="vd-progress-text">{progress}% Compliant</span>
                </div>

                <div style={{marginTop: '1rem'}}>
                  {requirements.map((req: any) => (
                    <div key={req.id} className="vd-req-row">
                      <div style={{display: 'flex', alignItems: 'center', gap: '12px', flex: 1}}>
                        <span style={{ color: getStatusColor(req.status), fontSize: '1.1rem' }}>
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
                            <div style={{fontSize: '0.75rem', color: '#64748b'}}>Valid until: {req.expiryDate}</div>
                          )}
                        </div>
                      </div>
                      <div>
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
            </div>
          );
        })}

        {activeOrders.length === 0 && (
          <div className="vd-card">
            <div className="vd-card-body" style={{padding: '3rem', textAlign: 'center', color: '#9ca3af'}}>
              No active compliance tasks
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0 !important; padding: 0 !important; font-family: 'Poppins', sans-serif; overflow-x: hidden; }

        .vd-container {
          display: flex;
          min-height: 100vh;
          width: 100vw;
          background: linear-gradient(180deg, #d8dcfc 0%, #f5f7fa 35%);
        }

        .vd-sidebar {
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

        .vd-sidebar.closed { transform: translateX(-260px); }

        .vd-menu-toggle {
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

        .vd-menu-toggle:hover { background: #2a3442; transform: scale(1.05); }
        .vd-menu-toggle.sidebar-open { left: 275px; }

        .vd-sidebar-header { padding: 1.5rem 1.25rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
        .vd-logo { font-size: 1.25rem; font-weight: 700; color: #1f2937; }

        .vd-nav { flex: 1; padding: 1rem 0; overflow-y: auto; }
        .vd-nav-item {
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

        .vd-nav-item:hover { background: rgba(255, 255, 255, 0.05); color: #713ed0; }
        .vd-nav-item.active { background: rgba(59, 130, 246, 0.1); color: #00142d; border-left-color: #001230; }
        .vd-nav-icon { font-size: 1.1rem; width: 20px; text-align: center; }

        .vd-sidebar-footer { padding: 1.25rem; border-top: 1px solid rgba(255, 255, 255, 0.1); }
        .vd-profile {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 6px;
          transition: background 0.2s;
        }

        .vd-profile:hover { background: rgba(255, 255, 255, 0.05); }
        .vd-profile-avatar {
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

        .vd-profile-name { font-size: 0.9rem; font-weight: 500; color: #1f2937; }
        .vd-profile-role { font-size: 0.75rem; color: #1f2937; }

        .vd-main {
          flex: 1;
          margin-left: 260px;
          padding: 5rem 2rem 2rem 2rem;
          transition: all 0.3s ease;
          overflow-x: hidden;
          min-height: 100vh;
          box-sizing: border-box;
          background: linear-gradient(180deg, #d8dcfc 0%, #f5f7fa 35%);
        }

        .vd-main.sidebar-closed { margin-left: 0; }

        .vd-page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .vd-page-header h2 { font-size: 1.75rem; font-weight: 600; color: #1f2937; }

        .vd-stats-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .vd-stat-card {
          padding: 1.75rem;
          border-radius: 20px;
          border: none;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .vd-stat-card:hover { transform: translateY(-5px); box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12); }
        .vd-stat-card:nth-child(1) { background: linear-gradient(180deg, #e7f9d6 0%, #f3f6f0 100%); }
        .vd-stat-card:nth-child(2) { background: linear-gradient(180deg, #c9eaf7 0%, #e5f6fe 100%); }
        .vd-stat-card:nth-child(3) { background: linear-gradient(180deg, #daddf7 0%, #f3f4fd 100%); }
        .vd-stat-card:nth-child(4) { background: linear-gradient(180deg, #f5d5e1 0%, #f3eef0 100%); }

        .vd-stat-icon-circle {
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

        .vd-stat-label {
          font-size: 0.75rem;
          color: #4a5568;
          font-weight: 600;
          margin-bottom: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .vd-stat-value {
          font-size: 2.5rem;
          font-weight: 700;
          color: #1a202c;
          line-height: 1;
          margin-bottom: 0.5rem;
        }

        .vd-card {
          background: white;
          border-radius: 16px;
          border: none;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
          transition: all 0.3s ease;
          margin-bottom: 2rem;
        }

        .vd-card:hover { box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1); }
        .vd-card.ready-border { border-left: 4px solid #10b981; }

        .vd-card-header {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #f3f4f6;
          background: #fafbfc;
        }

        .vd-card-header h3 { font-size: 1rem; font-weight: 600; color: #1f2937; margin: 0; }

        .vd-card-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }

        .vd-table-wrapper { overflow-x: auto; }
        .vd-table { width: 100%; border-collapse: collapse; }
        .vd-table th {
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

        .vd-table td {
          padding: 1rem;
          border-bottom: 1px solid #f3f4f6;
          font-size: 0.9rem;
          color: #1f2937;
        }

        .vd-table tbody tr { cursor: pointer; transition: background 0.2s; }
        .vd-table tbody tr:hover { background: #f9fafb; }

        .align-right { text-align: right; }
        .font-medium { font-weight: 500; }

        .vd-btn {
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          border: none;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.3s ease;
        }

        .vd-btn.primary {
          background: linear-gradient(135deg, #000d45 0%, #000d45 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .vd-btn.primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4); }
        .vd-btn.small { font-size: 0.8rem; padding: 0.4rem 0.8rem; }
        .vd-btn.disabled { opacity: 0.5; cursor: not-allowed; background: #94a3b8; }
        .vd-btn.upload {
          background: white;
          border: 1px solid #cbd5e1;
          color: #334155;
        }

        .vd-btn.upload:hover { background: #f1f5f9; }

        .vd-progress-container { display: flex; align-items: center; gap: 10px; margin-top: 0.75rem; }
        .vd-progress-bar { height: 6px; background-color: #e2e8f0; border-radius: 3px; overflow: hidden; flex: 1; }
        .vd-progress-fill { height: 100%; background-color: #059669; transition: width 0.5s ease-out; }
        .vd-progress-text { font-size: 0.75rem; font-weight: 600; color: #059669; }

        .vd-req-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.875rem 1rem;
          background: #f8fafc;
          border-radius: 8px;
          margin-bottom: 0.5rem;
        }

        .req-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }
        .vd-req-name { font-weight: 600; color: #334155; font-size: 0.9rem; }
        .vd-req-tag {
          font-size: 0.65rem;
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .vd-req-tag.master { background-color: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
        .vd-req-tag.trans { background-color: #f3e8ff; color: #7e22ce; border: 1px solid #e9d5ff; }

        .vd-status-pill {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .vd-status-pill.pending { background-color: #fffbeb; color: #b45309; border: 1px solid #fcd34d; }
        .vd-status-pill.approved { background-color: #dcfce7; color: #15803d; border: 1px solid #86efac; }

        .invitation-banner {
          background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
          padding: 1.5rem;
          border-radius: 16px;
          border-left: 4px solid #f59e0b;
          margin-bottom: 2rem;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
        }

        .invitation-banner h3 { margin: 0 0 0.5rem 0; color: #92400e; }
        .invitation-banner p { margin: 0 0 1rem 0; color: #78350f; }

        .vd-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          backdrop-filter: blur(3px);
        }

        .vd-modal {
          background: white;
          padding: 2rem;
          border-radius: 16px;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .vd-modal h3 { margin-top: 0; color: #0f172a; font-size: 1.25rem; font-weight: 700; }
        .vd-input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }

        .vd-input:focus { outline: none; border-color: #059669; box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1); }
        .vd-modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 2rem; }

        @media (max-width: 768px) {
          .vd-sidebar { transform: translateX(-260px); }
          .vd-main { margin-left: 0; padding: 1rem; }
          .vd-stats-section { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="vd-container">
        <button 
          className={`vd-menu-toggle ${sidebarOpen ? 'sidebar-open' : ''}`}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>

        <div className={`vd-sidebar ${!sidebarOpen ? 'closed' : ''}`}>
          <div className="vd-sidebar-header">
            <div className="vd-logo">MedSupply Vendor</div>
          </div>

          <nav className="vd-nav">
            <div 
              className={`vd-nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentPage('dashboard')}
            >
              <span className="vd-nav-icon"></span>
              <span>Dashboard</span>
            </div>
            <div 
              className={`vd-nav-item ${currentPage === 'orders' ? 'active' : ''}`}
              onClick={() => setCurrentPage('orders')}
            >
              <span className="vd-nav-icon"></span>
              <span>Orders</span>
            </div>
          </nav>

          <div className="vd-sidebar-footer">
            <div className="vd-profile">
              <div className="vd-profile-avatar">{currentVendor.companyName.charAt(0)}</div>
              <div>
                <div className="vd-profile-name">{currentVendor.companyName}</div>
                <div className="vd-profile-role">Vendor</div>
              </div>
            </div>
          </div>
        </div>

        <main className={`vd-main ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
          {currentPage === 'dashboard' && renderDashboard()}
          {currentPage === 'orders' && renderOrders()}
        </main>

        {shipmentModalOpen && (
          <div className="vd-modal-overlay" onClick={() => setShipmentModalOpen(null)}>
            <div className="vd-modal" onClick={e => e.stopPropagation()}>
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