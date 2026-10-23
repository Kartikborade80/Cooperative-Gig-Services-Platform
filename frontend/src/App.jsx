import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { CustomerDashboard } from "./components/CustomerDashboard";
import { WorkerDashboard } from "./components/WorkerDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import { AuthModal } from "./components/AuthModal";
import { UserProfileModal } from "./components/UserProfileModal";
import { WorkerRegistrationModal } from "./components/WorkerRegistrationModal";
import { HelpModal } from "./components/HelpModal";
import { SettingsModal } from "./components/SettingsModal";
import { LegalModal } from "./components/LegalModal";
import { workerAPI } from "./services/api";
import {
  ShieldCheck, HeartHandshake, Award, ArrowRight,
  Wrench, Zap, Droplets, Sparkles, Home, Truck,
  Leaf, Wind, Shield, PaintBucket, ChevronRight,
  Star, MapPin, Clock, Users, Briefcase, HelpCircle
} from "lucide-react";

/* ── SERVICE CATEGORIES ── */
const CATEGORIES = [
  { icon: Droplets,    label: "Plumbing",         color: "#3b82f6", bg: "#eff6ff", desc: "Pipe repair, leaks, drain clearing" },
  { icon: Zap,         label: "Electrician",      color: "#f59e0b", bg: "#fffbeb", desc: "Wiring, switchboard, fuse, fan fittings" },
  { icon: PaintBucket, label: "Painting",         color: "#8b5cf6", bg: "#f5f3ff", desc: "Interior & exterior wall painting, damp proof" },
  { icon: Home,        label: "Carpentry",        color: "#92400e", bg: "#fef3c7", desc: "Furniture repair, door locks, hinges" },
  { icon: Sparkles,    label: "Cleaning",         color: "#10b981", bg: "#ecfdf5", desc: "Home deep clean, sanitization, kitchen descaling" },
  { icon: Wrench,      label: "Appliance Repair", color: "#ef4444", bg: "#fef2f2", desc: "Washing machine, fridge, microwave repair" },
  { icon: Wind,        label: "AC Service",       color: "#6366f1", bg: "#eef2ff", desc: "Gas refill, cooling diagnostics, filter service" },
  { icon: Leaf,        label: "Gardening",        color: "#16a34a", bg: "#f0fdf4", desc: "Lawn care, tree pruning, landscape care" },
  { icon: Truck,       label: "Packers & Movers", color: "#0891b2", bg: "#ecfeff", desc: "Safe household goods relocation" },
  { icon: Shield,      label: "Security",         color: "#dc2626", bg: "#fff1f2", desc: "CCTV installation, security guards" },
];

/* ── HOW IT WORKS STEPS ── */
const STEPS = [
  { n: "01", title: "Select Service Category", desc: "Pick from 10 verified cooperative trades or let our AI classify your problem automatically." },
  { n: "02", title: "Choose Verified Worker",  desc: "Browse email-verified cooperative members within 20 KM of Kopargaon with transparent rates." },
  { n: "03", title: "Reserve Time Slot",       desc: "Select your preferred date and available hour slot without risk of double-booking." },
  { n: "04", title: "Pay Securely via UPI",    desc: "Direct 95% worker earnings payout with 5% collective social security & group insurance contribution." },
];

/* ── TRUST STATS ── */
const STATS = [
  { value: "95%",    label: "Goes directly to workers" },
  { value: "20 KM",  label: "Strict operational radius" },
  { value: "₹5 Lac", label: "Group insurance cover" },
  { value: "100%",   label: "Email & Society verified" },
];

