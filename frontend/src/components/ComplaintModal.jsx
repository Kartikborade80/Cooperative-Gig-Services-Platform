import React, { useState } from "react";
import { complaintAPI } from "../services/api";
import { AlertCircle, X } from "lucide-react";

export const ComplaintModal = ({ booking, onClose, onSuccess }) => {
  const [category, setCategory] = useState("Service Quality");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await complaintAPI.createComplaint({
        booking_id: booking?.id || null,
        category,
        description,
        priority,
      });
      alert("Grievance filed successfully. Cooperative Admin will review within 24 hours.");
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to submit grievance.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "480px" }}>
        <button onClick={onClose} className="modal-close"><X size={18} /></button>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <div style={{ background: "#fee2e2", color: "#ef4444", padding: "10px", borderRadius: "10px" }}>
            <AlertCircle size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: "700", color: "#0f172a" }}>Cooperative Grievance Redressal</h3>
            <p style={{ fontSize: "0.82rem", color: "#64748b" }}>Direct report to Cooperative Society Ombudsman</p>
          </div>
        </div>

        {error && (
          <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px", borderRadius: "6px", fontSize: "0.85rem", marginBottom: "14px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="Service Quality">Work Quality / Incomplete Work</option>
              <option value="Overcharging / Pricing Dispute">Pricing / Extra Material Charge</option>
              <option value="Delay / Unpunctual">Unexplained Delay</option>
              <option value="Worker Conduct">Worker Conduct & Behavior</option>
              <option value="Other">Other Issues</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Priority</label>
            <select className="form-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="Low">Low (Informational)</option>
              <option value="Medium">Medium (Normal resolution)</option>
              <option value="High">High (Immediate intervention)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Grievance Description</label>
            <textarea
              className="form-input"
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide specific details of the issue..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-navy"
            style={{ width: "100%", padding: "12px", fontSize: "1rem" }}
          >
            {loading ? "Filing Grievance..." : "Submit Grievance to Cooperative"}
          </button>
        </form>
      </div>
    </div>
  );
};
