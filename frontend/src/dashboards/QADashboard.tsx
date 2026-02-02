import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';

const QADashboard = () => {
  // ===== USE CONTEXT =====
  const {
    documents,
    orders,
    masterSOPs,
    getVendorById,
    getProductById,
    getOrderById,
    approveDocument,
    rejectDocument,
  } = useAppContext();

  // ===== LOCAL STATE =====
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [showMasterDoc, setShowMasterDoc] = useState(false);
  
  // Form State
  const [password, setPassword] = useState('');
  const [comments, setComments] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('');

  // Get pending documents
  const pendingDocs = documents.filter(d => d.status === 'PENDING_REVIEW');
  const currentDoc = documents.find(d => d.id === selectedDoc);

  // ===== HANDLERS =====
  const handleOpenReview = (docId: string) => {
    setSelectedDoc(docId);
    setPassword('');
    setComments('');
    setShowMasterDoc(false);
  };

  const handleCloseReview = () => {
    setSelectedDoc(null);
    setShowMasterDoc(false);
  };

  const handleDownload = () => {
    if (!currentDoc) return;
    const element = document.createElement("a");
    const file = new Blob(["Simulated Content for " + currentDoc.fileName], {type: 'application/pdf'});
    element.href = URL.createObjectURL(file);
    element.download = currentDoc.fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleViewMaster = () => {
    setShowMasterDoc(true);
  };

  const handleCloseMaster = () => {
    setShowMasterDoc(false);
  };

  const handleApprove = async () => {
    if (!password) {
      alert("Signature Password is required for 21 CFR Part 11 Compliance.");
      return;
    }
    if (password !== 'password') {
      alert("Invalid Signature Password.");
      return;
    }
    if (!currentDoc) return;

    setIsProcessing(true);
    setProcessStep("Verifying Electronic Signature...");
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setProcessStep("Hashing Document (SHA-256)...");
      
      await new Promise(resolve => setTimeout(resolve, 800));
      setProcessStep("Anchoring to Private Blockchain...");
      
      await new Promise(resolve => setTimeout(resolve, 800));
      await approveDocument(currentDoc.id, 'Dr. Pulashya Verma', password, comments);
      
      // Log action
      await api.logAction({
        action: 'DOCUMENT_APPROVED',
        entityType: 'DOCUMENT',
        entityId: currentDoc.id,
        details: `QA approved document ${currentDoc.fileName}`,
        changes: { status: 'APPROVED', comments: comments },
      }).catch(err => console.log('Audit log failed:', err));
      
      setIsProcessing(false);
      setSelectedDoc(null);
      alert(`✅ Document Approved & Signed!\n\nOrder ${currentDoc.orderNumber} compliance updated.\nBlockchain Hash: ${currentDoc.blockchainTx || '0x7f83b165...'}`);
    } catch (error) {
      setIsProcessing(false);
      alert('Failed to approve document');
      console.error('Error approving document:', error);
    }
  };

  const handleReject = async () => {
    if (!comments) {
      alert("Reason for rejection is mandatory for Audit Trail.");
      return;
    }
    if (!currentDoc) return;

    try {
      await rejectDocument(currentDoc.id, 'Dr. Pulashya Verma', comments);
      
      // Log action
      await api.logAction({
        action: 'DOCUMENT_REJECTED',
        entityType: 'DOCUMENT',
        entityId: currentDoc.id,
        details: `QA rejected document ${currentDoc.fileName}`,
        changes: { status: 'REJECTED', reason: comments },
      }).catch(err => console.log('Audit log failed:', err));
      
      setSelectedDoc(null);
      alert(`❌ Document Rejected\n\nVendor has been notified to re-upload.\nReason: ${comments}`);
    } catch (error) {
      alert('Failed to reject document');
      console.error('Error rejecting document:', error);
    }
  };

  // ===== HELPERS =====
  const getAIScoreColor = (score: number) => {
    if (score >= 90) return '#10b981'; 
    if (score >= 70) return '#f59e0b'; 
    return '#ef4444'; 
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'HIGH': return { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' };
      case 'MEDIUM': return { bg: '#fffbeb', text: '#d97706', border: '#fcd34d' };
      case 'LOW': return { bg: '#f0fdf4', text: '#166534', border: '#86efac' };
      default: return { bg: '#f3f4f6', text: '#4b5563', border: '#e5e7eb' };
    }
  };

  // ===== RENDERERS =====
  const renderQueue = () => {
    const highCount = pendingDocs.filter(d => d.priority === 'HIGH').length;
    const medCount = pendingDocs.filter(d => d.priority === 'MEDIUM').length;
    const lowCount = pendingDocs.filter(d => d.priority === 'LOW').length;

    return (
      <div className="qa-section">
        {/* KPI Cards */}
        <div className="qa-stats-grid">
          <div className="qa-stat-card red">
            <span className="qa-stat-label">🔥 High Priority</span>
            <span className="qa-stat-val">{highCount}</span>
          </div>
          <div className="qa-stat-card yellow">
            <span className="qa-stat-label">⚖️ Medium Priority</span>
            <span className="qa-stat-val">{medCount}</span>
          </div>
          <div className="qa-stat-card green">
            <span className="qa-stat-label">🌱 Low Priority</span>
            <span className="qa-stat-val">{lowCount}</span>
          </div>
          <div className="qa-stat-card blue">
            <span className="qa-stat-label">⏱️ Total Pending</span>
            <span className="qa-stat-val">{pendingDocs.length}</span>
          </div>
        </div>

        <div className="qa-section-header">
          <h2>📋 Review Queue</h2>
          <span className="qa-badge-count">{pendingDocs.length} Pending</span>
        </div>
        
        <div className="qa-card">
          <table className="qa-table">
            <thead>
              <tr>
                <th>Priority</th>
                <th>Doc Type</th>
                <th>Order ID</th>
                <th>Vendor</th>
                <th>AI Risk Score</th>
                <th>Received</th>
                <th className="align-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingDocs.map(doc => {
                const pStyle = getPriorityColor(doc.priority || 'MEDIUM');
                return (
                  <tr key={doc.id} className="qa-row-hover" onClick={() => handleOpenReview(doc.id)}>
                    <td>
                      <span className="qa-priority-badge" style={{ backgroundColor: pStyle.bg, color: pStyle.text, borderColor: pStyle.border }}>
                        {doc.priority || 'MEDIUM'}
                      </span>
                    </td>
                    <td>
                      <div className="qa-doc-name">{doc.docType || 'Document'}</div>
                      <div className="qa-doc-sub">{doc.fileName || 'N/A'}</div>
                    </td>
                    <td className="font-medium">{doc.orderNumber || 'N/A'}</td>
                    <td>{doc.vendorName || 'Vendor'}</td>
                    <td>
                      <div className="qa-ai-pill" style={{ borderColor: getAIScoreColor(doc.aiInsights?.qualityScore || 85), color: getAIScoreColor(doc.aiInsights?.qualityScore || 85) }}>
                        {doc.aiInsights?.qualityScore || 85}% Safe
                      </div>
                    </td>
                    <td className="text-gray">{doc.uploadDate || new Date(doc.createdAt).toLocaleDateString()}</td>
                    <td className="align-right">
                      <button className="qa-btn secondary">Review</button>
                    </td>
                  </tr>
                );
              })}
              {pendingDocs.length === 0 && (
                <tr>
                  <td colSpan={7} className="qa-empty">🎉 All Caught Up! No documents pending review.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderWorkspace = () => {
    if (!currentDoc) return null;

    const order = getOrderById(currentDoc.orderId);
    const product = order ? getProductById(order.productId) : null;
    
    // Determine if this is Packing List or Certificate of Analysis
    const isPackingList = currentDoc.docType.toLowerCase().includes('packing');

    return (
      <div className="qa-workspace vd-animate-in">
        {/* Header */}
        <div className="qa-ws-header">
          <div className="qa-ws-title">
            <button onClick={handleCloseReview} className="qa-back-btn">← Back</button>
            <div>
              <h1>Reviewing: {currentDoc.docType}</h1>
              <span className="qa-meta">Order {currentDoc.orderNumber} • Uploaded by {currentDoc.vendorName}</span>
            </div>
          </div>
          <div className="qa-ws-actions">
            <div className="qa-secure-box">
              <span className="qa-secure-badge">🔒 21 CFR Part 11 Mode</span>
              <div className="qa-secure-tooltip">
                • Identity Verified via Electronic Signature<br/>
                • Full Audit Trail Logged
              </div>
            </div>
          </div>
        </div>

        <div className="qa-ws-grid">
          
          {/* LEFT PANEL: EVIDENCE - MOCK DATA BASED ON DOC TYPE */}
          <div className="qa-panel left">
            <div className="qa-panel-header">📄 Evidence (Vendor Upload)</div>
            <div className="qa-pdf-mock">
              <div className="pdf-toolbar">
                <span>Page 1 / 1</span>
                <span>100%</span>
                <span className="pdf-action" onClick={handleDownload}>⬇️ Download</span>
              </div>
              <div className="pdf-content">
                <div className="pdf-page">
                  <div className="pdf-logo">{(currentDoc.vendorName || 'VENDOR').toUpperCase()} LABS</div>
                  <h3>{(currentDoc.docType || 'DOCUMENT').toUpperCase()}</h3>
                  
                  <div className="pdf-row" style={{ backgroundColor: '#f0f0f0', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
                    <strong>📄 Document Information:</strong>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                      <div><strong>File:</strong> {currentDoc.fileName || 'N/A'}</div>
                      <div><strong>Type:</strong> {currentDoc.docType || 'N/A'}</div>
                      <div><strong>Status:</strong> {currentDoc.status || 'N/A'}</div>
                      <div><strong>Uploaded:</strong> {currentDoc.createdAt ? new Date(currentDoc.createdAt).toLocaleDateString() : 'N/A'}</div>
                      <div><strong>Path:</strong> {currentDoc.filePath || 'N/A'}</div>
                    </div>
                  </div>
                  
                  {isPackingList ? (
                    // PACKING LIST MOCK DATA FOR REFERENCE
                    <>
                      <strong>Expected Content:</strong>
                      <div className="pdf-row"><strong>Product:</strong> Atenolol 50mg Tablets</div>
                      <div className="pdf-row"><strong>Batch:</strong> B-998-X</div>
                      <div className="pdf-row"><strong>Order ID:</strong> {currentDoc.orderNumber}</div>
                      <br />
                    </>
                  ) : (
                    // CERTIFICATE OF ANALYSIS MOCK DATA FOR REFERENCE
                    <>
                      <strong>Expected Content:</strong>
                      <div className="pdf-row"><strong>Product:</strong> Atenolol 50mg</div>
                      <div className="pdf-row"><strong>Batch:</strong> B-998-X</div>
                      <div className="pdf-row"><strong>Mfg Date:</strong> 2023-01-15</div>
                      <div className="pdf-row highlight"><strong>Exp Date:</strong> 2025-12-31</div>
                      <br />
                    </>
                  )}
                  
                  <div className="pdf-sign">Vendor: {currentDoc.vendorName || 'Unknown Vendor'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* CENTER PANEL: 3-WAY MATCH - MOCK DATA BASED ON DOC TYPE */}
          <div className="qa-panel center">
            <div className="qa-panel-header">🧩 3-Way Handshake Protocol</div>
            
            <div className="qa-match-container">
              
              {/* Match 1 - ORDER DATA */}
              <div className="qa-match-section">
                <h4>1. Order Data (Database)</h4>
                <div className="qa-match-row">
                  <span className="label">Batch Expected:</span>
                  <span className="value">B-998-X</span>
                </div>
                
                {isPackingList ? (
                  <>
                    <div className="qa-match-row">
                      <span className="label">Order Quantity:</span>
                      <span className="value">500 Units</span>
                    </div>
                    <div className="qa-match-row">
                      <span className="label">Packaging Req:</span>
                      <span className="value highlight">Sealed Cartons</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="qa-match-row">
                      <span className="label">Order Qty:</span>
                      <span className="value">500 Units</span>
                    </div>
                    <div className="qa-match-row">
                      <span className="label">Quality Req:</span>
                      <span className="value highlight">Purity Test Required</span>
                    </div>
                  </>
                )}
                
                <div className={`qa-match-status pass`}>
                  ✅ Matches PDF Evidence
                </div>
              </div>

              {/* Match 2 - MASTER RULE */}
              <div className="qa-match-section">
                <h4>2. Master Rule (Admin SOP)</h4>
                
                {isPackingList ? (
                  <>
                    <div className="qa-match-row">
                      <span className="label">Rule:</span>
                      <span className="value">Logistics & Packaging Protocol v2.1</span>
                    </div>
                    <div className="qa-match-row">
                      <span className="label">Requirement:</span>
                      <span className="value highlight">Match Order Quantity & Packaging Standards</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="qa-match-row">
                      <span className="label">Rule:</span>
                      <span className="value">Atenolol Quality Spec Sheet v2.1</span>
                    </div>
                    <div className="qa-match-row">
                      <span className="label">Requirement:</span>
                      <span className="value highlight">Purity &gt; 99.0%</span>
                    </div>
                  </>
                )}
                
                {/* Always show Master SOP link with MOCK data */}
                <div className="qa-link" onClick={handleViewMaster}>
                  🔗 View Master SOP (Admin Upload)
                </div>
              </div>

              {/* Match 3 - EVIDENCE CONTENT */}
              <div className="qa-match-section">
                <h4>3. Evidence Content (AI Scan)</h4>
                
                {isPackingList ? (
                  <div className="qa-match-row">
                    <span className="label">Extracted Quantity:</span>
                    <span className="value">500 Units (Sealed Cartons)</span>
                  </div>
                ) : (
                  <div className="qa-match-row">
                    <span className="label">Extracted Value:</span>
                    <span className="value">99.8% Purity</span>
                  </div>
                )}
                
                <div className="qa-check-grid">
                  <div className="qa-mini-check pass">
                    <span>Legible</span>
                  </div>
                  <div className="qa-mini-check pass">
                    <span>Signed</span>
                  </div>
                  <div className="qa-mini-check pass">
                    <span>Not Expired</span>
                  </div>
                </div>
              </div>

              <div className="qa-ai-summary">
                <span className="qa-label">Confidence Score</span>
                <div className="qa-score-bar">
                  <div className="qa-score-fill" style={{ width: `${currentDoc.aiInsights?.qualityScore || 95}%`, backgroundColor: getAIScoreColor(currentDoc.aiInsights?.qualityScore || 95) }}></div>
                </div>
                {currentDoc.aiInsights?.flag && (
                  <div className="qa-alert red">
                    <strong>⚠️ Alert:</strong> {currentDoc.aiInsights.flag}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* RIGHT PANEL - DECISION (Same as before) */}
          <div className="qa-panel right">
            <div className="qa-panel-header">✍️ Final Decision</div>
            
            <div className="qa-form">
              <label>Review Comments (Audit Trail)</label>
              <textarea 
                rows={4} 
                className="qa-input" 
                placeholder="Enter observations for the audit log..."
                value={comments}
                onChange={e => setComments(e.target.value)}
              />

              <div className="qa-divider"></div>

              <div className="qa-sig-section">
                <label>Electronic Signature</label>
                <p className="qa-hint">Enter your secure password to sign off. (Demo: <strong>password</strong>)</p>
                <input 
                  type="password" 
                  className="qa-input" 
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>

              {isProcessing ? (
                <div className="qa-loader-box">
                  <div className="qa-spinner"></div>
                  <span>{processStep}</span>
                </div>
              ) : (
                <div className="qa-actions">
                  <button className="qa-btn reject full" onClick={handleReject}>Reject</button>
                  <button className="qa-btn approve full" onClick={handleApprove}>Approve & Sign</button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    );
  };


  // --- MASTER DOC MODAL ---
  const renderMasterModal = () => {
    if (!currentDoc) return null;
    
    // Find master SOP for this product
    const masterSOP = masterSOPs.find(m => m.productId === currentDoc.productId && m.status === 'APPROVED');

    return (
      <div className="qa-modal-overlay" onClick={handleCloseMaster}>
        <div className="qa-modal" onClick={e => e.stopPropagation()}>
          <div className="qa-modal-header">
            <h3>📜 Master Document (Admin Upload)</h3>
            <button onClick={handleCloseMaster} className="qa-close-btn">✕</button>
          </div>
          <div className="qa-modal-content">
            <div className="pdf-page master">
              <div className="pdf-header-master">APPROVED MASTER</div>
              
              <div className="generic-master-doc">
                <div className="pdf-logo">PHARMA OPS HQ</div>
                <h2 style={{textAlign: 'center', borderBottom: '1px solid #000'}}>STANDARD OPERATING PROCEDURE</h2>
                
                {masterSOP ? (
                  // ACTUAL MASTER SOP FROM DATABASE
                  <div style={{margin: '20px 0'}}>
                    <p><strong>Title:</strong> {masterSOP.docType}</p>
                    <p><strong>File:</strong> {masterSOP.fileName}</p>
                    <p><strong>Path:</strong> {masterSOP.filePath}</p>
                    <p><strong>Status:</strong> {masterSOP.status}</p>
                    <p><strong>Uploaded:</strong> {masterSOP.createdAt ? new Date(masterSOP.createdAt).toLocaleDateString() : 'N/A'}</p>
                    <div style={{backgroundColor: '#f0f0f0', padding: '1rem', borderRadius: '4px', marginTop: '1rem'}}>
                      <strong>Note:</strong> This is the master SOP document uploaded by Admin. Vendors must ensure their submissions comply with this standard.
                    </div>
                  </div>
                ) : (
                  // NO MASTER SOP FOUND
                  <div style={{margin: '20px 0', padding: '1rem', backgroundColor: '#fffacd', borderRadius: '4px'}}>
                    <p><strong>⚠️ No Master SOP Found</strong></p>
                    <p>No approved master SOP has been uploaded for this product/document type.</p>
                  </div>
                )}
              </div>

              <div className="master-meta">
                {masterSOP ? (
                  <>
                    <p><strong>Doc ID:</strong> {masterSOP.id}</p>
                    <p><strong>Approved By:</strong> Admin</p>
                  </>
                ) : (
                  <>
                    <p><strong>Doc ID:</strong> N/A</p>
                    <p><strong>Approved By:</strong> N/A</p>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="qa-modal-footer">
            <button className="qa-btn secondary" onClick={handleCloseMaster}>Close</button>
          </div>
        </div>
      </div>
    );
  };


  // --- MAIN RENDER ---
  return (
    <>
      <style>{`
        /* FORCE FULL WIDTH */
        * { box-sizing: border-box; }
        body { margin: 0 !important; padding: 0 !important; overflow-x: hidden !important; }

        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        .qa-container {
          font-family: 'Inter', sans-serif;
          background-color: #f1f5f9;
          min-height: 100vh;
          color: #0f172a;
          box-sizing: border-box;
          width: 100vw !important;
          max-width: 100vw !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow-x: hidden;
        }
        .qa-container * { box-sizing: border-box; }

        .qa-header {
          background-color: #1e293b;
          color: white;
          padding: 0 2rem;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          width: 100% !important;
        }
        .qa-brand { font-size: 1.2rem; font-weight: 700; letter-spacing: 0.05em; }
        .qa-brand span { color: #38bdf8; } 
        .qa-user { display: flex; align-items: center; gap: 10px; font-size: 0.9rem; opacity: 0.9; }
        .qa-avatar { width: 30px; height: 30px; background: #38bdf8; color: #0f172a; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: 700; }

        .qa-main { max-width: none !important; width: 100% !important; margin: 0 !important; padding: 2rem !important; }

        .qa-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; }
        .qa-stat-card { background: white; padding: 1.2rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid transparent; display: flex; flex-direction: column; }
        .qa-stat-card.red { border-left-color: #ef4444; }
        .qa-stat-card.yellow { border-left-color: #f59e0b; }
        .qa-stat-card.green { border-left-color: #10b981; }
        .qa-stat-card.blue { border-left-color: #3b82f6; }
        .qa-stat-label { font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 6px; }
        .qa-stat-val { font-size: 1.8rem; font-weight: 700; color: #0f172a; line-height: 1; }
        .qa-stat-val small { font-size: 1rem; font-weight: 500; color: #94a3b8; margin-left: 4px; }

        .qa-section-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
        .qa-section-header h2 { margin: 0; font-size: 1.5rem; color: #334155; }
        .qa-badge-count { background: #e2e8f0; padding: 0.2rem 0.8rem; border-radius: 99px; font-size: 0.85rem; font-weight: 600; color: #475569; }

        .qa-card { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #e2e8f0; }
        .qa-table { width: 100%; border-collapse: collapse; text-align: left; }
        .qa-table th { background: #f8fafc; padding: 1rem 1.5rem; font-size: 0.75rem; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; font-weight: 600; }
        .qa-table td { padding: 1rem 1.5rem; border-bottom: 1px solid #f1f5f9; font-size: 0.9rem; color: #334155; vertical-align: middle; }
        .qa-row-hover { cursor: pointer; transition: background 0.15s; }
        .qa-row-hover:hover { background: #f8fafc; }
        
        .qa-doc-name { font-weight: 600; color: #0f172a; }
        .qa-doc-sub { font-size: 0.8rem; color: #64748b; }
        .qa-ai-pill { display: inline-block; padding: 0.2rem 0.6rem; border: 1px solid; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
        .qa-priority-badge { display: inline-block; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 700; border: 1px solid; text-transform: uppercase; }
        
        .align-right { text-align: right; }
        .text-gray { color: #94a3b8; font-size: 0.85rem; }
        .qa-empty { text-align: center; padding: 3rem; color: #94a3b8; }
        .font-medium { font-weight: 500; }

        .qa-workspace { height: 100%; display: flex; flex-direction: column; }
        .qa-ws-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .qa-ws-title { display: flex; align-items: center; gap: 1rem; }
        .qa-back-btn { background: none; border: none; color: #64748b; cursor: pointer; font-weight: 500; font-size: 0.9rem; }
        .qa-ws-title h1 { margin: 0; font-size: 1.25rem; color: #0f172a; }
        .qa-meta { font-size: 0.85rem; color: #64748b; }
        
        .qa-secure-box { position: relative; cursor: help; }
        .qa-secure-badge { background: #fff1f2; color: #be123c; border: 1px solid #fda4af; padding: 0.3rem 0.8rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 5px; }
        .qa-secure-tooltip {
          visibility: hidden;
          width: 250px;
          background-color: #333;
          color: #fff;
          text-align: left;
          border-radius: 6px;
          padding: 10px;
          position: absolute;
          z-index: 1;
          top: 125%;
          right: 0;
          opacity: 0;
          transition: opacity 0.3s;
          font-size: 0.75rem;
          line-height: 1.4;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .qa-secure-box:hover .qa-secure-tooltip { visibility: visible; opacity: 1; }

        .qa-ws-grid { display: grid; grid-template-columns: 5fr 3fr 3fr; gap: 1.5rem; height: 100%; }
        
        .qa-panel { background: white; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .qa-panel-header { padding: 0.8rem 1.2rem; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 0.85rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; }

        .qa-pdf-mock { flex: 1; background: #525659; display: flex; flex-direction: column; }
        .pdf-toolbar { background: #323639; color: #e2e8f0; padding: 0.5rem 1rem; display: flex; justify-content: space-between; font-size: 0.8rem; }
        .pdf-action { cursor: pointer; transition: color 0.2s; }
        .pdf-action:hover { color: #38bdf8; }
        .pdf-content { flex: 1; padding: 2rem; overflow-y: auto; display: flex; justify-content: center; }
        .pdf-page { background: white; width: 100%; max-width: 600px; height: 800px; box-shadow: 0 0 10px rgba(0,0,0,0.3); padding: 3rem; font-family: 'Times New Roman', serif; font-size: 0.9rem; position: relative; }
        .pdf-logo { font-weight: bold; font-size: 1.5rem; border-bottom: 2px solid black; margin-bottom: 1.5rem; padding-bottom: 0.5rem; }
        .pdf-row { margin-bottom: 0.5rem; }
        .pdf-row.highlight { background: #fef3c7; padding: 2px; } 
        .pdf-table { margin: 1rem 0; }
        .pdf-tr { display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding: 4px 0; font-size: 0.85rem; }
        .pdf-tr.highlight { background: #dcfce7; } 
        .pdf-sign { margin-top: 3rem; font-family: 'Courier New', monospace; border-top: 1px solid #000; display: inline-block; padding-top: 0.5rem; width: 200px; }

        .qa-panel.center { padding: 0; overflow-y: auto; }
        .qa-match-container { padding: 1.5rem; }
        .qa-match-section { margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px dashed #e2e8f0; }
        .qa-match-section h4 { margin: 0 0 0.8rem 0; font-size: 0.85rem; color: #334155; font-weight: 700; text-transform: uppercase; }
        .qa-match-row { display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.85rem; }
        .qa-match-row .label { color: #64748b; }
        .qa-match-row .value { font-weight: 600; color: #0f172a; }
        .qa-match-row .value.highlight { color: #16a34a; background: #dcfce7; padding: 0 4px; border-radius: 2px; }
        .qa-match-status { margin-top: 0.5rem; font-size: 0.8rem; font-weight: 600; padding: 0.4rem; border-radius: 4px; text-align: center; }
        .qa-match-status.pass { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
        .qa-match-status.fail { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
        
        .qa-link { color: #2563eb; font-size: 0.8rem; cursor: pointer; text-decoration: underline; margin-top: 0.5rem; font-weight: 600; }
        .qa-no-link { font-size: 0.8rem; color: #94a3b8; font-style: italic; margin-top: 0.5rem; }
        
        .qa-check-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem; margin-top: 0.5rem; }
        .qa-mini-check { font-size: 0.7rem; text-align: center; padding: 0.3rem; border-radius: 4px; font-weight: 600; }
        .qa-mini-check.pass { background: #dcfce7; color: #166534; }
        .qa-mini-check.fail { background: #fee2e2; color: #991b1b; }

        .qa-ai-summary { margin-top: 1rem; }
        .qa-label { display: block; font-size: 0.75rem; color: #64748b; margin-bottom: 4px; font-weight: 600; }
        .qa-score-bar { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin-bottom: 1rem; }
        .qa-score-fill { height: 100%; }
        
        .qa-alert { padding: 0.8rem; border-radius: 6px; font-size: 0.8rem; border-left: 4px solid; margin-top: 0.5rem; }
        .qa-alert.red { background: #fef2f2; border-color: #ef4444; color: #991b1b; }

        .qa-panel.right { padding: 1.5rem; display: flex; flex-direction: column; }
        .qa-form { flex: 1; display: flex; flex-direction: column; }
        .qa-input { width: 100%; padding: 0.8rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.9rem; margin-bottom: 1rem; font-family: inherit; }
        .qa-input:focus { outline: none; border-color: #38bdf8; box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.1); }
        .qa-divider { height: 1px; background: #e2e8f0; margin: 1rem 0; }
        .qa-hint { font-size: 0.75rem; color: #64748b; margin: -0.5rem 0 0.8rem 0; }
        
        .qa-sig-section { margin-top: 2rem; margin-bottom: 1.5rem; }
        .qa-sig-section label { display: block; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.9rem; }
        
        .qa-actions { margin-top: auto; display: flex; gap: 10px; }
        .qa-btn { padding: 0.6rem 1rem; border-radius: 6px; font-weight: 600; font-size: 0.85rem; cursor: pointer; border: none; transition: all 0.2s; }
        .qa-btn.secondary { background: white; border: 1px solid #cbd5e1; color: #334155; }
        .qa-btn.secondary:hover { background: #f1f5f9; border-color: #94a3b8; }
        .qa-btn.approve { background: #10b981; color: white; }
        .qa-btn.approve:hover { background: #059669; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.3); }
        .qa-btn.reject { background: #ef4444; color: white; }
        .qa-btn.reject:hover { background: #dc2626; box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.3); }
        .qa-btn.full { flex: 1; }

        .qa-loader-box { margin-top: auto; text-align: center; padding: 1rem; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; }
        .qa-spinner { width: 20px; height: 20px; border: 3px solid #e2e8f0; border-top: 3px solid #38bdf8; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 0.5rem auto; }
        .qa-loader-box span { font-size: 0.8rem; color: #64748b; font-weight: 500; }

        .qa-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 200; backdrop-filter: blur(3px); }
        .qa-modal { background: white; width: 800px; height: 85vh; border-radius: 8px; display: flex; flex-direction: column; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); animation: slideUp 0.3s ease-out; }
        .qa-modal-header { padding: 1rem 1.5rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
        .qa-modal-header h3 { margin: 0; font-size: 1.1rem; color: #334155; }
        .qa-close-btn { background: none; border: none; font-size: 1.2rem; color: #64748b; cursor: pointer; }
        .qa-modal-content { flex: 1; padding: 2rem; background: #525659; overflow-y: auto; display: flex; justify-content: center; }
        .qa-modal-footer { padding: 1rem; border-top: 1px solid #e2e8f0; text-align: right; background: white; }
        .pdf-page.master { box-shadow: 0 0 15px rgba(0,255,0,0.2); border: 2px solid #10b981; }
        .pdf-header-master { position: absolute; top: 10px; right: 10px; color: #10b981; font-weight: 900; border: 2px solid #10b981; padding: 5px; transform: rotate(-5deg); opacity: 0.3; font-size: 2rem; }

        .generic-master-doc { padding: 2rem; }
        .master-meta { font-size: 0.9rem; color: #333; background: #f0fdf4; padding: 1rem; border-radius: 6px; border: 1px solid #bbf7d0; margin-top: 2rem; }

        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .vd-animate-in { animation: fadeIn 0.3s ease-out forwards; }

        @media (max-width: 1024px) {
          .qa-ws-grid { grid-template-columns: 1fr 1fr; }
          .qa-panel.left { grid-column: span 2; height: 400px; }
        }
      `}</style>

      <div className="qa-container">
        <header className="qa-header">
          <div className="qa-brand">PharmaOps <span>QA</span></div>
          <div className="qa-user">
            <span>Dr. Pulashya Verma (QA Lead)</span>
            <div className="qa-avatar">P</div>
          </div>
        </header>

        <main className="qa-main">
          {selectedDoc ? renderWorkspace() : renderQueue()}
        </main>

        {showMasterDoc && renderMasterModal()}
      </div>
    </>
  );
};

export default QADashboard;