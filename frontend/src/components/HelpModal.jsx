import React, { useState } from "react";
import { HelpCircle, Phone, Mail, MapPin, ShieldCheck, ChevronDown, ChevronUp, X, MessageSquare, AlertCircle } from "lucide-react";

const FAQS = [
  {
    q: "How does the Cooperative Gig model ensure fair wages for workers?",
    a: "Unlike commercial gig aggregators that deduct 25-35% commission, the Cooperative Platform retains only a 5% collective administrative & welfare contribution. The full 95% of every service fee is paid directly to the verified skilled worker."
  },
  {
    q: "Why is service strictly limited to a 20 KM radius?",
    a: "Our cooperative bylaws mandate localized labor employment to guarantee fast response times (under 30 minutes in Kopargaon and surrounding rural wards) and to avoid unnecessary travel fatigue for workers."
  },
  {
    q: "What is the Instant Priority Dispatch Pass?",
    a: "The Instant Priority Pass guarantees on-demand 15-minute priority matching with the closest verified cooperative worker, zero emergency night surcharges, and direct supervisor monitoring for urgent repairs."
  },
  {
    q: "How does worker identity verification work?",
    a: "Workers must complete email OTP verification and submit official government identity credentials (Aadhaar, Voter ID, or PAN). Identity verification integrates with official DigiLocker APIs, or remains in PENDING status until manually verified by the Cooperative Society Registrar."
  },
  {
    q: "What should I do if a worker does not arrive on time or service has issues?",
    a: "You can use the in-app chat to coordinate or file a formal cooperative grievance under the Help or Booking section. The Cooperative Society resolves grievances within 24 hours and issues refunds or free re-service when applicable."
  }
];

export const HelpModal = ({ onClose, onOpenComplaint }) => {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div
        className="modal-content"
        style={{
          maxWidth: "640px",
          maxHeight: "90vh",
          overflowY: "auto",
          borderRadius: "16px",
          padding: "24px",
        }}
      >
        <button onClick={onClose} className="modal-close" style={{ position: "absolute", top: "18px", right: "18px" }}>
          <X size={20} />
        </button>

        <div style={{ textAlign: "center", marginBottom: "22px" }}>
          <div
            style={{
              display: "inline-flex",
              background: "#eff6ff",
              padding: "12px",
              borderRadius: "14px",
              color: "#2563eb",
              marginBottom: "8px",
              border: "1px solid #bfdbfe",
            }}
          >
            <HelpCircle size={32} />
          </div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: "800", color: "#0f172a", marginBottom: "4px" }}>
            Help & Member Support
          </h2>
          <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
            Cooperative Gig Services Platform · Member Assistance Center
          </p>
        </div>

        {/* Contact Hotline Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "14px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div style={{ background: "#ecfdf5", color: "#059669", padding: "8px", borderRadius: "8px" }}>
              <Phone size={18} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>Cooperative Helpline</div>
              <div style={{ fontSize: "0.88rem", fontWeight: "800", color: "#0f172a" }}>+91-9822012345</div>
            </div>
          </div>

          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "14px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div style={{ background: "#eff6ff", color: "#2563eb", padding: "8px", borderRadius: "8px" }}>
              <Mail size={18} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>Email Support</div>
              <div style={{ fontSize: "0.84rem", fontWeight: "800", color: "#0f172a" }}>help@cooperativegig.org</div>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: "800", color: "#0f172a", marginBottom: "12px" }}>
            Frequently Asked Questions
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    overflow: "hidden",
                    background: "white",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      border: "none",
                      background: isOpen ? "#f8fafc" : "white",
                      cursor: "pointer",
                      textAlign: "left",
                      fontSize: "0.85rem",
                      fontWeight: "700",
                      color: "#0f172a",
                    }}
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
                  </button>
                  {isOpen && (
                    <div style={{ padding: "12px 14px", fontSize: "0.82rem", color: "#475569", lineHeight: "1.5", borderTop: "1px solid #f1f5f9" }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Office Location */}
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "12px 14px",
            fontSize: "0.78rem",
            color: "#64748b",
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
          }}
        >
          <MapPin size={18} color="#059669" style={{ marginTop: "2px", flexShrink: 0 }} />
          <div>
            <strong style={{ color: "#0f172a" }}>Cooperative Society Office Address:</strong><br />
            Sahakar Bhavan, Shivaji Chowk, Kopargaon, Ahmednagar District, Maharashtra 423601.<br />
            Hours: Monday to Saturday, 9:00 AM – 7:00 PM IST
          </div>
        </div>
      </div>
    </div>
  );
};
