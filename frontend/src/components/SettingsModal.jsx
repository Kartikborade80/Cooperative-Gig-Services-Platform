import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { authAPI } from "../services/api";
import {
  Settings, User, ShieldCheck, Lock, Globe,
  CheckCircle2, AlertCircle, X, Shield, ArrowRight
} from "lucide-react";

export const SettingsModal = ({ onClose, onOpenProfile }) => {
  const { user, lang, changeLanguage, refreshUser } = useAuth();

  // Settings sections: "account" | "security" | "preferences"
  const [activeSection, setActiveSection] = useState("account");

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMsg("New passwords do not match.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await authAPI.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccessMsg("Password updated successfully!");
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || "Failed to update password. Check your current password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div
        className="modal-content"
        style={{
          maxWidth: "600px",
          maxHeight: "90vh",
          overflowY: "auto",
          borderRadius: "16px",
          padding: "24px",
        }}
      >
        <button onClick={onClose} className="modal-close" style={{ position: "absolute", top: "18px", right: "18px" }}>
          <X size={20} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <div
            style={{
              background: "#f1f5f9",
              padding: "10px",
              borderRadius: "12px",
              color: "#0f172a",
              display: "flex",
            }}
          >
            <Settings size={26} />
          </div>
          <div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: "800", color: "#0f172a", margin: 0 }}>
              Settings & Account Management
            </h2>
            <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "2px 0 0 0" }}>
              Authentication, security, profile, and cooperative preferences
            </p>
          </div>
        </div>

        {/* Section Navigation */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            borderBottom: "1px solid #e2e8f0",
            marginBottom: "18px",
            paddingBottom: "4px",
          }}
        >
          {[
            { id: "account", label: "Account Management", icon: User },
            { id: "security", label: "Security & Password", icon: ShieldCheck },
            { id: "preferences", label: "Preferences", icon: Globe },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setActiveSection(id);
                setErrorMsg("");
                setSuccessMsg("");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 12px",
                border: "none",
                background: "none",
                fontSize: "0.84rem",
                fontWeight: activeSection === id ? "700" : "500",
                color: activeSection === id ? "#059669" : "#64748b",
                borderBottom: activeSection === id ? "2px solid #059669" : "2px solid transparent",
                cursor: "pointer",
              }}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* Feedback alerts */}
        {errorMsg && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "0.84rem",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              color: "#065f46",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "0.84rem",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <CheckCircle2 size={16} /> {successMsg}
          </div>
        )}

        {/* ── SECTION 1: ACCOUNT MANAGEMENT ── */}
        {activeSection === "account" && (
          <div>
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "16px",
              }}
            >
              <h3 style={{ fontSize: "0.9rem", fontWeight: "700", color: "#0f172a", marginBottom: "12px" }}>
                Account Overview
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "0.84rem" }}>
                <div>
                  <span style={{ color: "#64748b" }}>Member ID:</span>
                  <div style={{ fontWeight: "700", color: "#0f172a" }}>#{user?.id}</div>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Account Role:</span>
                  <div style={{ fontWeight: "700", color: "#0f172a" }}>{user?.role}</div>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Registered Email:</span>
                  <div style={{ fontWeight: "700", color: "#0f172a" }}>{user?.email}</div>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Account Status:</span>
                  <div style={{ fontWeight: "700", color: "#059669" }}>● Active & Authenticated</div>
                </div>
              </div>
            </div>

            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h4 style={{ fontSize: "0.88rem", fontWeight: "700", color: "#0f172a" }}>Profile Information</h4>
                <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "2px 0 0 0" }}>
                  Manage addresses, phone numbers, and 20 KM location coordinates
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenProfile) onOpenProfile();
                }}
                className="btn btn-secondary"
                style={{ fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "4px" }}
              >
                Open Profile <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── SECTION 2: SECURITY & PASSWORD ── */}
        {activeSection === "security" && (
          <div>
            {/* Email Verification Status */}
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "10px",
                padding: "14px",
                marginBottom: "18px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle2 size={18} color="#059669" />
                <span style={{ fontSize: "0.88rem", fontWeight: "700", color: "#065f46" }}>
                  Email Verification Status: VERIFIED
                </span>
              </div>
              <p style={{ fontSize: "0.8rem", color: "#047857", margin: "4px 0 0 26px" }}>
                Your account email <strong>{user?.email}</strong> is confirmed via one-time passcodes. All logins and password resets are secured through OTP validation.
              </p>
            </div>

            {/* Password Management */}
            <form onSubmit={handleChangePassword}>
              <h3 style={{ fontSize: "0.92rem", fontWeight: "700", color: "#0f172a", marginBottom: "12px" }}>
                Password Management
              </h3>

              <div className="form-group" style={{ marginBottom: "10px" }}>
                <label className="form-label" style={{ fontSize: "0.8rem" }}>Current Password</label>
                <input
                  type="password"
                  required
                  className="form-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>

              <div className="form-group" style={{ marginBottom: "10px" }}>
                <label className="form-label" style={{ fontSize: "0.8rem" }}>New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div className="form-group" style={{ marginBottom: "14px" }}>
                <label className="form-label" style={{ fontSize: "0.8rem" }}>Confirm New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                />
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: "8px 18px", fontSize: "0.84rem" }}>
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>
        )}

        {/* ── SECTION 3: PREFERENCES ── */}
        {activeSection === "preferences" && (
          <div>
            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label className="form-label" style={{ fontSize: "0.82rem", fontWeight: "600" }}>
                Platform Language
              </label>
              <select
                className="form-input"
                value={lang}
                onChange={(e) => changeLanguage(e.target.value)}
              >
                <option value="en">English (Default)</option>
                <option value="mr">मराठी (Marathi)</option>
                <option value="hi">हिन्दी (Hindi)</option>
              </select>
            </div>

            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "14px",
                fontSize: "0.82rem",
                color: "#64748b",
              }}
            >
              <div style={{ fontWeight: "700", color: "#0f172a", marginBottom: "4px" }}>
                Operational Radius Policy
              </div>
              Service matching is strictly restricted to workers within a <strong>20 KM radius</strong> of Kopargaon to enforce localized cooperative employment and rapid response times.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
