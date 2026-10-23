import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { authAPI } from "../services/api";
import { Lock, Mail, KeyRound, X, ShieldCheck, ArrowRight, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export const AuthModal = ({ onClose, initialTab = "login" }) => {
  const { login, loginOtp, register, t } = useAuth();

  // Mode: "login" | "register" | "forgot"
  const [mode, setMode] = useState(initialTab);
  
  // In login mode: "password" | "otp"
  const [loginMethod, setLoginMethod] = useState("password");

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");

  // OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Countdown timer for resend
  React.useEffect(() => {
    let timer;
    if (otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  const formatError = (err, fallback) => {
    const raw = err.response?.data?.detail;
    if (typeof raw === "string") return raw;
    if (Array.isArray(raw)) return raw.map(d => (typeof d === "string" ? d : d.msg || `${d.loc?.slice(-1)[0]}: ${d.msg}`)).join(", ");
    if (raw && typeof raw === "object") return raw.msg || JSON.stringify(raw);
    return fallback;
  };

  const handleSendOtp = async (purpose = "LOGIN") => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address first.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await authAPI.sendOtp({ email, purpose });
      setOtpSent(true);
      setOtpCountdown(60);
      setSuccessMsg(res.data?.message || `A 6-digit verification code was sent to ${email}`);
    } catch (err) {
      setError(formatError(err, "Failed to send OTP. Please check email address."));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      onClose();
    } catch (err) {
      setError(formatError(err, "Invalid email or password."));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpLogin = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length < 4) {
      setError("Please enter the 6-digit OTP code sent to your email.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await loginOtp(email, otpCode.trim());
      onClose();
    } catch (err) {
      setError(formatError(err, "Invalid or expired OTP code."));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!otpSent) {
      setError("Please click 'Send Verification Code' to verify your email address.");
      return;
    }
    if (!otpCode || otpCode.trim().length < 4) {
      setError("Please enter the 6-digit OTP code received in your email.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      // User creates account using ONLY Email and Password (+ Email OTP verification)
      await register({
        email: email.trim().toLowerCase(),
        password,
        otp_code: otpCode.trim(),
      });
      onClose();
    } catch (err) {
      setError(formatError(err, "Registration failed. Please check the OTP code."));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length < 4) {
      setError("Please enter the 6-digit OTP sent to your email.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await authAPI.resetPassword({
        email: email.trim().toLowerCase(),
        otp_code: otpCode.trim(),
        new_password: password,
      });
      setSuccessMsg(res.data?.message || "Password reset successfully! You can now log in.");
      setMode("login");
      setLoginMethod("password");
      setPassword("");
      setConfirmPassword("");
      setOtpCode("");
    } catch (err) {
      setError(formatError(err, "Password reset failed. Please check the OTP code."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content" style={{ maxWidth: "440px", borderRadius: "16px" }}>
        <button
          onClick={onClose}
          className="modal-close"
          aria-label="Close"
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
              marginBottom: "10px",
              border: "1px solid #a7f3d0",
            }}
          >
            <ShieldCheck size={32} />
          </div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: "800", color: "#0f172a", marginBottom: "4px" }}>
            {mode === "login" && "Sign In"}
            {mode === "register" && "Create an Account"}
            {mode === "forgot" && "Reset Password"}
          </h2>
          <p style={{ fontSize: "0.84rem", color: "#64748b" }}>
            {mode === "login" && "Access your cooperative service account"}
            {mode === "register" && "Sign up using your email and password"}
            {mode === "forgot" && "Verify your email via OTP to set a new password"}
          </p>
        </div>

        {/* Tab Switcher for Sign In vs Create Account */}
        {mode !== "forgot" && (
          <div
            style={{
              display: "flex",
              background: "#f1f5f9",
              padding: "4px",
              borderRadius: "10px",
              marginBottom: "20px",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
                setSuccessMsg("");
              }}
              style={{
                flex: 1,
                padding: "8px 12px",
                border: "none",
                borderRadius: "8px",
                fontWeight: "700",
                fontSize: "0.88rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
                background: mode === "login" ? "#ffffff" : "transparent",
                color: mode === "login" ? "#0f172a" : "#64748b",
                boxShadow: mode === "login" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError("");
                setSuccessMsg("");
              }}
              style={{
                flex: 1,
                padding: "8px 12px",
                border: "none",
                borderRadius: "8px",
                fontWeight: "700",
                fontSize: "0.88rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
                background: mode === "register" ? "#ffffff" : "transparent",
                color: mode === "register" ? "#0f172a" : "#64748b",
                boxShadow: mode === "register" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Alert Messages */}
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
              alignItems: "flex-start",
              gap: "8px",
            }}
          >
            <AlertCircle size={16} style={{ marginTop: "2px", flexShrink: 0 }} />
            <div>{error}</div>
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
              alignItems: "flex-start",
              gap: "8px",
            }}
          >
            <CheckCircle2 size={16} style={{ marginTop: "2px", flexShrink: 0 }} />
            <div>{successMsg}</div>
          </div>
        )}

        {/* ── 1. LOGIN MODE ── */}
        {mode === "login" && (
          <>
            {/* Toggle Login Method: Password vs Email OTP */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginBottom: "16px",
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: "8px",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setLoginMethod("password");
                  setError("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "0.82rem",
                  fontWeight: loginMethod === "password" ? "700" : "500",
                  color: loginMethod === "password" ? "#059669" : "#64748b",
                  borderBottom: loginMethod === "password" ? "2px solid #059669" : "none",
                  paddingBottom: "4px",
                  cursor: "pointer",
                }}
              >
                Password Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMethod("otp");
                  setError("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "0.82rem",
                  fontWeight: loginMethod === "otp" ? "700" : "500",
                  color: loginMethod === "otp" ? "#059669" : "#64748b",
                  borderBottom: loginMethod === "otp" ? "2px solid #059669" : "none",
                  paddingBottom: "4px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <KeyRound size={13} /> Email OTP Login
              </button>
            </div>

            {loginMethod === "password" ? (
              <form onSubmit={handlePasswordLogin}>
                <div className="form-group" style={{ marginBottom: "14px" }}>
                  <label className="form-label" style={{ fontSize: "0.82rem", fontWeight: "600" }}>
                    Email Address
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      id="login-email-input"
                      type="email"
                      required
                      className="form-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@domain.com"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label className="form-label" style={{ fontSize: "0.82rem", fontWeight: "600" }}>
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setError("");
                        setSuccessMsg("");
                        setOtpSent(false);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#059669",
                        fontSize: "0.78rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <input
                    id="login-password-input"
                    type="password"
                    required
                    className="form-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>

                <button
                  id="btn-login-submit"
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ width: "100%", padding: "11px", fontSize: "0.95rem", marginTop: "6px" }}
                >
                  {loading ? "Verifying..." : "Sign In with Password"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleOtpLogin}>
                <div className="form-group" style={{ marginBottom: "14px" }}>
                  <label className="form-label" style={{ fontSize: "0.82rem", fontWeight: "600" }}>
                    Email Address
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      id="login-otp-email"
                      type="email"
                      required
                      className="form-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@domain.com"
                    />
                    <button
                      type="button"
                      disabled={loading || otpCountdown > 0 || !email}
                      onClick={() => handleSendOtp("LOGIN")}
                      className="btn btn-secondary"
                      style={{ whiteSpace: "nowrap", padding: "8px 12px", fontSize: "0.8rem", fontWeight: "700" }}
                    >
                      {otpCountdown > 0 ? `${otpCountdown}s` : otpSent ? "Resend OTP" : "Send OTP"}
                    </button>
                  </div>
                </div>

                {otpSent && (
                  <div className="form-group" style={{ marginBottom: "14px" }}>
                    <label className="form-label" style={{ fontSize: "0.82rem", fontWeight: "600" }}>
                      Enter 6-Digit Email OTP
                    </label>
                    <input
                      id="login-otp-code"
                      type="text"
                      required
                      maxLength={6}
                      className="form-input"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="e.g. 543210"
                      style={{ letterSpacing: "4px", fontSize: "1.1rem", textAlign: "center", fontWeight: "700" }}
                    />
                  </div>
                )}

                <button
                  id="btn-login-otp-submit"
                  type="submit"
                  disabled={loading || !otpSent}
                  className="btn btn-primary"
                  style={{ width: "100%", padding: "11px", fontSize: "0.95rem", marginTop: "6px" }}
                >
                  {loading ? "Verifying OTP..." : "Verify OTP & Sign In"}
                </button>
              </form>
            )}
          </>
        )}

        {/* ── 2. CREATE ACCOUNT MODE (Only Email + Password) ── */}
        {mode === "register" && (
          <form onSubmit={handleRegister}>
            <div className="form-group" style={{ marginBottom: "14px" }}>
              <label className="form-label" style={{ fontSize: "0.82rem", fontWeight: "600" }}>
                Email Address
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  id="register-email-input"
                  type="email"
                  required
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  autoComplete="email"
                />
                <button
                  type="button"
                  disabled={loading || otpCountdown > 0 || !email}
                  onClick={() => handleSendOtp("REGISTRATION")}
                  className="btn btn-secondary"
                  style={{ whiteSpace: "nowrap", padding: "8px 12px", fontSize: "0.8rem", fontWeight: "700" }}
                >
                  {otpCountdown > 0 ? `${otpCountdown}s` : otpSent ? "Resend" : "Send OTP"}
                </button>
              </div>
            </div>

            {/* Email OTP Input */}
            <div className="form-group" style={{ marginBottom: "14px" }}>
              <label className="form-label" style={{ fontSize: "0.82rem", fontWeight: "600" }}>
                Email Verification Code (OTP)
              </label>
              <input
                id="register-otp-code"
                type="text"
                required
                maxLength={6}
                className="form-input"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder={otpSent ? "Enter 6-digit code from email" : "Click 'Send OTP' above first"}
                style={{
                  letterSpacing: otpCode ? "4px" : "normal",
                  fontSize: otpCode ? "1.05rem" : "0.9rem",
                  fontWeight: otpCode ? "700" : "normal",
                }}
              />
              <p style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "3px" }}>
                Official verification: Account created only after valid email OTP confirmation.
              </p>
            </div>

            <div className="form-group" style={{ marginBottom: "14px" }}>
              <label className="form-label" style={{ fontSize: "0.82rem", fontWeight: "600" }}>
                Create Password
              </label>
              <input
                id="register-password-input"
                type="password"
                required
                minLength={6}
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                autoComplete="new-password"
              />
            </div>

            <div className="form-group" style={{ marginBottom: "14px" }}>
              <label className="form-label" style={{ fontSize: "0.82rem", fontWeight: "600" }}>
                Confirm Password
              </label>
              <input
                id="register-confirm-password"
                type="password"
                required
                minLength={6}
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
              />
            </div>

            <button
              id="btn-register-submit"
              type="submit"
              disabled={loading || !otpSent}
              className="btn btn-primary"
              style={{ width: "100%", padding: "11px", fontSize: "0.95rem", marginTop: "6px" }}
            >
              {loading ? "Creating Account..." : "Create Verified Account"}
            </button>
          </form>
        )}

        {/* ── 3. FORGOT PASSWORD MODE ── */}
        {mode === "forgot" && (
          <form onSubmit={handleResetPassword}>
            <div className="form-group" style={{ marginBottom: "14px" }}>
              <label className="form-label" style={{ fontSize: "0.82rem", fontWeight: "600" }}>
                Registered Email Address
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  id="forgot-email-input"
                  type="email"
                  required
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                />
                <button
                  type="button"
                  disabled={loading || otpCountdown > 0 || !email}
                  onClick={() => handleSendOtp("FORGOT_PASSWORD")}
                  className="btn btn-secondary"
                  style={{ whiteSpace: "nowrap", padding: "8px 12px", fontSize: "0.8rem", fontWeight: "700" }}
                >
                  {otpCountdown > 0 ? `${otpCountdown}s` : otpSent ? "Resend" : "Send OTP"}
                </button>
              </div>
            </div>

            {otpSent && (
              <>
                <div className="form-group" style={{ marginBottom: "14px" }}>
                  <label className="form-label" style={{ fontSize: "0.82rem", fontWeight: "600" }}>
                    Enter 6-Digit OTP Code
                  </label>
                  <input
                    id="forgot-otp-code"
                    type="text"
                    required
                    maxLength={6}
                    className="form-input"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter code from email"
                    style={{ letterSpacing: "4px", fontSize: "1.05rem", fontWeight: "700" }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: "14px" }}>
                  <label className="form-label" style={{ fontSize: "0.82rem", fontWeight: "600" }}>
                    New Password
                  </label>
                  <input
                    id="forgot-new-password"
                    type="password"
                    required
                    minLength={6}
                    className="form-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: "14px" }}>
                  <label className="form-label" style={{ fontSize: "0.82rem", fontWeight: "600" }}>
                    Confirm New Password
                  </label>
                  <input
                    id="forgot-confirm-password"
                    type="password"
                    required
                    minLength={6}
                    className="form-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                  />
                </div>
              </>
            )}

            <button
              id="btn-reset-password-submit"
              type="submit"
              disabled={loading || !otpSent}
              className="btn btn-primary"
              style={{ width: "100%", padding: "11px", fontSize: "0.95rem", marginTop: "6px" }}
            >
              {loading ? "Updating Password..." : "Set New Password"}
            </button>

            <div style={{ textAlign: "center", marginTop: "14px" }}>
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#64748b",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                }}
              >
                ← Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* Security Footer Note */}
        <div
          style={{
            marginTop: "20px",
            padding: "10px",
            background: "#f8fafc",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            fontSize: "0.74rem",
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <ShieldCheck size={16} color="#059669" style={{ flexShrink: 0 }} />
          <span>
            Strict verification policy: Only properly email-verified accounts are authenticated and permitted on the cooperative platform.
          </span>
        </div>
      </div>
    </div>
  );
};
