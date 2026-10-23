import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  ShieldCheck, User, LogOut, Languages, Menu, X,
  Settings, HelpCircle, Briefcase, CheckCircle2
} from "lucide-react";

export const Navbar = ({
  onOpenAuth,
  onOpenCareers,
  onOpenHelp,
  onOpenSettings,
  onOpenProfile,
}) => {
  const { user, role, logout, lang, changeLanguage, t } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const getRoleLabel = () => {
    const map = {
      CUSTOMER: t("roleCustomer") || "Customer",
      WORKER: t("roleWorker") || "Coop Worker",
      COOPERATIVE_ADMIN: t("roleAdmin") || "Coop Admin",
      SUPER_ADMIN: t("roleSuperAdmin") || "Super Admin",
    };
    return map[role] || "Member";
  };

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      {/* Brand */}
      <div
        className="nav-brand"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        style={{ cursor: "pointer" }}
      >
        <div className="brand-icon">
          <ShieldCheck size={24} />
        </div>
        <div>
          <div className="brand-title">{t("brand") || "Cooperative Gig Services"}</div>
          <div className="brand-tagline">
            {t("tagline") || "Verified Skilled Cooperative Federation"}
          </div>
        </div>
      </div>

      {/* Center Nav Links */}
      <div className="nav-links" role="list">
        <a
          href="#services"
          className="nav-link"
          onClick={(e) => {
            e.preventDefault();
            const el = document.getElementById("services-section");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
        >
          Services
        </a>
        <a
          href="#how-it-works"
          className="nav-link"
          onClick={(e) => {
            e.preventDefault();
            const el = document.getElementById("how-it-works-section");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
        >
          How It Works
        </a>
        <button
          type="button"
          className="nav-link"
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
          onClick={onOpenCareers}
          id="nav-link-careers"
        >
          <Briefcase size={14} color="#10b981" /> Careers (Workers)
        </button>
        <button
          type="button"
          className="nav-link"
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
          onClick={onOpenHelp}
          id="nav-link-help"
        >
          <HelpCircle size={14} /> Help
        </button>
      </div>

      {/* Right Actions */}
      <div className="nav-actions">
        {/* Language Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Languages size={15} color="#94a3b8" />
          <select
            value={lang}
            onChange={(e) => changeLanguage(e.target.value)}
            className="lang-selector"
            aria-label="Language Selector"
            id="lang-selector"
          >
            <option value="en">EN</option>
            <option value="hi">हि</option>
            <option value="mr">म</option>
          </select>
        </div>

        {/* Settings Icon */}
        <button
          id="btn-nav-settings"
          type="button"
          onClick={onOpenSettings}
          className="btn btn-ghost"
          style={{ padding: "6px 8px", color: "#cbd5e1" }}
          title="Platform Settings & Account"
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>

        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Customer/User Profile Icon Button at the top-right corner */}
            <button
              id="btn-user-profile"
              type="button"
              onClick={onOpenProfile}
              className="user-pill"
              style={{
                cursor: "pointer",
                background: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                padding: "6px 12px",
                borderRadius: "20px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "white",
                transition: "all 0.15s ease",
              }}
              title="Click to view Customer Profile, Address & Subscription"
              aria-label="User Profile"
            >
              <div
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  background: "#10b981",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.72rem",
                  fontWeight: "800",
                }}
              >
                {user.full_name ? user.full_name.charAt(0).toUpperCase() : <User size={12} />}
              </div>
              <span className="user-pill-name" style={{ fontWeight: "700", fontSize: "0.84rem" }}>
                {user.full_name || "Profile"}
              </span>
              <span className="badge badge-green" style={{ fontSize: "0.62rem" }}>
                {getRoleLabel()}
              </span>
            </button>

            {/* Logout Button */}
            <button
              id="btn-logout"
              onClick={logout}
              className="btn btn-ghost"
              title="Logout"
              aria-label="Logout"
              style={{ padding: "6px 10px" }}
            >
              <LogOut size={16} />
              <span className="nav-logout-label">{t("logout") || "Logout"}</span>
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              id="btn-nav-login"
              onClick={() => onOpenAuth("login")}
              className="btn btn-ghost"
              style={{ padding: "6px 12px" }}
            >
              {t("login") || "Sign In"}
            </button>
            <button
              id="btn-nav-register"
              onClick={() => onOpenAuth("register")}
              className="btn btn-primary"
              style={{ padding: "6px 16px", fontSize: "0.85rem", fontWeight: "700" }}
            >
              {t("register") || "Register"}
            </button>
          </div>
        )}

        {/* Mobile menu hamburger */}
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="mobile-nav" style={{ padding: "16px", background: "#0f172a" }}>
          <button
            className="mobile-nav-link"
            style={{ width: "100%", textAlign: "left", background: "none", border: "none", color: "white", padding: "8px 0" }}
            onClick={() => {
              setMobileOpen(false);
              onOpenCareers();
            }}
          >
            💼 Careers & Worker Onboarding
          </button>
          <button
            className="mobile-nav-link"
            style={{ width: "100%", textAlign: "left", background: "none", border: "none", color: "white", padding: "8px 0" }}
            onClick={() => {
              setMobileOpen(false);
              onOpenHelp();
            }}
          >
            ❓ Help & FAQs
          </button>
          <button
            className="mobile-nav-link"
            style={{ width: "100%", textAlign: "left", background: "none", border: "none", color: "white", padding: "8px 0" }}
            onClick={() => {
              setMobileOpen(false);
              onOpenSettings();
            }}
          >
            ⚙️ Platform Settings
          </button>

          {user ? (
            <div style={{ marginTop: "12px", borderTop: "1px solid #334155", paddingTop: "12px" }}>
              <button
                className="btn btn-primary"
                style={{ width: "100%", marginBottom: "8px" }}
                onClick={() => {
                  setMobileOpen(false);
                  onOpenProfile();
                }}
              >
                👤 View Profile & Addresses
              </button>
              <button
                className="btn btn-secondary"
                style={{ width: "100%" }}
                onClick={() => {
                  setMobileOpen(false);
                  logout();
                }}
              >
                Logout
              </button>
            </div>
          ) : (
            <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => {
                  setMobileOpen(false);
                  onOpenAuth("login");
                }}
              >
                Sign In
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => {
                  setMobileOpen(false);
                  onOpenAuth("register");
                }}
              >
                Create Account
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};
