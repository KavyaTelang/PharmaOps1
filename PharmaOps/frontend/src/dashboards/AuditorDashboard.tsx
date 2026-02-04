import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';

const AuditorDashboard = () => {
  const {
    auditLogs,
    documents,
    orders,
    getOrderTimeline,
    getProductById,
  } = useAppContext();

  // Navigation state
  const [currentPage, setCurrentPage] = useState('logs');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<typeof auditLogs[0] | null>(null);

  const approvedDocs = documents.filter(d => d.status === 'APPROVED');

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

  const renderLogs = () => {
    const filteredLogs = auditLogs.filter(log => {
      const matchesSearch = 
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.actor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.entity.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRole = filterRole === 'ALL' || log.actor.role === filterRole;

      return matchesSearch && matchesRole;
    });

    return (
      <>
        <div className="au-stats-section">
          <div className="au-stat-card">
            <div className="au-stat-icon-circle">
              <img src="total-logs.png" alt="icon" style={{width: '60px', height: '50px'}} />
            </div>
            <div className="au-stat-label">Total Logs</div>
            <div className="au-stat-value">{auditLogs.length}</div>
          </div>
          <div className="au-stat-card">
            <div className="au-stat-icon-circle">
              <img src="verified-docs.png" alt="icon" style={{width: '45px', height: '45px'}} />
            </div>
            <div className="au-stat-label">Verified Docs</div>
            <div className="au-stat-value">{approvedDocs.length}</div>
          </div>
          <div className="au-stat-card">
            <div className="au-stat-icon-circle">
              <img src="total-orders.png" alt="icon" style={{width: '45px', height: '45px'}} />
            </div>
            <div className="au-stat-label">Total Orders</div>
            <div className="au-stat-value">{orders.length}</div>
          </div>
          <div className="au-stat-card">
            <div className="au-stat-icon-circle">
              <img src="filtered-docs.png" alt="icon" style={{width: '40px', height: '45px'}} />
            </div>
            <div className="au-stat-label">Filtered Logs</div>
            <div className="au-stat-value">{filteredLogs.length}</div>
          </div>
        </div>

        <div className="au-card">
          <div className="au-card-header">
            <h3> Audit Trail Logs</h3>
          </div>
          <div className="au-toolbar">
            <input 
              type="text" 
              className="au-search" 
              placeholder="🔍 Search logs by User, Action, or ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select className="au-select" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="QA">QA</option>
              <option value="VENDOR">Vendor</option>
              <option value="SYSTEM">System</option>
            </select>
          </div>

          <div className="au-table-wrapper">
            <table className="au-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity Affected</th>
                  <th>Immutable Proof</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, index) => (
                  <tr key={log.id}>
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
                  </tr>
                ))}
                {filteredLogs.length === 0 && <tr><td colSpan={5} style={{textAlign: 'center', padding: '3rem', color: '#9ca3af'}}>No logs found matching criteria.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  const renderReports = () => (
    <div className="au-card narrow">
      <div className="au-card-header">
        <h3>📊 Generate Compliance Report</h3>
      </div>
      <div className="au-card-body">
        <div className="au-form-group">
          <label>Report Type</label>
          <select className="au-select full">
            <option>Full Audit Trail (All Actions)</option>
            <option>User Activity Report</option>
            <option>Order Lifecycle Summary</option>
            <option>Document Compliance Report</option>
          </select>
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
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0 !important; padding: 0 !important; font-family: 'Poppins', sans-serif; overflow-x: hidden; }

        .au-container {
          display: flex;
          min-height: 100vh;
          width: 100vw;
          background: linear-gradient(180deg, #d8dcfc 0%, #f5f7fa 35%);
        }

        .au-sidebar {
          width: 260px;
          background: linear-gradient(180deg, #d8dcfc 0%, #f5f7fa 35%);
          display: flex;
          flex-direction: column;
          position: fixed;
          height: 100vh;
          left: 0;
          top: 0;
          z-index: 100;
          transition: transform 0.3s ease;
        }

        .au-sidebar.closed { transform: translateX(-260px); }

        .au-menu-toggle {
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

        .au-menu-toggle:hover { background: #2a3442; transform: scale(1.05); }
        .au-menu-toggle.sidebar-open { left: 275px; }

        .au-sidebar-header { padding: 1.5rem 1.25rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
        .au-logo { font-size: 1.25rem; font-weight: 700; color: #1f2937; }

        .au-nav { flex: 1; padding: 1rem 0; overflow-y: auto; }
        .au-nav-item {
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

        .au-nav-item:hover { background: rgba(255, 255, 255, 0.05); color: #713ed0; }
        .au-nav-item.active { background: rgba(59, 130, 246, 0.1); color: #00142d; border-left-color: #001230; }
        .au-nav-icon { font-size: 1.1rem; width: 20px; text-align: center; }

        .au-sidebar-footer { padding: 1.25rem; border-top: 1px solid rgba(255, 255, 255, 0.1); }
        .au-profile {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 6px;
          transition: background 0.2s;
        }

        .au-profile:hover { background: rgba(255, 255, 255, 0.05); }
        .au-profile-avatar {
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

        .au-profile-name { font-size: 0.9rem; font-weight: 500; color: #1f2937; }
        .au-profile-role { font-size: 0.75rem; color: #1f2937; }

        .au-main {
          flex: 1;
          margin-left: 260px;
          padding: 5rem 2rem 2rem 2rem;
          transition: all 0.3s ease;
          overflow-x: hidden;
          min-height: 100vh;
          box-sizing: border-box;
          background: linear-gradient(180deg, #d8dcfc 0%, #f5f7fa 35%);
        }

        .au-main.sidebar-closed { margin-left: 0; }

        .au-stats-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .au-stat-card {
          padding: 1.75rem;
          border-radius: 20px;
          border: none;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .au-stat-card:hover { transform: translateY(-5px); box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12); }
        .au-stat-card:nth-child(1) { background: linear-gradient(180deg, #fecaca 0%, #fef2f2 100%); }
        .au-stat-card:nth-child(2) { background: linear-gradient(180deg, #fed7aa 0%, #fef3c7 100%); }
        .au-stat-card:nth-child(3) { background: linear-gradient(180deg, #d1fae5 0%, #ecfdf5 100%); }
        .au-stat-card:nth-child(4) { background: linear-gradient(180deg, #dbeafe 0%, #eff6ff 100%); }

        .au-stat-icon-circle {
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

        .au-stat-label {
          font-size: 0.75rem;
          color: #4a5568;
          font-weight: 600;
          margin-bottom: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .au-stat-value {
          font-size: 2.5rem;
          font-weight: 700;
          color: #1a202c;
          line-height: 1;
          margin-bottom: 0.5rem;
        }

        .au-card {
          background: white;
          border-radius: 16px;
          border: none;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
          transition: all 0.3s ease;
          margin-bottom: 2rem;
        }

        .au-card:hover { box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1); }
        .au-card.narrow { max-width: 600px; margin: 0 auto; }

        .au-card-header {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #f3f4f6;
          background: #fafbfc;
        }

        .au-card-header h3 { font-size: 1rem; font-weight: 600; color: #1f2937; margin: 0; }

        .au-card-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }

        .au-toolbar {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .au-search {
          flex: 1;
          min-width: 250px;
          padding: 0.75rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          font-size: 0.9rem;
          transition: all 0.2s;
          background: #f9fafb;
        }

        .au-search:focus {
          outline: none;
          border-color: #667eea;
          background: white;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .au-select {
          padding: 0.75rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          font-size: 0.9rem;
          background: #f9fafb;
          cursor: pointer;
        }

        .au-select.full { width: 100%; }

        .au-table-wrapper { overflow-x: auto; }
        .au-table { width: 100%; border-collapse: collapse; }
        .au-table th {
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

        .au-table td {
          padding: 1rem;
          border-bottom: 1px solid #f3f4f6;
          font-size: 0.9rem;
          color: #1f2937;
        }

        .au-table tbody tr { cursor: pointer; transition: background 0.2s; }
        .au-table tbody tr:hover { background: #f9fafb; }

        .au-mono { font-family: 'Courier New', monospace; font-size: 0.8rem; color: #475569; }
        .au-actor-name { font-weight: 600; color: #0f172a; }
        .au-actor-role { font-size: 0.7rem; color: #64748b; }
        
        .au-tag {
          display: inline-block;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          border: 1px solid;
        }

        .au-tag.action { background: #f1f5f9; border-color: #e2e8f0; color: #334155; }
        
        .au-hash {
          color: #2563eb;
          cursor: help;
          font-family: 'Courier New', monospace;
          font-size: 0.75rem;
          background: #eff6ff;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .au-no-hash { color: #94a3b8; }

        .au-form-group { margin-bottom: 1.5rem; }
        .au-form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          font-size: 0.9rem;
          color: #334155;
        }

        .au-btn {
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          border: none;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.3s ease;
        }

        .au-btn.primary {
          background: linear-gradient(135deg, #000d45 0%, #000d45 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .au-btn.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .au-btn.full { width: 100%; }

        @media (max-width: 768px) {
          .au-sidebar { transform: translateX(-260px); }
          .au-main { margin-left: 0; padding: 1rem; }
          .au-stats-section { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="au-container">
        <button 
          className={`au-menu-toggle ${sidebarOpen ? 'sidebar-open' : ''}`}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>

        <div className={`au-sidebar ${!sidebarOpen ? 'closed' : ''}`}>
          <div className="au-sidebar-header">
            <div className="au-logo">MedSupply Auditor</div>
          </div>

          <nav className="au-nav">
            <div 
              className={`au-nav-item ${currentPage === 'logs' ? 'active' : ''}`}
              onClick={() => setCurrentPage('logs')}
            >
              <span className="au-nav-icon"></span>
              <span>Action Logs</span>
            </div>
            <div 
              className={`au-nav-item ${currentPage === 'reports' ? 'active' : ''}`}
              onClick={() => setCurrentPage('reports')}
            >
              <span className="au-nav-icon"></span>
              <span>Reports</span>
            </div>
          </nav>

          <div className="au-sidebar-footer">
            <div className="au-profile">
              <div className="au-profile-avatar">E</div>
              <div>
                <div className="au-profile-name">External Inspector</div>
                <div className="au-profile-role">Auditor</div>
              </div>
            </div>
          </div>
        </div>

        <main className={`au-main ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
          {currentPage === 'logs' && renderLogs()}
          {currentPage === 'reports' && renderReports()}
        </main>
      </div>
    </>
  );
};

export default AuditorDashboard;