import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { authAPI } from "../services/api";
import {
  Wrench, Mail, Lock, Phone, User, MapPin,
  ShieldCheck, AlertCircle, CheckCircle2, X,
  Briefcase, FileText, Check, Navigation, AlertTriangle
} from "lucide-react";

const AVAILABLE_CATEGORIES = [
  "Plumbing",
  "Electrician",
  "Carpentry",
  "Painting",
  "Cleaning",
  "Appliance Repair",
  "AC Service",
  "Gardening",
  "Packers & Movers",
  "Security"
];

export const WorkerRegistrationModal = ({ onClose }) => {
  const { registerWorker } = useAuth();

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [experienceYears, setExperienceYears] = useState("3");
  const [bio, setBio] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Kopargaon");
  const [district, setDistrict] = useState("Ahmednagar");
  const [pincode, setPincode] = useState("423601");
  const [serviceArea, setServiceArea] = useState("Kopargaon Central & 20 KM Radius");
  const [lat, setLat] = useState(19.8917);
  const [lon, setLon] = useState(74.4795);
  const [docType, setDocType] = useState("AADHAAR");
  const [docNumber, setDocNumber] = useState("");

  // OTP State
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let timer;
    if (otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  const toggleCategory = (cat) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const handleSendOtp = async () => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address first.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await authAPI.sendOtp({ email, purpose: "REGISTRATION" });
      setOtpSent(true);
      setOtpCountdown(60);
      setSuccess(res.data?.message || `6-digit OTP code sent to ${email}`);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to send OTP code.");
    } finally {
      setLoading(false);
    }
  };

  const handleDetectGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(parseFloat(pos.coords.latitude.toFixed(4)));
          setLon(parseFloat(pos.coords.longitude.toFixed(4)));
        },
        () => {
          setError("GPS unavailable. Defaulting to Kopargaon town center.");
        }
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!otpSent || !otpCode || otpCode.trim().length < 4) {
      setError("Please request and enter your 6-digit email verification OTP.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (selectedCategories.length === 0) {
      setError("Please select at least one service category so you appear for relevant requests.");
      return;
    }
    if (!docNumber || docNumber.trim().length < 4) {
      setError("Please enter your identity/Aadhaar document number.");
      return;
    }

    if (!fullName || fullName.trim().length < 2) {
      setError("Please enter your full name (at least 2 characters).");
      return;
    }
    if (!phone || phone.trim().length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!address || address.trim().length < 3) {
      setError("Please enter your residential/work address (at least 3 characters).");
      return;
    }

    setLoading(true);
    try {
      await registerWorker({
        email: email.trim().toLowerCase(),
        password,
        otp_code: otpCode.trim(),
        full_name: fullName.trim(),
        phone: phone.trim(),
        service_categories: selectedCategories,
        skills: selectedCategories,
        experience_years: parseFloat(experienceYears) || 1.0,
        bio: bio.trim() || `Certified worker specializing in ${selectedCategories.join(", ")}.`,
        address: address.trim(),
        city,
        district,
        pincode,
        service_area: serviceArea,
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        document_type: docType,
        document_number: docNumber.trim(),
      });
      onClose();
    } catch (err) {
      const rawDetail = err.response?.data?.detail;
      let msg = "Worker registration failed. Please review the details.";
      if (typeof rawDetail === "string") {
        msg = rawDetail;
      } else if (Array.isArray(rawDetail)) {
        msg = rawDetail.map((d) => (typeof d === "string" ? d : d.msg || `${d.loc?.slice(-1)[0]}: ${d.msg}`)).join(", ");
      } else if (rawDetail && typeof rawDetail === "object") {
        msg = rawDetail.msg || JSON.stringify(rawDetail);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div
        className="modal-content"
        style={{
          maxWidth: "720px",
          maxHeight: "92vh",
          overflowY: "auto",
          borderRadius: "16px",
          padding: "26px",
        }}
      >
        <button
          onClick={onClose}
          className="modal-close"
          style={{ position: "absolute", top: "18px", right: "18px" }}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "22px" }}>
          <div
            style={{
              display: "inline-flex",
              background: "#ecfdf5",
              padding: "12px",
              borderRadius: "14px",
              color: "#059669",
              marginBottom: "8px",
              border: "1px solid #a7f3d0",
            }}
          >
            <Briefcase size={32} />
          </div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: "800", color: "#0f172a", marginBottom: "4px" }}>
            Careers · Cooperative Worker Onboarding
          </h2>
          <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
            Join Cooperative Gig Services Platform · 95% Direct Payouts · Group Insurance Cover
          </p>
        </div>

        {error && (
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
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {success && (
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
            <CheckCircle2 size={16} /> {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Section 1: Account & OTP Verification */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "16px",
            }}
          >
            <div style={{ fontSize: "0.88rem", fontWeight: "700", color: "#0f172a", marginBottom: "12px" }}>
              1. Account Authentication & Email OTP Verification
            </div>

            <div className="form-group" style={{ marginBottom: "12px" }}>
              <label className="form-label">Worker Email Address</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  id="worker-reg-email"
                  type="email"
                  required
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="worker@example.com"
                />
                <button
                  type="button"
                  disabled={loading || otpCountdown > 0 || !email}
                  onClick={handleSendOtp}
                  className="btn btn-secondary"
                  style={{ whiteSpace: "nowrap", padding: "8px 14px", fontWeight: "700" }}
                >
                  {otpCountdown > 0 ? `${otpCountdown}s` : otpSent ? "Resend OTP" : "Send OTP"}
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              <div className="form-group">
                <label className="form-label">6-Digit Email OTP</label>
                <input
                  id="worker-reg-otp"
                  type="text"
                  required
                  maxLength={6}
                  className="form-input"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 543210"
                  style={{ letterSpacing: "3px", fontWeight: "700" }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Create Password</label>
                <input
                  id="worker-reg-password"
                  type="password"
                  required
                  minLength={6}
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 chars"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input
                  id="worker-reg-confirm-password"
                  type="password"
                  required
                  minLength={6}
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Personal Details */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "16px",
            }}
          >
            <div style={{ fontSize: "0.88rem", fontWeight: "700", color: "#0f172a", marginBottom: "12px" }}>
              2. Personal & Professional Details
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "10px", marginBottom: "12px" }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  id="worker-reg-name"
                  type="text"
                  required
                  className="form-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Sanjay Babanrao Patil"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mobile Number</label>
                <input
                  id="worker-reg-phone"
                  type="tel"
                  required
                  className="form-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91-98XXXXXXXX"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Experience (Years)</label>
                <input
                  id="worker-reg-exp"
                  type="number"
                  min="0.5"
                  max="45"
                  step="0.5"
                  required
                  className="form-input"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Professional Bio / Profile Summary</label>
              <textarea
                id="worker-reg-bio"
                rows={2}
                className="form-input"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Brief summary of your expertise, tools, and experience in Kopargaon district..."
              />
            </div>
          </div>

          {/* Section 3: Service Categories (CRITICAL) */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "16px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <div style={{ fontSize: "0.88rem", fontWeight: "700", color: "#0f172a" }}>
                3. Select Your Service Category <span style={{ color: "#ef4444" }}>*</span>
              </div>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                {selectedCategories.length} category selected
              </span>
            </div>
            <p style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: "12px" }}>
              Workers are strictly displayed only for requests matching their selected trade categories.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "8px" }}>
              {AVAILABLE_CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: isSelected ? "2px solid #059669" : "1px solid #cbd5e1",
                      background: isSelected ? "#ecfdf5" : "white",
                      color: isSelected ? "#065f46" : "#334155",
                      fontWeight: isSelected ? "700" : "500",
                      fontSize: "0.78rem",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>{cat}</span>
                    {isSelected && <Check size={14} color="#059669" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Address & 20 KM Service Location */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "16px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ fontSize: "0.88rem", fontWeight: "700", color: "#0f172a" }}>
                4. Residential Address & Operational Location
              </div>
              <button
                type="button"
                onClick={handleDetectGPS}
                className="btn btn-secondary"
                style={{ fontSize: "0.74rem", padding: "4px 8px", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <Navigation size={12} /> Auto-Detect GPS
              </button>
            </div>

            <div className="form-group" style={{ marginBottom: "10px" }}>
              <label className="form-label">Street / Area Address</label>
              <input
                id="worker-reg-address"
                type="text"
                required
                className="form-input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House / Plot No, Lane, Ward"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              <div>
                <label className="form-label" style={{ fontSize: "0.75rem" }}>City</label>
                <input
                  type="text"
                  className="form-input"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: "0.75rem" }}>District</label>
                <input
                  type="text"
                  className="form-input"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: "0.75rem" }}>Pincode</label>
                <input
                  type="text"
                  className="form-input"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 5: Official Aadhaar / Identity Verification (Real status: PENDING) */}
          <div
            style={{
              background: "#fefce8",
              border: "1px solid #fef08a",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <ShieldCheck size={20} color="#ca8a04" />
              <span style={{ fontSize: "0.88rem", fontWeight: "700", color: "#854d0e" }}>
                5. Government Identity Verification (UIDAI / Aadhaar / Voter ID)
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "10px", marginBottom: "10px" }}>
              <div>
                <label className="form-label" style={{ fontSize: "0.75rem" }}>Document Type</label>
                <select
                  id="worker-reg-doc-type"
                  className="form-input"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                >
                  <option value="AADHAAR">Aadhaar Card (UIDAI)</option>
                  <option value="VOTER_ID">Voter ID Card (ECI)</option>
                  <option value="PAN">PAN Card (Income Tax)</option>
                  <option value="DRIVING_LICENSE">Driving License (RTO)</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: "0.75rem" }}>Document / Aadhaar Number</label>
                <input
                  id="worker-reg-doc-num"
                  type="text"
                  required
                  className="form-input"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="12-digit Aadhaar / Document Number"
                />
              </div>
            </div>

            {/* Official notice on real integration vs pending status */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.7)",
                border: "1px solid #fde047",
                borderRadius: "8px",
                padding: "10px 12px",
                fontSize: "0.76rem",
                color: "#713f12",
                lineHeight: "1.45",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "700", marginBottom: "2px" }}>
                <AlertTriangle size={14} color="#ca8a04" /> Official Identity Verification Protocol
              </div>
              No fake verification badges are created. When official UIDAI/DigiLocker production API credentials are configured, automated instant verification will run. Until API credentials are provided, your document details are securely logged with status <strong style={{ color: "#854d0e" }}>PENDING OFFICIAL VERIFICATION</strong>, and will be manually approved by the Cooperative Society Registrar.
            </div>
          </div>

          <button
            id="btn-worker-submit-reg"
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: "100%", padding: "13px", fontSize: "1rem", fontWeight: "700" }}
          >
            {loading ? "Registering Worker..." : "Submit Cooperative Worker Application"}
          </button>
        </form>
      </div>
    </div>
  );
};
