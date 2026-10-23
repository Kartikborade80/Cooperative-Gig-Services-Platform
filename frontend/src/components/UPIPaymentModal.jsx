import React, { useState } from "react";
import { paymentAPI } from "../services/api";
import { CreditCard, CheckCircle2, ShieldCheck, X } from "lucide-react";
import confetti from "canvas-confetti";

export const UPIPaymentModal = ({ booking, onClose, onSuccess }) => {
  const [upiId, setUpiId] = useState("customer@okhdfcbank");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [paidResult, setPaidResult] = useState(null);

  const total = booking.total_amount || (booking.labour_charge + (booking.material_charge || 0));
  const coopContribution = Math.round(total * 0.05 * 100) / 100;
  const workerPayout = Math.round((total - coopContribution) * 100) / 100;

  const handlePay = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setError("");

    try {
      const res = await paymentAPI.processPayment({
        booking_id: booking.id,
        method: "UPI",
        upi_id: upiId,
      });

      setPaidResult(res.data);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
      setTimeout(() => {
        onSuccess(res.data);
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.detail || "Payment failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "480px" }}>
        <button onClick={onClose} className="modal-close"><X size={18} /></button>

        {!paidResult ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div style={{ background: "#ecfdf5", color: "#059669", padding: "10px", borderRadius: "10px" }}>
                <CreditCard size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "700", color: "#0f172a" }}>Simulated UPI Payment</h3>
                <p style={{ fontSize: "0.82rem", color: "#64748b" }}>Booking Ref: {booking.booking_ref}</p>
              </div>
            </div>

            {error && (
              <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px", borderRadius: "6px", fontSize: "0.85rem", marginBottom: "14px" }}>
                {error}
              </div>
            )}

            {/* Split breakdown card */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.9rem" }}>
                <span style={{ color: "#64748b" }}>Service Labour Charge</span>
                <span style={{ fontWeight: "600" }}>₹{booking.labour_charge || 350.0}</span>
              </div>
              {booking.material_charge > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.9rem" }}>
                  <span style={{ color: "#64748b" }}>Materials & Spares</span>
                  <span style={{ fontWeight: "600" }}>₹{booking.material_charge}</span>
                </div>
              )}
              <div style={{ borderTop: "1px dashed #cbd5e1", margin: "10px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.05rem", fontWeight: "800", color: "#0f172a" }}>
                <span>Total Payable</span>
                <span style={{ color: "#059669" }}>₹{total}</span>
              </div>

              {/* Cooperative Social Security Contribution Callout */}
              <div style={{ marginTop: "14px", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "6px", padding: "10px", fontSize: "0.78rem" }}>
                <div style={{ fontWeight: "700", color: "#065f46", display: "flex", alignItems: "center", gap: "6px" }}>
                  <ShieldCheck size={14} /> Fair Cooperative Split Guaranteed
                </div>
                <div style={{ color: "#047857", marginTop: "4px", display: "flex", justifyContent: "space-between" }}>
                  <span>Worker Direct Earning (95%):</span>
                  <strong>₹{workerPayout}</strong>
                </div>
                <div style={{ color: "#047857", display: "flex", justifyContent: "space-between" }}>
                  <span>Cooperative Welfare Contribution (5%):</span>
                  <strong>₹{coopContribution}</strong>
                </div>
              </div>
            </div>

            <form onSubmit={handlePay}>
              <div className="form-group">
                <label className="form-label">Virtual Payment Address (UPI ID)</label>
                <input
                  type="text"
                  className="form-input"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="name@upi"
                  required
                />
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "8px", marginBottom: "18px" }}>
                {["pooja@okhdfcbank", "user@paytm", "sharma@oksbi"].map((vpa) => (
                  <button
                    key={vpa}
                    type="button"
                    onClick={() => setUpiId(vpa)}
                    className="btn-demo-pill"
                    style={{ background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1" }}
                  >
                    {vpa}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={processing}
                className="btn btn-primary"
                style={{ width: "100%", padding: "12px", fontSize: "1rem" }}
              >
                {processing ? "Processing UPI Transaction..." : `Pay ₹${total} Now`}
              </button>
            </form>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ color: "#059669", display: "inline-block", marginBottom: "12px" }}>
              <CheckCircle2 size={56} />
            </div>
            <h3 style={{ fontSize: "1.3rem", fontWeight: "800", color: "#0f172a" }}>Payment Successful!</h3>
            <p style={{ color: "#64748b", fontSize: "0.9rem", marginTop: "6px" }}>
              Transaction Reference: <strong style={{ color: "#0f172a" }}>{paidResult.transaction_ref}</strong>
            </p>
            <p style={{ fontSize: "0.85rem", color: "#059669", marginTop: "12px" }}>
              Worker payout credited and official tax invoice generated.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
