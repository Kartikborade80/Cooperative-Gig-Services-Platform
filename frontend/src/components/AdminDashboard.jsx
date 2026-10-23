import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { coopAPI, workerAPI, bookingAPI, demandAPI, complaintAPI } from "../services/api";
import {
  Users, CheckCircle2, AlertTriangle, TrendingUp, 
  DollarSign, ShieldAlert, HeartHandshake, Eye, MapPin, 
  Check, X, RefreshCw
} from "lucide-react";

export const AdminDashboard = () => {
  const { user, t } = useAuth();
  const [activeTab, setActiveTab] = useState("verification");
  const [stats, setStats] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [forecastCategory, setForecastCategory] = useState("Plumbing");
  const [forecasts, setForecasts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [loading, setLoading] = useState(true);

  // Resolving complaint modal
  const [resolvingComplaint, setResolvingComplaint] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, workersRes, bookingsRes, complaintsRes, recsRes, heatRes] = await Promise.all([
        coopAPI.getStats(1),
        workerAPI.getAllWorkers(),
        bookingAPI.getBookings(),
        complaintAPI.getComplaints(),
        demandAPI.getRecommendations(),
        demandAPI.getHeatmap(),
      ]);
      setStats(statsRes.data);
      setWorkers(workersRes.data);
      setBookings(bookingsRes.data);
      setComplaints(complaintsRes.data);
      setRecommendations(recsRes.data);
      setHeatmap(heatRes.data);

      // Also trigger initial demand forecast for Plumbing
      runForecast("Plumbing");
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  const runForecast = async (catName) => {
    try {
      const res = await demandAPI.getForecast({
        service_category: catName,
        district: "Pune",
      });
      setForecasts(res.data);
      // Reload recommendations
      const recsRes = await demandAPI.getRecommendations();
      setRecommendations(recsRes.data);
    } catch (err) {
      console.error("Failed to run forecast:", err);
    }
  };

  const handleVerifyWorker = async (workerId, newStatus) => {
    try {
      await workerAPI.verifyWorker(workerId, {
        verification_status: newStatus,
        remarks: `Cooperative Admin manual review: ${newStatus}`,
      });
      alert(`Worker status updated to ${newStatus}`);
      // Refresh workers and stats
      const [wRes, sRes] = await Promise.all([workerAPI.getAllWorkers(), coopAPI.getStats(1)]);
      setWorkers(wRes.data);
      setStats(sRes.data);
    } catch (err) {
      alert("Verification update failed: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleActionRecommendation = async (recId, action) => {
    try {
      await demandAPI.actionRecommendation(recId, action);
      alert(`Recommendation #${recId} marked as ${action}D`);
      const recsRes = await demandAPI.getRecommendations();
      setRecommendations(recsRes.data);
    } catch (err) {
      alert("Failed to action recommendation.");
    }
  };

  const handleResolveComplaint = async (e) => {
    e.preventDefault();
    if (!resolvingComplaint) return;
    try {
      await complaintAPI.resolveComplaint(resolvingComplaint.id, resolutionNotes);
      alert("Grievance marked as Resolved.");
      setResolvingComplaint(null);
      setResolutionNotes("");
      const cRes = await complaintAPI.getComplaints();
      setComplaints(cRes.data);
    } catch (err) {
      alert("Failed to resolve grievance.");
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "60px" }}>Loading Cooperative Admin Dashboard...</div>;
  }

  const m = stats?.metrics;

  return (
    <div>
      {/* Top Federation Header */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: "800", color: "#0f172a" }}>
              Cooperative Society Administration
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
              {stats?.cooperative?.name} • Reg: {stats?.cooperative?.registration_no}
            </p>
          </div>

          <button onClick={loadAllAdminData} className="btn btn-secondary">
            <RefreshCw size={16} /> Refresh Analytics
          </button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid-4" style={{ marginBottom: "24px" }}>
        <div className="card">
          <div style={{ color: "#2563eb", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", fontWeight: "700" }}>
            <Users size={18} /> Total Registered Workers
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#0f172a", marginTop: "6px" }}>
            {m?.total_workers || 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
            {m?.verified_workers || 0} Verified • {m?.pending_verification || 0} Pending
          </div>
        </div>

        <div className="card">
          <div style={{ color: "#059669", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", fontWeight: "700" }}>
            <TrendingUp size={18} /> Total Service Volume
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#059669", marginTop: "6px" }}>
            ₹{m?.total_transaction_value || 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#047857" }}>
            Worker Payouts: ₹{m?.total_worker_earnings || 0} (95%)
          </div>
        </div>

        <div className="card">
          <div style={{ color: "#f59e0b", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", fontWeight: "700" }}>
            <HeartHandshake size={18} /> Coop Welfare Pool Fund
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#f59e0b", marginTop: "6px" }}>
            ₹{m?.welfare_pool_total || 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#92400e" }}>
            Coop Ops Fee: ₹{m?.cooperative_fee_collected || 0} (5%)
          </div>
        </div>

        <div className="card">
          <div style={{ color: "#ef4444", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", fontWeight: "700" }}>
            <ShieldAlert size={18} /> Emergency Dispatches
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#ef4444", marginTop: "6px" }}>
            {m?.emergency_bookings || 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#991b1b" }}>
            Total Bookings: {m?.total_bookings || 0}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid #cbd5e1", marginBottom: "20px", overflowX: "auto" }}>
        {[
          { id: "verification", label: `Worker Verification (${m?.pending_verification || 0})` },
          { id: "forecast", label: "AI Demand Forecast & Shortages" },
          { id: "recommendations", label: `Workforce Recommendations (${recommendations.filter(r => r.status === "PENDING").length})` },
          { id: "heatmap", label: "Demand Heatmap" },
          { id: "bookings", label: `Live Bookings (${bookings.length})` },
          { id: "complaints", label: `Grievances (${complaints.filter(c => c.status === "OPEN").length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "10px 18px",
              background: "none",
              border: "none",
              borderBottom: activeTab === tab.id ? "3px solid #059669" : "3px solid transparent",
              fontWeight: activeTab === tab.id ? "700" : "500",
              color: activeTab === tab.id ? "#059669" : "#64748b",
              cursor: "pointer",
              fontSize: "0.9rem",
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: WORKER VERIFICATION */}
      {activeTab === "verification" && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 className="card-title">Worker Membership & Verification Queue</h3>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
              Only VERIFIED workers appear in customer searches
            </span>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Worker Name</th>
                  <th>Service Area</th>
                  <th>Skills & Certifications</th>
                  <th>Experience</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <div style={{ fontWeight: "700" }}>{w.full_name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{w.email} • {w.phone}</div>
                    </td>
                    <td>{w.service_area}</td>
                    <td>
                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                        {w.skills.map((s, idx) => (
                          <span key={idx} className="badge badge-blue" style={{ fontSize: "0.7rem" }}>
                            {s.skill_name} ({s.proficiency_level})
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>{w.experience_years} years</td>
                    <td>
                      {w.verification_status === "VERIFIED" && <span className="badge badge-green">VERIFIED</span>}
                      {w.verification_status === "PENDING_VERIFICATION" && <span className="badge badge-yellow">PENDING REVIEW</span>}
                      {w.verification_status === "REJECTED" && <span className="badge badge-red">REJECTED</span>}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        {w.verification_status !== "VERIFIED" && (
                          <button
                            onClick={() => handleVerifyWorker(w.id, "VERIFIED")}
                            className="btn btn-primary"
                            style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                          >
                            <Check size={14} /> Approve & Verify
                          </button>
                        )}
                        {w.verification_status !== "REJECTED" && (
                          <button
                            onClick={() => handleVerifyWorker(w.id, "REJECTED")}
                            className="btn btn-secondary"
                            style={{ padding: "4px 10px", fontSize: "0.75rem", color: "#ef4444" }}
                          >
                            <X size={14} /> Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: AI DEMAND FORECAST */}
      {activeTab === "forecast" && (
        <div>
          <div className="card" style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h3 className="card-title">AI Demand Forecasting Engine</h3>
                <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
                  Trained Ridge regression model on historical service volume, emergency ratios, and seasonal days.
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <select
                  className="form-select"
                  value={forecastCategory}
                  onChange={(e) => {
                    setForecastCategory(e.target.value);
                    runForecast(e.target.value);
                  }}
                  style={{ width: "220px" }}
                >
                  <option value="Plumbing">Plumbing</option>
                  <option value="Electrical">Electrical</option>
                  <option value="AC & Appliance Repair">AC & Appliance Repair</option>
                  <option value="Carpentry">Carpentry</option>
                  <option value="Cleaning & Sanitation">Cleaning & Sanitation</option>
                </select>

                <button onClick={() => runForecast(forecastCategory)} className="btn btn-primary">
                  Re-train Model
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <h4 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "14px" }}>
              7-Day Ahead Booking Demand Prediction vs Available Workers
            </h4>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Target Date</th>
                    <th>Category</th>
                    <th>District</th>
                    <th>Predicted Demand</th>
                    <th>Available Workers</th>
                    <th>Status</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {forecasts.map((f, idx) => (
                    <tr key={idx} style={{ background: f.shortage_detected ? "#fff1f2" : "transparent" }}>
                      <td style={{ fontWeight: "700" }}>{f.target_date}</td>
                      <td>{f.service_category}</td>
                      <td>{f.district}</td>
                      <td style={{ fontWeight: "800", fontSize: "1.05rem" }}>{f.predicted_demand} jobs</td>
                      <td style={{ fontWeight: "600" }}>{f.available_workers} workers</td>
                      <td>
                        {f.shortage_detected ? (
                          <span className="badge badge-red" style={{ display: "inline-flex", gap: "4px" }}>
                            <AlertTriangle size={12} /> SHORTAGE DETECTED
                          </span>
                        ) : (
                          <span className="badge badge-green">SUFFICIENT</span>
                        )}
                      </td>
                      <td>{(f.confidence_score * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: WORKFORCE ALLOCATION RECOMMENDATIONS */}
      {activeTab === "recommendations" && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "6px" }}>
            Cooperative Workforce Allocation Recommendations
          </h3>
          <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "16px" }}>
            Automated recommendations generated by the AI forecasting engine when capacity deficits are detected.
          </p>

          {recommendations.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
              No active shortage recommendations. Worker supply is balanced.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {recommendations.map((rec) => (
                <div key={rec.id} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px", background: rec.status === "PENDING" ? "#fffbeb" : "#f8fafc" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div>
                      <h4 style={{ fontWeight: "700", color: "#0f172a" }}>{rec.title}</h4>
                      <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                        Generated: {new Date(rec.created_at).toLocaleString()}
                      </div>
                    </div>

                    <span className={`badge ${rec.status === "APPROVED" ? "badge-green" : rec.status === "REJECTED" ? "badge-red" : "badge-yellow"}`}>
                      {rec.status}
                    </span>
                  </div>

                  <p style={{ fontSize: "0.88rem", color: "#334155", lineHeight: "1.5" }}>
                    {rec.recommendation_text}
                  </p>

                  {rec.status === "PENDING" && (
                    <div style={{ display: "flex", gap: "10px", marginTop: "12px", justifyContent: "flex-end" }}>
                      <button
                        onClick={() => handleActionRecommendation(rec.id, "REJECT")}
                        className="btn btn-secondary"
                        style={{ padding: "6px 14px", fontSize: "0.8rem", color: "#ef4444" }}
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleActionRecommendation(rec.id, "APPROVE")}
                        className="btn btn-primary"
                        style={{ padding: "6px 14px", fontSize: "0.8rem" }}
                      >
                        Approve & Dispatch Mobilization
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: DEMAND HEATMAP */}
      {activeTab === "heatmap" && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "6px" }}>
            Urban Demand Density Heatmap (Pune Region)
          </h3>
          <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "16px" }}>
            Live demand density classification across administrative wards: Red (High Demand / Surge), Orange (Medium), Green (Normal).
          </p>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ward / Urban District</th>
                  <th>Service Category</th>
                  <th>Weekly Volume</th>
                  <th>Demand Level</th>
                </tr>
              </thead>
              <tbody>
                {heatmap.map((h, idx) => (
                  <tr key={idx}>
                    <td>
                      <div style={{ fontWeight: "700" }}>{h.district}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Lat: {h.lat}, Lon: {h.lon}</div>
                    </td>
                    <td>{h.category}</td>
                    <td style={{ fontWeight: "700" }}>{h.demand} requests</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: h.status === "HIGH" ? "#fee2e2" : h.status === "MEDIUM" ? "#ffedd5" : "#ecfdf5",
                          color: h.status === "HIGH" ? "#b91c1c" : h.status === "MEDIUM" ? "#c2410c" : "#047857",
                          border: `1px solid ${h.color}`
                        }}
                      >
                        ● {h.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: LIVE BOOKINGS */}
      {activeTab === "bookings" && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "16px" }}>
            Citywide Service Bookings Monitor ({bookings.length})
          </h3>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Customer</th>
                  <th>Worker</th>
                  <th>Service</th>
                  <th>Status</th>
                  <th>Total Amount</th>
                  <th>Split Breakdown</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <span style={{ fontWeight: "700" }}>{b.booking_ref}</span>
                      {b.is_emergency && <span className="badge badge-red" style={{ fontSize: "0.65rem", marginLeft: "4px" }}>EMERGENCY</span>}
                    </td>
                    <td>{b.customer_name}</td>
                    <td>{b.worker_name || "Unassigned"}</td>
                    <td>{b.service_name}</td>
                    <td><span className="badge badge-blue">{b.status}</span></td>
                    <td style={{ fontWeight: "700" }}>₹{b.total_amount}</td>
                    <td style={{ fontSize: "0.75rem" }}>
                      Worker: ₹{b.worker_earnings} (95%) • Coop: ₹{b.coop_fee} (5%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: COMPLAINTS & GRIEVANCES */}
      {activeTab === "complaints" && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "16px" }}>
            Customer Grievance & Ombudsman Redressal ({complaints.length})
          </h3>

          {complaints.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
              No grievances filed. Service quality is running smoothly!
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map((c) => (
                    <tr key={c.id}>
                      <td>{c.customer_name}</td>
                      <td style={{ fontWeight: "600" }}>{c.category}</td>
                      <td style={{ maxWidth: "280px" }}>{c.description}</td>
                      <td>
                        <span className={`badge ${c.priority === "High" ? "badge-red" : "badge-yellow"}`}>
                          {c.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${c.status === "RESOLVED" ? "badge-green" : "badge-red"}`}>
                          {c.status}
                        </span>
                      </td>
                      <td>
                        {c.status !== "RESOLVED" && (
                          <button
                            onClick={() => setResolvingComplaint(c)}
                            className="btn btn-primary"
                            style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                          >
                            Resolve Grievance
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Resolve Complaint Modal */}
      {resolvingComplaint && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "460px" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "8px" }}>
              Resolve Grievance #{resolvingComplaint.id}
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "14px" }}>
              Customer: {resolvingComplaint.customer_name} • Category: {resolvingComplaint.category}
            </p>

            <form onSubmit={handleResolveComplaint}>
              <div className="form-group">
                <label className="form-label">Ombudsman Resolution Notes</label>
                <textarea
                  className="form-input"
                  rows={4}
                  required
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Worker counseled, partial material refund credited, customer satisfied..."
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                <button
                  type="button"
                  onClick={() => setResolvingComplaint(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Confirm Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
