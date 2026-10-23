import React, { useEffect, useState } from "react";
import { invoiceAPI } from "../services/api";
import { Printer, Download, X, ShieldCheck, Loader } from "lucide-react";

export const InvoiceModal = ({ bookingId, onClose, onDownloadPDF }) => {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchInv = async () => {
      try {
        const res = await invoiceAPI.getInvoice(bookingId);
        setInvoice(res.data);
      } catch (err) {
        console.error("Failed to load invoice:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInv();
  }, [bookingId]);

  const handlePrint = () => window.print();

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem("coop_gig_token");
      const response = await fetch(`/api/invoices/${bookingId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Invoice PDF not found");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice_${invoice?.invoice_number || bookingId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("PDF Download failed: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "620px", padding: "28px" }}>
        <button onClick={onClose} className="modal-close"><X size={18} /></button>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
            <Loader size={28} style={{ animation: "spin 1s linear infinite" }} />
            <div style={{ marginTop: "8px" }}>Loading invoice…</div>
          </div>
        ) : !invoice ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
            Invoice not found. Please complete payment first.
          </div>
        ) : (
          <div id="printable-invoice">
            {/* Header */}
            <div style={{ borderBottom: "2px solid #0f172a", paddingBottom: "14px", marginBottom: "18px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <ShieldCheck size={22} color="#059669" />
                  <h2 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0f172a" }}>TAX INVOICE</h2>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#475569", marginTop: "3px" }}>{invoice.coop_name}</div>
                <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Reg. No: MH/AHM/COOP/2022/4910 | Maharashtra</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span className="badge badge-green" style={{ marginBottom: "6px", display: "block" }}>PAID &amp; VERIFIED</span>
                <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#0f172a" }}>{invoice.invoice_number}</div>
                <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                  {new Date(invoice.issue_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </div>
              </div>
            </div>

            {/* Parties */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "18px", fontSize: "0.84rem" }}>
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px" }}>
                <div style={{ fontWeight: "700", color: "#0f172a", marginBottom: "4px" }}>CUSTOMER:</div>
                <div style={{ color: "#334155" }}>{invoice.customer_name}</div>
                <div style={{ color: "#64748b", fontSize: "0.75rem" }}>Booking Ref: #{invoice.booking_ref}</div>
              </div>
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px" }}>
                <div style={{ fontWeight: "700", color: "#0f172a", marginBottom: "4px" }}>COOPERATIVE WORKER:</div>
                <div style={{ color: "#334155" }}>{invoice.worker_name}</div>
                <div style={{ color: "#059669", fontSize: "0.75rem", fontWeight: "600" }}>✓ Certified Coop Member</div>
              </div>
            </div>

            {/* Charges table */}
            <table className="data-table" style={{ marginBottom: "16px", border: "1px solid #e2e8f0", width: "100%" }}>
              <thead>
                <tr>
                  <th>Description</th>
                  <th style={{ textAlign: "right" }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{invoice.service_name} (Labour)</td>
                  <td style={{ textAlign: "right", fontWeight: "600" }}>₹{invoice.labour_charge?.toFixed(2)}</td>
                </tr>
                {invoice.material_charge > 0 && (
                  <tr>
                    <td>Materials / Consumables</td>
                    <td style={{ textAlign: "right", fontWeight: "600" }}>₹{invoice.material_charge?.toFixed(2)}</td>
                  </tr>
                )}
                <tr style={{ background: "#f8fafc" }}>
                  <td style={{ fontWeight: "700", color: "#0f172a" }}>Total Paid</td>
                  <td style={{ textAlign: "right", fontWeight: "800", color: "#059669", fontSize: "1.05rem" }}>
                    ₹{invoice.total_amount?.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Cooperative split */}
            <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "8px", padding: "10px", fontSize: "0.8rem", color: "#065f46", marginBottom: "18px" }}>
              <div style={{ fontWeight: "700", marginBottom: "4px" }}>Cooperative Earnings Breakdown (Fair Split):</div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Worker Direct Earnings (95%):</span>
                <strong>₹{invoice.worker_earnings?.toFixed(2)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Cooperative Welfare Fund (5%):</span>
                <strong>₹{invoice.coop_fee?.toFixed(2)}</strong>
              </div>
              <div style={{ borderTop: "1px dashed #6ee7b7", margin: "6px 0" }} />
              <div style={{ fontSize: "0.73rem", color: "#047857" }}>
                Txn Ref: {invoice.transaction_ref} | Mode: {invoice.payment_method}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={handlePrint} className="btn btn-secondary">
                <Printer size={15} /> Print
              </button>
              <button onClick={handleDownload} disabled={downloading} className="btn btn-primary">
                {downloading ? <Loader size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Download size={15} />}
                {downloading ? "Downloading…" : "Download PDF"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
