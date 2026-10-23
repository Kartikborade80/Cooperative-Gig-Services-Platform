import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { authAPI } from "../services/api";
import {
  User, Mail, Phone, MapPin, ShieldCheck, Zap,
  Lock, LogOut, X, CheckCircle2, AlertCircle, Plus,
  Home, Building, Navigation, Compass, Star
} from "lucide-react";

export const UserProfileModal = ({ onClose }) => {
  const { user, logout, refreshUser } = useAuth();
  
  // Tabs: "profile" | "addresses" | "subscription" | "security"
  const [activeTab, setActiveTab] = useState("profile");

  // Profile fields
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [altPhone, setAltPhone] = useState(user?.alt_phone || "");
  const [address, setAddress] = useState(user?.address || "");
  const [city, setCity] = useState(user?.city || "Kopargaon");
  const [district, setDistrict] = useState(user?.district || "Ahmednagar");
  const [pincode, setPincode] = useState(user?.pincode || "423601");
  const [lat, setLat] = useState(user?.lat || 19.8917);
  const [lon, setLon] = useState(user?.lon || 74.4795);

  // Address list
  const [addresses, setAddresses] = useState([]);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddrTitle, setNewAddrTitle] = useState("Home");
  const [newAddrLine, setNewAddrLine] = useState("");
  const [newAddrPincode, setNewAddrPincode] = useState("423601");
  const [newAddrDefault, setNewAddrDefault] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // States
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const res = await authAPI.getAddresses();
      setAddresses(res.data || []);
    } catch (err) {
      console.error("Failed to fetch addresses:", err);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await authAPI.updateProfile({
        full_name: fullName,
        phone,
        alt_phone: altPhone,
        address,
        city,
        district,
        pincode,
        lat: parseFloat(lat),
        lon: parseFloat(lon),
      });
      await refreshUser();
      setSuccessMsg("Profile information and location settings saved successfully!");
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || "Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleDetectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(parseFloat(pos.coords.latitude.toFixed(4)));
          setLon(parseFloat(pos.coords.longitude.toFixed(4)));
          setSuccessMsg("Current GPS location coordinates detected!");
        },
        () => {
          setErrorMsg("Could not detect location. Using Kopargaon default coordinates.");
        }
      );
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!newAddrLine) return;
    setLoading(true);
    setErrorMsg("");
    try {
      await authAPI.addAddress({
        title: newAddrTitle,
        address_line: newAddrLine,
        city,
        district,
        pincode: newAddrPincode,
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        is_default: newAddrDefault,
      });
      setNewAddrLine("");
      setShowAddAddress(false);
      await fetchAddresses();
      setSuccessMsg("New booking address added successfully!");
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || "Failed to add address.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefaultAddress = async (id) => {
    try {
      await authAPI.setDefaultAddress(id);
      await fetchAddresses();
      setSuccessMsg("Default address updated!");
    } catch (err) {
      setErrorMsg("Failed to update default address.");
    }
  };

  const handleDeleteAddress = async (id) => {
    try {
      await authAPI.deleteAddress(id);
      await fetchAddresses();
      setSuccessMsg("Address removed.");
    } catch (err) {
      setErrorMsg("Failed to delete address.");
    }
  };

  const handleToggleSubscription = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      await authAPI.toggleSubscription();
      await refreshUser();
      setSuccessMsg("Instant service priority subscription status updated!");
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || "Failed to update subscription.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMsg("New passwords do not match.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      await authAPI.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccessMsg("Password changed successfully!");
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || "Failed to change password. Verify your current password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content" style={{ maxWidth: "680px", maxHeight: "90vh", overflowY: "auto", borderRadius: "16px", padding: "24px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "800",
                fontSize: "1.2rem",
                boxShadow: "0 4px 10px rgba(5,150,105,0.25)",
              }}
            >
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 style={{ fontSize: "1.3rem", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                  {user?.full_name || "Cooperative User"}
                </h2>
                {user?.email_verified && (
                  <span
                    style={{
                      background: "#ecfdf5",
                      color: "#059669",
                      border: "1px solid #a7f3d0",
                      fontSize: "0.7rem",
                      fontWeight: "700",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                  >
                    <CheckCircle2 size={12} /> Email Verified
                  </span>
                )}
              </div>
              <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "2px" }}>
                {user?.email} · {user?.role}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="modal-close" style={{ position: "static" }}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: "flex",
            gap: "6px",
            borderBottom: "1px solid #e2e8f0",
            marginBottom: "20px",
            overflowX: "auto",
            paddingBottom: "2px",
          }}
        >
          {[
            { id: "profile", label: "Profile & Location", icon: User },
            { id: "addresses", label: "Booking Addresses", icon: MapPin },
            { id: "subscription", label: "Instant Service Pass", icon: Zap },
            { id: "security", label: "Security & Password", icon: Lock },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setActiveTab(id);
                setErrorMsg("");
                setSuccessMsg("");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "9px 14px",
                border: "none",
                background: "none",
                fontWeight: activeTab === id ? "700" : "500",
                fontSize: "0.86rem",
                color: activeTab === id ? "#059669" : "#64748b",
                borderBottom: activeTab === id ? "2px solid #059669" : "2px solid transparent",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        {/* Alerts */}
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

        {/* ── TAB 1: PROFILE & LOCATION ── */}
        {activeTab === "profile" && (
          <form onSubmit={handleSaveProfile}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email (Verified)</label>
                <input
                  type="email"
                  disabled
                  className="form-input"
                  value={user?.email || ""}
                  style={{ background: "#f8fafc", color: "#64748b", cursor: "not-allowed" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginTop: "12px" }}>
              <div className="form-group">
                <label className="form-label">Primary Mobile Number</label>
                <input
                  type="tel"
                  className="form-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91-98XXXXXXXX"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span>Alternative Contact Number</span>
                  <span style={{ color: "#059669", fontSize: "0.72rem", fontWeight: "700" }}>★ Faster Booking</span>
                </label>
                <input
                  type="tel"
                  className="form-input"
                  value={altPhone}
                  onChange={(e) => setAltPhone(e.target.value)}
                  placeholder="For faster & early booking dispatch"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: "12px" }}>
              <label className="form-label">Default Address Line</label>
              <input
                type="text"
                className="form-input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street name, building, apartment"
              />
            </div>

            {/* Location settings */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "14px",
                marginTop: "16px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#0f172a" }}>
                  📍 Cooperative Location Settings (20 KM Radius)
                </span>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  className="btn btn-secondary"
                  style={{ fontSize: "0.75rem", padding: "4px 8px", display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <Navigation size={12} /> Auto-Detect GPS
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "0.74rem", color: "#64748b" }}>City / Taluka</label>
                  <input
                    type="text"
                    className="form-input"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.74rem", color: "#64748b" }}>District</label>
                  <input
                    type="text"
                    className="form-input"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.74rem", color: "#64748b" }}>Pincode</label>
                  <input
                    type="text"
                    className="form-input"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "8px" }}>
                <div>
                  <label style={{ fontSize: "0.74rem", color: "#64748b" }}>Latitude Coordinates</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-input"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.74rem", color: "#64748b" }}>Longitude Coordinates</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-input"
                    value={lon}
                    onChange={(e) => setLon(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: "10px 24px" }}>
                {loading ? "Saving..." : "Save Profile & Location"}
              </button>
            </div>
          </form>
        )}

        {/* ── TAB 2: BOOKING ADDRESSES ── */}
        {activeTab === "addresses" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "#0f172a" }}>Saved Addresses for Booking</h3>
                <p style={{ fontSize: "0.8rem", color: "#64748b" }}>Select or add destinations for fast service booking dispatch</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddAddress(!showAddAddress)}
                className="btn btn-secondary"
                style={{ fontSize: "0.8rem", padding: "6px 12px", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <Plus size={14} /> {showAddAddress ? "Cancel" : "Add Address"}
              </button>
            </div>

            {/* Add Address Form */}
            {showAddAddress && (
              <form
                onSubmit={handleAddAddress}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #cbd5e1",
                  borderRadius: "10px",
                  padding: "16px",
                  marginBottom: "20px",
                }}
              >
                <h4 style={{ fontSize: "0.88rem", fontWeight: "700", marginBottom: "10px" }}>New Booking Address</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "10px", marginBottom: "10px" }}>
                  <div>
                    <label className="form-label" style={{ fontSize: "0.75rem" }}>Label</label>
                    <select
                      className="form-input"
                      value={newAddrTitle}
                      onChange={(e) => setNewAddrTitle(e.target.value)}
                    >
                      <option value="Home">Home</option>
                      <option value="Office">Office</option>
                      <option value="Workshop">Workshop</option>
                      <option value="Farm / Site">Farm / Site</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: "0.75rem" }}>Address Details</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={newAddrLine}
                      onChange={(e) => setNewAddrLine(e.target.value)}
                      placeholder="House / Flat, Landmark, Area"
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
                  <label style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={newAddrDefault}
                      onChange={(e) => setNewAddrDefault(e.target.checked)}
                    />
                    Set as default booking address
                  </label>
                  <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: "6px 16px", fontSize: "0.82rem" }}>
                    Save Address
                  </button>
                </div>
              </form>
            )}

            {/* Address List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {addresses.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px", color: "#64748b", background: "#f8fafc", borderRadius: "10px" }}>
                  No saved booking addresses yet. Add one above!
                </div>
              ) : (
                addresses.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      border: a.is_default ? "2px solid #059669" : "1px solid #e2e8f0",
                      borderRadius: "10px",
                      padding: "14px",
                      background: a.is_default ? "#f0fdf4" : "white",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontWeight: "700", color: "#0f172a" }}>{a.title}</span>
                        {a.is_default && (
                          <span
                            style={{
                              background: "#059669",
                              color: "white",
                              fontSize: "0.65rem",
                              fontWeight: "700",
                              padding: "2px 6px",
                              borderRadius: "6px",
                            }}
                          >
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.84rem", color: "#475569", marginTop: "3px" }}>
                        {a.address_line}, {a.city} - {a.pincode}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "6px" }}>
                      {!a.is_default && (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultAddress(a.id)}
                          className="btn btn-secondary"
                          style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                        >
                          Make Default
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(a.id)}
                        className="btn btn-ghost"
                        style={{ color: "#ef4444", fontSize: "0.75rem", padding: "4px 8px" }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: INSTANT SERVICE SUBSCRIPTION ── */}
        {activeTab === "subscription" && (
          <div>
            <div
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: "14px",
                padding: "20px",
                background: user?.has_instant_subscription ? "linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)" : "#ffffff",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <div
                    style={{
                      background: user?.has_instant_subscription ? "#059669" : "#f1f5f9",
                      color: user?.has_instant_subscription ? "white" : "#64748b",
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Zap size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: "#0f172a" }}>
                      Instant Priority Dispatch Pass
                    </h3>
                    <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
                      On-demand 15-minute priority matching & emergency guarantee
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    background: user?.has_instant_subscription ? "#059669" : "#e2e8f0",
                    color: user?.has_instant_subscription ? "white" : "#475569",
                    fontWeight: "800",
                    fontSize: "0.72rem",
                    padding: "4px 10px",
                    borderRadius: "12px",
                    textTransform: "uppercase",
                  }}
                >
                  {user?.has_instant_subscription ? "Active Pass" : "Not Subscribed"}
                </span>
              </div>

              <div style={{ marginTop: "18px", borderTop: "1px solid #e2e8f0", paddingTop: "14px" }}>
                <h4 style={{ fontSize: "0.85rem", fontWeight: "700", color: "#0f172a", marginBottom: "8px" }}>
                  Member Benefits Included:
                </h4>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.84rem", color: "#475569" }}>
                  <li style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <CheckCircle2 size={16} color="#059669" />
                    <strong>15-Minute Priority Matching:</strong> Requests skip standard queue to nearest verified worker.
                  </li>
                  <li style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <CheckCircle2 size={16} color="#059669" />
                    <strong>Zero Emergency Surge Fees:</strong> Guaranteed base cooperative tariff at all hours.
                  </li>
                  <li style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <CheckCircle2 size={16} color="#059669" />
                    <strong>Dedicated Cooperative Dispatch Officer:</strong> Direct helpline assistance for all requests.
                  </li>
                  <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <CheckCircle2 size={16} color="#059669" />
                    <strong>Early Booking Slot Reservation:</strong> Book high-demand slots up to 14 days in advance.
                  </li>
                </ul>
              </div>

              <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
                  {user?.has_instant_subscription
                    ? "Plan: ₹199 / month · Auto-renews · Cancel anytime"
                    : "Only ₹199 / month · Supports cooperative worker welfare fund"}
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleToggleSubscription}
                  className={`btn ${user?.has_instant_subscription ? "btn-secondary" : "btn-primary"}`}
                  style={{ padding: "8px 18px", fontSize: "0.88rem" }}
                >
                  {user?.has_instant_subscription ? "Deactivate Instant Pass" : "Subscribe to Instant Pass"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: SECURITY & PASSWORD ── */}
        {activeTab === "security" && (
          <div>
            <div style={{ marginBottom: "18px", padding: "12px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", fontSize: "0.85rem", color: "#0f172a" }}>
                <ShieldCheck size={18} color="#059669" /> Email Verification Status
              </div>
              <p style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "4px" }}>
                Your email <strong style={{ color: "#0f172a" }}>{user?.email}</strong> is officially verified via one-time security code (OTP).
              </p>
            </div>

            <form onSubmit={handleChangePassword}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#0f172a", marginBottom: "12px" }}>
                Change Password
              </h3>

              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label className="form-label">Current Password</label>
                <input
                  type="password"
                  required
                  className="form-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>

              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label className="form-label">New Password</label>
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

              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label">Confirm New Password</label>
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

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: "8px 20px" }}>
                  {loading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Bottom Actions: Logout */}
        <div
          style={{
            marginTop: "24px",
            borderTop: "1px solid #e2e8f0",
            paddingTop: "14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
            Account ID: #{user?.id} · Cooperative Gig Services Platform
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              onClose();
            }}
            className="btn btn-ghost"
            style={{ color: "#ef4444", display: "flex", alignItems: "center", gap: "6px", fontWeight: "700" }}
          >
            <LogOut size={16} /> Logout from Platform
          </button>
        </div>
      </div>
    </div>
  );
};