function LandingPage({ onOpenAuth, onOpenCareers, onOpenHelp, onOpenLegal }) {
  const [realWorkers, setRealWorkers] = useState([]);
  const [loadingWorkers, setLoadingWorkers] = useState(true);

  useEffect(() => {
    fetchVerifiedWorkers();
  }, []);

  const fetchVerifiedWorkers = async () => {
    try {
      const res = await workerAPI.getVerifiedWorkers({ max_radius_km: 20, available_only: true });
      // Only display email-verified workers
      setRealWorkers(res.data?.slice(0, 4) || []);
    } catch (err) {
      console.warn("Could not load verified workers list:", err);
    } finally {
      setLoadingWorkers(false);
    }
  };

  return (
    <div className="landing">
      {/* ── HERO ── */}
      <section className="hero-section">
        <div className="hero-inner">
          <div className="hero-badge">
            <ShieldCheck size={15} />
            Cooperative Gig Services Platform
          </div>

          <h1 className="hero-title">
            Cooperative Gig Services Platform
          </h1>

          <p className="hero-sub">
            Directly connect with certified skilled workers from Registered Labour Cooperatives.
            Zero middleman exploitation. 95% of payments go directly to the worker.
          </p>

          <div className="hero-actions">
            <button
              id="cta-book-service"
              className="btn btn-primary btn-lg"
              onClick={() => onOpenAuth("login")}
            >
              Book a Service <ArrowRight size={18} />
            </button>
            <button
              id="cta-join-worker"
              className="btn btn-secondary btn-lg"
              onClick={onOpenCareers}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Briefcase size={18} /> Careers (Worker Onboarding)
            </button>
          </div>

          {/* Stats Row */}
          <div className="hero-stats">
            {STATS.map((s) => (
              <div key={s.label} className="hero-stat">
                <div className="hero-stat-value">{s.value}</div>
                <div className="hero-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICE CATEGORIES ── */}
      <section className="section" id="services-section">
        <div className="section-header">
          <h2 className="section-title">What do you need help with?</h2>
          <p className="section-sub">10 trade categories · All workers email-verified & registered with the cooperative society</p>
        </div>
        <div className="categories-grid">
          {CATEGORIES.map(({ icon: Icon, label, color, bg, desc }) => (
            <button
              key={label}
              id={`cat-${label.toLowerCase().replace(/\s+/g, "-")}`}
              className="category-card"
              onClick={() => onOpenAuth("login")}
            >
              <div className="cat-icon" style={{ background: bg, color }}>
                <Icon size={26} />
              </div>
              <div className="cat-label">{label}</div>
              <div className="cat-desc">{desc}</div>
              <div className="cat-arrow" style={{ color }}>
                <ChevronRight size={16} />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="section section-alt" id="how-it-works-section">
        <div className="section-header">
          <h2 className="section-title">How It Works</h2>
          <p className="section-sub">Book a trusted cooperative worker in 4 simple steps</p>
        </div>
        <div className="steps-grid">
          {STEPS.map((step) => (
            <div key={step.n} className="step-card">
              <div className="step-number">{step.n}</div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TRUST & SOCIAL SECURITY ── */}
      <section className="section">
        <div className="trust-grid">
          <div className="trust-text">
            <div className="trust-badge">
              <Shield size={14} /> Cooperative Social Security & Welfare
            </div>
            <h2 className="trust-title">
              Fair Worker Earnings.<br />Protected Families.
            </h2>
            <p className="trust-desc">
              Every booking contributes 5% to the collective cooperative welfare fund.
              This funds ₹5,00,000 group medical insurance, emergency assistance, and continuous
              skill-development training for all registered workers.
            </p>
            <ul className="trust-list">
              <li><ShieldCheck size={16} color="#10b981" /> ₹5 Lakh group medical insurance per worker</li>
              <li><ShieldCheck size={16} color="#10b981" /> Emergency welfare assistance pool</li>
              <li><ShieldCheck size={16} color="#10b981" /> Free skilling & government certification programs</li>
              <li><ShieldCheck size={16} color="#10b981" /> 95% direct earnings guarantee with zero hidden fees</li>
            </ul>
            <button className="btn btn-primary" onClick={onOpenCareers} id="cta-learn-welfare">
              Join as a Worker (Careers) <ArrowRight size={16} />
            </button>
          </div>

          <div className="trust-cards">
            <div className="trust-card green">
              <HeartHandshake size={28} />
              <div className="trust-card-title">Fair Matching Engine</div>
              <div className="trust-card-desc">
                Skill, availability, reliability rating & fairness rotation prevent monopolies and share gigs equally.
              </div>
            </div>
            <div className="trust-card blue">
              <Award size={28} />
              <div className="trust-card-title">Cooperative Verified</div>
              <div className="trust-card-desc">
                Email OTP verified accounts + official government ID review by the Cooperative Registrar.
              </div>
            </div>
            <div className="trust-card amber">
              <MapPin size={28} />
              <div className="trust-card-title">20 KM Service Radius</div>
              <div className="trust-card-desc">
                Strict 20 KM operational boundary around Kopargaon ensures prompt dispatch and local employment.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── REAL VERIFIED WORKERS SHOWCASE ── */}
      <section className="section section-alt">
        <div className="section-header">
          <h2 className="section-title">Verified Cooperative Workers</h2>
          <p className="section-sub">Active members with verified email and cooperative standing within 20 KM</p>
        </div>

        {realWorkers.length > 0 ? (
          <div className="sample-workers-grid">
            {realWorkers.map((w) => (
              <div key={w.id} className="worker-preview-card" onClick={() => onOpenAuth("login")} style={{ cursor: "pointer" }}>
                <div className="worker-preview-avatar">
                  {w.full_name ? w.full_name.split(" ").map(n => n[0]).join("") : "W"}
                </div>
                <div className="worker-preview-info">
                  <div className="worker-preview-name">{w.full_name}</div>
                  <div className="worker-preview-skill">
                    {w.service_categories && w.service_categories.length > 0
                      ? w.service_categories.join(", ")
                      : "General Services"}
                  </div>
                  <div className="worker-preview-meta">
                    <span><Star size={12} fill="#f59e0b" color="#f59e0b" /> {w.average_rating || 5.0}</span>
                    <span><Clock size={12} /> {w.total_jobs_completed || 0} jobs</span>
                    {w.distance_km !== null && w.distance_km !== undefined && (
                      <span><MapPin size={12} /> {w.distance_km} KM</span>
                    )}
                  </div>
                </div>
                <div className="worker-preview-badge">
                  {w.verification_status === "VERIFIED" ? "Verified" : "Under Review"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "36px 20px",
              background: "white",
              borderRadius: "12px",
              border: "1px dashed #cbd5e1",
              maxWidth: "600px",
              margin: "0 auto",
            }}
          >
            <ShieldCheck size={36} color="#059669" style={{ margin: "0 auto 10px" }} />
            <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#0f172a" }}>
              Cooperative Worker Onboarding in Progress
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "6px 0 16px" }}>
              Are you a skilled plumber, electrician, or artisan in Kopargaon? Apply through our Careers portal today.
            </p>
            <button className="btn btn-primary" onClick={onOpenCareers}>
              Apply in Careers Section <ArrowRight size={16} />
            </button>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: "28px" }}>
          <button className="btn btn-primary btn-lg" onClick={() => onOpenAuth("login")} id="cta-see-all-workers">
            Book a Verified Worker Now <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-logo">
              <ShieldCheck size={22} color="#10b981" />
              <span>Cooperative Gig Services Platform</span>
            </div>

            <p className="footer-reg">
              Cooperative Gig Services Platform<br />
              Registered under Cooperative Societies Act · Fair Wages & Welfare Guarantee
            </p>
          </div>

          <div className="footer-links">
            <div className="footer-col">
              <div className="footer-col-title">Platform</div>
              <button className="footer-link" onClick={() => onOpenAuth("login")}>Book a Service</button>
              <button className="footer-link" onClick={onOpenCareers}>Careers (Worker Registration)</button>
              <button className="footer-link" onClick={() => window.location.hash = "#how-it-works-section"}>How It Works</button>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Support & Bylaws</div>
              <button className="footer-link" onClick={onOpenHelp}>Help & FAQs</button>
              <button className="footer-link" onClick={onOpenHelp}>Grievance Redressal</button>
              <button className="footer-link" onClick={onOpenHelp}>Cooperative Bylaws</button>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Legal & Compliance</div>
              <button className="footer-link" onClick={() => onOpenLegal("privacy")}>Privacy Policy</button>
              <button className="footer-link" onClick={() => onOpenLegal("terms")}>Terms & Conditions</button>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div>© {new Date().getFullYear()} Cooperative Gig Services Platform · All Rights Reserved</div>
          <div className="footer-roles">
            <ShieldCheck size={14} color="#10b981" /> Strict Email OTP & Identity Verification Policy Enforced
          </div>
        </div>
      </footer>
    </div>
  );
}

function MainApp() {
  const { user, role } = useAuth();
  
  // Modal states
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState("login");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCareersModal, setShowCareersModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [legalModalType, setLegalModalType] = useState(null);

  const handleOpenAuth = (tab = "login") => {
    setAuthTab(tab);
    setShowAuthModal(true);
  };

  const handleOpenLegal = (type) => {
    setLegalModalType(type);
  };

  return (
    <div className="app-container">
      <Navbar
        onOpenAuth={handleOpenAuth}
        onOpenCareers={() => setShowCareersModal(true)}
        onOpenHelp={() => setShowHelpModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenProfile={() => setShowProfileModal(true)}
      />

      <main className="main-content">
        {role === "CUSTOMER" && <CustomerDashboard />}
        {role === "WORKER" && <WorkerDashboard />}
        {(role === "COOPERATIVE_ADMIN" || role === "SUPER_ADMIN") && <AdminDashboard />}

        {!user && (
          <LandingPage
            onOpenAuth={handleOpenAuth}
            onOpenCareers={() => setShowCareersModal(true)}
            onOpenHelp={() => setShowHelpModal(true)}
            onOpenLegal={handleOpenLegal}
          />
        )}
      </main>

      {/* Modals */}
      {showAuthModal && (
        <AuthModal
          initialTab={authTab}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {showProfileModal && (
        <UserProfileModal
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {showCareersModal && (
        <WorkerRegistrationModal
          onClose={() => setShowCareersModal(false)}
        />
      )}

      {showHelpModal && (
        <HelpModal
          onClose={() => setShowHelpModal(false)}
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          onOpenProfile={() => setShowProfileModal(true)}
        />
      )}

      {legalModalType && (
        <LegalModal
          type={legalModalType}
          onClose={() => setLegalModalType(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
