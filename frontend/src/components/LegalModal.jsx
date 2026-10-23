import React from "react";
import { X, ShieldCheck, FileText, Lock } from "lucide-react";

export const LegalModal = ({ type, onClose }) => {
  const isPrivacy = type === "privacy";

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: "720px",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: "32px",
          background: "#ffffff",
          borderRadius: "8px",
        }}
      >
        <button
          onClick={onClose}
          className="modal-close"
          aria-label="Close"
          style={{ position: "absolute", top: "18px", right: "18px", cursor: "pointer" }}
        >
          <X size={20} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "6px",
              background: "#ecfdf5",
              color: "#059669",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isPrivacy ? <Lock size={20} /> : <FileText size={20} />}
          </div>
          <div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>
              {isPrivacy ? "Privacy Policy" : "Terms and Conditions"}
            </h2>
            <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "2px 0 0 0" }}>
              Cooperative Gig Services Platform · Effective Date: October 2026
            </p>
          </div>
        </div>

        {isPrivacy ? (
          <div style={{ fontSize: "0.9rem", color: "#334155", lineHeight: "1.7" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#0f172a", marginTop: "16px", marginBottom: "8px" }}>
              1. Information We Collect
            </h3>
            <p style={{ marginBottom: "12px" }}>
              We collect information required to connect customers with cooperative workers, including:
            </p>
            <ul style={{ paddingLeft: "20px", marginBottom: "16px" }}>
              <li>Contact details: Name, email address, mobile number.</li>
              <li>Service location: Service delivery address, postal code, and geographic coordinates for distance estimation.</li>
              <li>Worker verification data: Aadhaar/DigiLocker verification status, police verification, and trade certificates.</li>
              <li>Transaction history: Booking dates, service categories, labour charges, and UPI reference IDs.</li>
            </ul>

            <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#0f172a", marginTop: "16px", marginBottom: "8px" }}>
              2. How Your Data Is Used
            </h3>
            <p style={{ marginBottom: "12px" }}>
              Your data is strictly used for platform operations:
            </p>
            <ul style={{ paddingLeft: "20px", marginBottom: "16px" }}>
              <li>Routing service requests to nearby verified cooperative workers.</li>
              <li>Direct telephone communication between worker and customer upon job acceptance.</li>
              <li>Settlement of worker earnings and cooperative administrative records.</li>
              <li>We do not sell, rent, or trade your personal data to third-party advertisers.</li>
            </ul>

            <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#0f172a", marginTop: "16px", marginBottom: "8px" }}>
              3. Data Security and Retention
            </h3>
            <p style={{ marginBottom: "12px" }}>
              Passwords are cryptographically hashed using salted bcrypt algorithms. Authentication sessions use JSON Web Tokens with strict expiration. Verification records are archived in accordance with state cooperative society regulations.
            </p>

            <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#0f172a", marginTop: "16px", marginBottom: "8px" }}>
              4. Contact the Data Protection Officer
            </h3>
            <p>
              For access, correction, or deletion inquiries, contact the Cooperative Grievance and Compliance Cell at compliance@cooperativegig.org.
            </p>
          </div>
        ) : (
          <div style={{ fontSize: "0.9rem", color: "#334155", lineHeight: "1.7" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#0f172a", marginTop: "16px", marginBottom: "8px" }}>
              1. Platform Framework
            </h3>
            <p style={{ marginBottom: "12px" }}>
              The Cooperative Gig Services Platform is governed by registered Labour Cooperative Societies under Maharashtra Cooperative Societies Act. Workers registered on this platform are verified members of their respective cooperatives.
            </p>

            <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#0f172a", marginTop: "16px", marginBottom: "8px" }}>
              2. Fair Fee Structure
            </h3>
            <ul style={{ paddingLeft: "20px", marginBottom: "16px" }}>
              <li><strong>Worker Payout:</strong> 95% of total service labour charge goes directly to the executing technician.</li>
              <li><strong>Cooperative Administrative Fee:</strong> A fixed 5% deduction supports the member welfare fund, group accident insurance, and cooperative dispute resolution.</li>
              <li><strong>No Dynamic Price Gouging:</strong> Base charges are determined by standard trade schedules approved by the cooperative committee.</li>
            </ul>

            <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#0f172a", marginTop: "16px", marginBottom: "8px" }}>
              3. Booking, Cancellation and Dispute Resolution
            </h3>
            <ul style={{ paddingLeft: "20px", marginBottom: "16px" }}>
              <li>Customers and workers may cancel bookings prior to travel commencement.</li>
              <li>In the event of an incomplete or substandard job, customer grievances must be submitted within 48 hours for review by the Cooperative Redressal Committee.</li>
              <li>All payments are executed via standard UPI protocols directly upon satisfactory service delivery.</li>
            </ul>

            <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#0f172a", marginTop: "16px", marginBottom: "8px" }}>
              4. Safety and Professional Conduct
            </h3>
            <p>
              Technicians must carry their physical or digital cooperative identification card on duty. Zero tolerance is enforced for harassment, unsafe electrical/plumbing practices, or unauthorized rate inflation.
            </p>
          </div>
        )}

        <div style={{ marginTop: "28px", paddingTop: "18px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            className="btn btn-navy"
            style={{ padding: "8px 20px" }}
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
