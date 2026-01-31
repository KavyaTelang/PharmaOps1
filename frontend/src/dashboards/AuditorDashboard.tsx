import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';

const AuditorDashboard = () => {
  // ===== USE CONTEXT =====
  const {
    auditLogs,
    documents,
    orders,
    getOrderTimeline,
    getProductById,
  } = useAppContext();

  // ===== LOCAL STATE =====
  const [activeTab, setActiveTab] = useState<'LOGS' | 'TRACE' | 'EVIDENCE' | 'REPORTS'>('LOGS');
  const [loadingData, setLoadingData] = useState(false);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterDate, setFilterDate] = useState('ALL');
  
  // Trace States
  const [traceOrderId, setTraceOrderId] = useState('');
  const [timelineData, setTimelineData] = useState<any[]>([]);

  // Evidence States
  const [evidenceSearch, setEvidenceSearch] = useState('');
  const [selectedEvidence, setSelectedEvidence] = useState<typeof documents[0] | null>(null);

  const [selectedLog, setSelectedLog] = useState<typeof auditLogs[0] | null>(null);

  // Get approved documents for evidence library
  const approvedDocs = documents.filter(d => d.status === 'APPROVED');

  // ===== LOAD DATA EFFECT =====
  useEffect(() => {
    const loadAuditData = async () => {
      setLoadingData(true);
      try {
        // Audit logs and documents are already loaded from AppContext via loadDashboardData
        // This ensures they're fresh whenever the component mounts
      } catch (error) {
        console.error('Error loading audit data:', error);
      } finally {
        setLoadingData(false);
      }
    };
    loadAuditData();
  }, []);

  // ===== HELPER FUNCTIONS FOR LIVE TIMESTAMPS =====
  
  const formatLiveTimestamp = (offsetHours: number = 0) => {
    const now = new Date();
    now.setHours(now.getHours() + offsetHours);
    return now.toLocaleString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/\//g, '-');
  };

  const formatLiveDate = (hoursOffset: number = 0) => {
    const date = new Date();
    date.setHours(date.getHours() + hoursOffset);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const time = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${month} ${day}, ${time}`;
  };

  // ===== ACTIONS =====

  // 1. Generate CSV Report (Real Download)
  const handleGenerateReport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "ID,Timestamp,Actor,Role,Action,Entity,BlockchainHash\n"
      + auditLogs.map(row => 
          `${row.id},${row.timestamp},${row.actor.name},${row.actor.role},${row.action},${row.entity},${row.blockchainHash || 'N/A'}`
        ).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit_compliance_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert('✅ Compliance report generated successfully!');
  };

  // 2. Evidence Download
  const handleEvidenceDownload = () => {
    if (!selectedEvidence) return;
    const content = `SECURE EVIDENCE PACK
--------------------------------------------------
Document: ${selectedEvidence.fileName}
Type: ${selectedEvidence.docType}
Upload Date: ${selectedEvidence.uploadDate}

CRYPTOGRAPHIC PROOF
--------------------------------------------------
SHA-256 Hash: ${selectedEvidence.fileHash || 'N/A'}
Blockchain TX: ${selectedEvidence.blockchainTx || 'N/A'}
Approved By: ${selectedEvidence.approvedBy || 'N/A'}
Approval Date: ${selectedEvidence.approvalDate || 'N/A'}

(This file serves as a placeholder for the actual binary PDF in this demo environment.)`;

    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = selectedEvidence.fileName + "_proof.txt"; 
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // 3. Trace Lookup with LIVE DYNAMIC TIMELINE
  const handleTraceSearch = () => {
    if (!traceOrderId) {
      alert('Please enter an Order ID');
      return;
    }
    
    const timeline = getOrderTimeline(traceOrderId.toUpperCase());
    
    if (timeline.length > 0) {
      // Apply live timestamps to timeline events
      const liveTimeline = timeline.map((event, index) => ({
        ...event,
        date: formatLiveDate(-(timeline.length - index))
      }));
      setTimelineData(liveTimeline);
    } else {
      alert(`Order ID ${traceOrderId} not found. Available orders: ${orders.map(o => o.orderNumber).join(', ')}`);
    }
  };

  // ===== RENDERERS =====

  // 1. Audit Log Viewer
  const renderLogs = () => {
    const filteredLogs = auditLogs.filter(log => {
      // Text Search
      const matchesSearch = 
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.actor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.entity.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Role Filter
      const matchesRole = filterRole === 'ALL' || log.actor.role === filterRole;
      
      // Date Filter (simple timestamp comparison)
      let matchesDate = true;
      if (filterDate !== 'ALL') {
        const logDate = new Date(log.timestamp);
        const now = new Date();
        if (filterDate === 'TODAY') {
          matchesDate = logDate.toDateString() === now.toDateString();
        } else if (filterDate === 'THIS_WEEK') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = logDate >= weekAgo;
        }
      }

      return matchesSearch && matchesRole && matchesDate;
    });

    return (
      <div className="au-card au-animate-in">
        <div className="au-toolbar">
          <input 
            type="text" 
            className="au-search" 
            placeholder="🔍 Search logs by User, Action, or ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="au-filter-group">
            <select className="au-select" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="QA">QA</option>
              <option value="VENDOR">Vendor</option>
              <option value="SYSTEM">System</option>
            </select>
            <select className="au-select" value={filterDate} onChange={e => setFilterDate(e.target.value)}>
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="THIS_WEEK">This Week</option>
            </select>
          </div>
        </div>

        <table className="au-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity Affected</th>
              <th>Immutable Proof</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log, index) => (
              <tr key={log.id} className="au-row">
                <td className="au-mono">{formatLiveTimestamp(-(filteredLogs.length - index) * 0.1)}</td>
                <td>
                  <div className="au-actor-name">{log.actor.name}</div>
                  <div className="au-actor-role">{log.actor.role}</div>
                </td>
                <td><span className="au-tag action">{log.action}</span></td>
                <td className="au-mono">{log.entity}</td>
                <td>
                  {log.blockchainHash ? (
                    <span className="au-hash" title={log.blockchainHash}>🔗 {log.blockchainHash.substring(0, 10)}...</span>
                  ) : <span className="au-no-hash">-</span>}
                </td>
                <td>
                  <button className="au-btn-link" onClick={() => setSelectedLog(log)}>View Diff</button>
                </td>
              </tr>
            ))}
            {filteredLogs.length === 0 && <tr><td colSpan={6} className="au-empty">No logs found matching criteria.</td></tr>}
          </tbody>
        </table>
      </div>
    );
  };

  // 2. Order Traceability with LIVE TIMESTAMPS
  const renderTrace = () => {
    // Auto-populate with first order if available
    const defaultOrderId = orders.length > 0 && !traceOrderId ? orders[0].orderNumber : traceOrderId;
    const displayProduct = orders.find(o => o.orderNumber === defaultOrderId);
    const product = displayProduct ? getProductById(displayProduct.productId) : null;

    return (
      <div className="au-card au-animate-in">
        <div className="au-trace-header">
          <div className="au-trace-title">
            <h3>🔍 Lifecycle Trace</h3>
            <div className="au-trace-input-group">
              <input 
                className="au-input-small" 
                value={traceOrderId || defaultOrderId}
                onChange={(e) => setTraceOrderId(e.target.value)}
                placeholder="Enter Order ID"
              />
              <button className="au-btn primary small" onClick={handleTraceSearch}>Search</button>
            </div>
          </div>
          {product && <span className="au-tag product">{product.name}</span>}
        </div>
        
        {timelineData.length === 0 && orders.length > 0 && (
          <div style={{padding: '2rem', textAlign: 'center', color: '#64748b'}}>
            Enter an order ID and click Search. Available: {orders.map(o => o.orderNumber).join(', ')}
          </div>
        )}

        {timelineData.length === 0 && orders.length === 0 && (
          <div style={{padding: '2rem', textAlign: 'center', color: '#64748b'}}>
            No orders available yet. Complete the demo flow to see audit trails.
          </div>
        )}

        {timelineData.length > 0 && (
          <div className="au-timeline">
            {timelineData.map((event, index) => (
              <div key={index} className={`au-tl-item ${event.status === 'COMPLETED' ? 'completed' : ''}`}>
                <div className="au-tl-marker"></div>
                <div className="au-tl-content">
                  <div className="au-tl-top">
                    <span className="au-tl-step">{event.step}</span>
                    <span className="au-tl-date">{event.date}</span>
                  </div>
                  <div className="au-tl-bottom">
                    <span className="au-tl-actor">By: {event.actor}</span>
                    {event.hash && <span className="au-tl-hash">🔗 Anchored: {event.hash}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // 3. Evidence Library
  const renderEvidence = () => {
    // If a document is selected, show detail view
    if (selectedEvidence) {
      return (
        <div className="au-evidence-grid au-animate-in">
          {/* Header with Back Button */}
          <div className="au-card full-width" style={{gridColumn: '1 / -1', marginBottom: 0, paddingBottom: 0, borderBottom: 'none', boxShadow: 'none'}}>
             <button className="au-btn-link" onClick={() => setSelectedEvidence(null)}>← Back to Library</button>
          </div>

          {/* Left: Document Preview */}
          <div className="au-card">
            <div className="au-card-header">📄 Source Document</div>
            <div className="au-doc-preview">
              <div className="au-pdf-icon">PDF</div>
              <div className="au-doc-name">{selectedEvidence.fileName}</div>
              <button className="au-btn primary small" onClick={handleEvidenceDownload}>⬇️ Secure Download</button>
            </div>
          </div>

          {/* Right: Cryptographic Proof */}
          <div className="au-card">
            <div className="au-card-header">🛡️ Compliance & Blockchain Proof</div>
            <div className="au-proof-list">
              <div className="au-proof-item">
                <label>Document Type</label>
                <div className="value">{selectedEvidence.docType}</div>
              </div>
              <div className="au-proof-item">
                <label>Digital Fingerprint (SHA-256)</label>
                <div className="value mono highlight">{selectedEvidence.fileHash || 'Pending hash generation'}</div>
              </div>
              <div className="au-proof-item">
                <label>Blockchain Transaction ID</label>
                <div className="value mono link">{selectedEvidence.blockchainTx || 'N/A'}</div>
              </div>
              <div className="au-proof-item">
                <label>QA Approval Stamp</label>
                <div className="value">
                  Signed by <strong>{selectedEvidence.approvedBy || 'N/A'}</strong><br/>
                  on {selectedEvidence.approvalDate || 'N/A'}
                </div>
              </div>
              <div className="au-verified-badge">✅ Cryptographically Verified</div>
            </div>
          </div>
        </div>
      );
    }

    // Otherwise, show the filterable list
    const filteredEvidence = approvedDocs.filter(doc => 
      doc.fileName.toLowerCase().includes(evidenceSearch.toLowerCase()) ||
      doc.docType.toLowerCase().includes(evidenceSearch.toLowerCase()) ||
      doc.id.toLowerCase().includes(evidenceSearch.toLowerCase())
    );

    return (
      <div className="au-card au-animate-in">
        <div className="au-card-header">🗄️ Secure Evidence Library</div>
        <div className="au-toolbar">
           <input 
            type="text" 
            className="au-search" 
            placeholder="Search by ID, Type, or Filename..." 
            value={evidenceSearch}
            onChange={(e) => setEvidenceSearch(e.target.value)}
          />
        </div>
        <table className="au-table">
          <thead>
            <tr>
              <th>Doc ID</th>
              <th>Type</th>
              <th>Filename</th>
              <th>Upload Date</th>
              <th>Verified By</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvidence.map(doc => (
              <tr key={doc.id} className="au-row">
                <td className="au-mono">{doc.id.slice(0, 10)}...</td>
                <td>{doc.docType}</td>
                <td>{doc.fileName}</td>
                <td>{doc.uploadDate}</td>
                <td>{doc.approvedBy?.split('(')[0] || 'N/A'}</td>
                <td>
                  <button className="au-btn primary small" onClick={() => setSelectedEvidence(doc)}>View Proof</button>
                </td>
              </tr>
            ))}
            {filteredEvidence.length === 0 && <tr><td colSpan={6} className="au-empty">No approved documents found.</td></tr>}
          </tbody>
        </table>
      </div>
    );
  };

  // 4. Report Generator
  const renderReports = () => (
    <div className="au-card au-animate-in narrow">
      <div className="au-card-header">📊 Generate Compliance Report</div>
      <div className="au-form">
        <div className="au-form-group">
          <label>Report Type</label>
          <select className="au-select full">
            <option>Full Audit Trail (All Actions)</option>
            <option>User Activity Report</option>
            <option>Order Lifecycle Summary</option>
            <option>Document Compliance Report</option>
          </select>
        </div>
        <div className="au-form-group">
          <label>Date Range</label>
          <div className="au-date-row">
            <input type="date" className="au-input" />
            <span>to</span>
            <input type="date" className="au-input" />
          </div>
        </div>
        <div className="au-form-group">
          <label>Filter by Actor (Optional)</label>
          <input type="text" className="au-input" placeholder="e.g. U-QA-01 or Admin User" />
        </div>
        
        <div style={{background: '#f8fafc', padding: '1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem', color: '#475569'}}>
          <strong>📋 Report Summary:</strong>
          <ul style={{margin: '0.5rem 0 0 1.5rem', paddingLeft: 0}}>
            <li>{auditLogs.length} total audit log entries</li>
            <li>{approvedDocs.length} approved documents</li>
            <li>{orders.length} orders tracked</li>
          </ul>
        </div>

        <button className="au-btn primary full" onClick={handleGenerateReport}>📥 Generate & Download CSV</button>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; padding: 0; overflow-x: hidden; }

        .au-container {
          font-family: 'Inter', sans-serif;
          background-color: #f1f5f9;
          min-height: 100vh;
          color: #0f172a;
          box-sizing: border-box;
          width: 100vw;
          max-width: 100vw;
          display: flex;
          flex-direction: column;
          overflow-x: hidden;
        }
        .au-container * { box-sizing: border-box; }

        .au-header {
          background-color: #0f172a;
          color: white;
          padding: 0 2rem;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }
        .au-brand { font-size: 1.2rem; font-weight: 700; letter-spacing: 0.05em; display: flex; align-items: center; gap: 10px; }
        .au-brand span { color: #cbd5e1; font-weight: 400; font-size: 0.9rem; background: #334155; padding: 2px 8px; border-radius: 4px; }
        .au-user { display: flex; align-items: center; gap: 10px; font-size: 0.9rem; opacity: 0.8; }
        .au-avatar { width: 30px; height: 30px; background: #475569; color: #fff; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: 700; border: 1px solid #64748b; }

        .au-nav { background: white; border-bottom: 1px solid #e2e8f0; padding: 0 2rem; display: flex; gap: 2rem; }
        .au-nav-item { padding: 1rem 0; cursor: pointer; font-size: 0.9rem; font-weight: 500; color: #64748b; border-bottom: 2px solid transparent; transition: all 0.2s; }
        .au-nav-item:hover { color: #0f172a; }
        .au-nav-item.active { color: #0f172a; border-bottom-color: #0f172a; font-weight: 600; }

        .au-main { 
          flex: 1;
          width: 100%;
          padding: 2rem;
          overflow-y: auto;
          max-width: 100%;
        }

        .au-card { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #e2e8f0; margin-bottom: 2rem; }
        .au-card.narrow { max-width: 600px; margin: 0 auto; }
        .au-card.full-width { width: 100%; }
        .au-card-header { padding: 1rem 1.5rem; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #334155; font-size: 1rem; }

        .au-toolbar { padding: 1rem 1.5rem; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
        .au-search { flex: 1; min-width: 250px; padding: 0.6rem 1rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.9rem; }
        .au-filter-group { display: flex; gap: 10px; }
        .au-select { padding: 0.6rem 1rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.9rem; background: white; cursor: pointer; }
        .au-select.full { width: 100%; }

        .au-table { width: 100%; border-collapse: collapse; text-align: left; }
        .au-table th { background: #f8fafc; padding: 0.8rem 1.5rem; font-size: 0.75rem; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; font-weight: 600; }
        .au-table td { padding: 1rem 1.5rem; border-bottom: 1px solid #f1f5f9; font-size: 0.85rem; color: #334155; vertical-align: middle; }
        .au-row:hover { background: #f8fafc; }
        .au-empty { text-align: center; padding: 3rem; color: #94a3b8; font-style: italic; }
        
        .au-mono { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: #475569; }
        .au-actor-name { font-weight: 600; color: #0f172a; }
        .au-actor-role { font-size: 0.7rem; color: #64748b; }
        
        .au-tag { display: inline-block; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600; border: 1px solid; }
        .au-tag.action { background: #f1f5f9; border-color: #e2e8f0; color: #334155; }
        .au-tag.product { background: #e0f2fe; border-color: #bae6fd; color: #0284c7; }
        
        .au-hash { color: #2563eb; cursor: help; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; background: #eff6ff; padding: 2px 6px; border-radius: 4px; }
        .au-no-hash { color: #94a3b8; }
        
        .au-btn-link { background: none; border: none; color: #2563eb; cursor: pointer; font-size: 0.8rem; font-weight: 500; text-decoration: underline; }

        .au-trace-header { padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; }
        .au-trace-title { display: flex; align-items: center; gap: 15px; }
        .au-trace-input-group { display: flex; gap: 8px; }
        .au-input-small { padding: 0.4rem 0.8rem; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.85rem; }
        .au-timeline { padding: 2rem; position: relative; }
        .au-timeline::before { content: ''; position: absolute; top: 2rem; bottom: 2rem; left: 2.4rem; width: 2px; background: #e2e8f0; z-index: 0; }
        
        .au-tl-item { position: relative; padding-left: 3rem; margin-bottom: 2rem; z-index: 1; }
        .au-tl-item:last-child { margin-bottom: 0; }
        .au-tl-marker { position: absolute; left: 2rem; top: 0; width: 14px; height: 14px; border-radius: 50%; background: #cbd5e1; border: 3px solid white; box-shadow: 0 0 0 1px #cbd5e1; transform: translateX(-50%); }
        .au-tl-item.completed .au-tl-marker { background: #10b981; box-shadow: 0 0 0 1px #10b981; }
        
        .au-tl-content { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 1rem; }
        .au-tl-top { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
        .au-tl-step { font-weight: 600; color: #0f172a; }
        .au-tl-date { font-size: 0.8rem; color: #64748b; }
        .au-tl-bottom { font-size: 0.8rem; color: #475569; display: flex; flex-direction: column; gap: 4px; }
        .au-tl-hash { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: #2563eb; }

        .au-evidence-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
        .au-doc-preview { padding: 3rem; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f1f5f9; height: 300px; border-bottom: 1px solid #e2e8f0; }
        .au-pdf-icon { font-size: 3rem; color: #ef4444; font-weight: 900; margin-bottom: 1rem; }
        .au-doc-name { font-weight: 500; color: #334155; margin-bottom: 1.5rem; }
        .au-btn { padding: 0.6rem 1.2rem; border-radius: 6px; border: none; font-weight: 600; cursor: pointer; font-size: 0.9rem; transition: all 0.2s; }
        .au-btn.primary { background: #0f172a; color: white; }
        .au-btn.primary:hover { background: #334155; }
        .au-btn.full { width: 100%; }
        .au-btn.small { font-size: 0.8rem; padding: 0.4rem 0.8rem; }

        .au-proof-list { padding: 1.5rem; }
        .au-proof-item { margin-bottom: 1.2rem; }
        .au-proof-item label { display: block; font-size: 0.7rem; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
        .au-proof-item .value { font-size: 0.9rem; color: #0f172a; word-break: break-all; }
        .au-proof-item .value.mono { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; }
        .au-proof-item .value.highlight { background: #f1f5f9; padding: 6px; border-radius: 4px; border: 1px solid #e2e8f0; }
        .au-proof-item .value.link { color: #2563eb; text-decoration: underline; cursor: pointer; }
        .au-verified-badge { margin-top: 1.5rem; background: #ecfdf5; color: #065f46; text-align: center; padding: 0.8rem; border-radius: 6px; font-weight: 600; border: 1px solid #6ee7b7; }

        .au-form { padding: 2rem; }
        .au-form-group { margin-bottom: 1.5rem; }
        .au-form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; font-size: 0.9rem; color: #334155; }
        .au-input { width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 6px; }
        .au-date-row { display: flex; align-items: center; gap: 10px; }
        .au-date-row span { color: #64748b; font-size: 0.9rem; }

        .au-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 200; }
        .au-modal { background: white; width: 600px; border-radius: 8px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); overflow: hidden; animation: fadeIn 0.2s ease-out; }
        .au-modal-content { padding: 2rem; max-height: 80vh; overflow-y: auto; }
        .au-modal pre { background: #1e293b; color: #e2e8f0; padding: 1rem; border-radius: 6px; overflow-x: auto; font-size: 0.8rem; }
        .au-modal-footer { padding: 1rem 2rem; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: right; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .au-animate-in { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>

      <div className="au-container">
        <header className="au-header">
          <div className="au-brand">PharmaOps <span>AUDITOR</span></div>
          <div className="au-user">
            <span>External Inspector (ISO-9001)</span>
            <div className="au-avatar">E</div>
          </div>
        </header>

        <nav className="au-nav">
          <div className={`au-nav-item ${activeTab === 'LOGS' ? 'active' : ''}`} onClick={() => setActiveTab('LOGS')}>Action Logs</div>
          <div className={`au-nav-item ${activeTab === 'TRACE' ? 'active' : ''}`} onClick={() => setActiveTab('TRACE')}>Order Traceability</div>
          <div className={`au-nav-item ${activeTab === 'EVIDENCE' ? 'active' : ''}`} onClick={() => setActiveTab('EVIDENCE')}>Evidence Packs</div>
          <div className={`au-nav-item ${activeTab === 'REPORTS' ? 'active' : ''}`} onClick={() => setActiveTab('REPORTS')}>Reports</div>
        </nav>

        <main className="au-main">
          {activeTab === 'LOGS' && renderLogs()}
          {activeTab === 'TRACE' && renderTrace()}
          {activeTab === 'EVIDENCE' && renderEvidence()}
          {activeTab === 'REPORTS' && renderReports()}
        </main>

        {selectedLog && (
          <div className="au-modal-overlay" onClick={() => setSelectedLog(null)}>
            <div className="au-modal" onClick={e => e.stopPropagation()}>
              <div className="au-card-header">Payload Inspector: {selectedLog.id}</div>
              <div className="au-modal-content">
                <p><strong>Action:</strong> {selectedLog.action}</p>
                <p><strong>Actor:</strong> {selectedLog.actor.name} ({selectedLog.actor.id})</p>
                <hr style={{margin:'1rem 0', border:'none', borderBottom:'1px solid #e2e8f0'}}/>
                <h4>Data Change Log</h4>
                <pre>{JSON.stringify(selectedLog.changes, null, 2)}</pre>
              </div>
              <div className="au-modal-footer">
                <button className="au-btn primary small" onClick={() => setSelectedLog(null)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AuditorDashboard;