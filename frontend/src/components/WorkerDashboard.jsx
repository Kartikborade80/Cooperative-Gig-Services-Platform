import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { workerAPI, bookingAPI, welfareAPI } from "../services/api";
import {
  ShieldCheck, Wrench, DollarSign, HeartHandshake, 
  MapPin, Clock, CheckCircle, Navigation, Award, AlertCircle, XCircle
} from "lucide-react";

export const WorkerDashboard = () => {
  const { user, t } = useAuth();
  const [profile, setProfile] = useState(null);
  const [welfare, setWelfare] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Completion modal state
  const [completingJob, setCompletingJob] = useState(null);
  const [labourCharge, setLabourCharge] = useState(350);
  const [materialCharge, setMaterialCharge] = useState(0);

  useEffect(() => {
    loadWorkerData();
  }, []);

  const loadWorkerData = async () => {
    setLoading(true);
    try {
      const [profRes, welfRes, jobsRes] = await Promise.all([
        workerAPI.getWorkerMe(),
        welfareAPI.getMyWelfare(),
        bookingAPI.getBookings(),
      ]);
      setProfile(profRes.data);
      setWelfare(welfRes.data);
      setJobs(jobsRes.data);
    } catch (err) {
      console.error("Failed to load worker data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async (isAvail) => {
    try {
      const res = await workerAPI.updateAvailability({
        is_available: isAvail,
      });
      setProfile(res.data);
    } catch (err) {
      alert("Failed to update availability.");
    }
  };

  const handleToggleEmergency = async (isEmerg) => {
    try {
      const res = await workerAPI.updateAvailability({
        is_available: profile.is_available,
        emergency_available: isEmerg,
      });
      setProfile(res.data);
    } catch (err) {
      alert("Failed to update emergency duty.");
    }
  };

  const handleTransitionStatus = async (bookingId, newStatus, extra = {}) => {
    try {
      await bookingAPI.updateStatus(bookingId, {
        status: newStatus,
        ...extra,
      });
      loadWorkerData();
    } catch (err) {
      alert("Status update failed: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleCancelJob = async (job) => {
    const reason = window.prompt("Reason for declining/cancelling this job assignment:", "Schedule conflict / emergency");
    if (reason === null) return;
    try {
      await bookingAPI.cancelBooking(job.id, reason || "Worker unable to attend");
      alert(`Job #${job.booking_ref} cancelled. The customer has been notified to re-book.`);
      loadWorkerData();
    } catch (err) {
      alert("Failed to cancel job: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleCompleteService = async (e) => {
    e.preventDefault();
    if (!completingJob) return;

    await handleTransitionStatus(completingJob.id, "COMPLETED", {
      labour_charge: parseFloat(labourCharge),
      material_charge: parseFloat(materialCharge),
    });
    setCompletingJob(null);
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "60px" }}>Loading Worker Dashboard...</div>;
  }

  return (
    <div>
      {/* Header and Online Availability Toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h1 style={{ fontSize: "1.6rem", fontWeight: "800", color: "#0f172a" }}>
              {profile?.full_name}
            </h1>
            <span className="badge badge-coop">✓ Verified Cooperative Worker</span>
          </div>
          <p style={{ color: "#64748b", fontSize: "0.88rem" }}>
            {profile?.cooperative_name} • Member Since 2022
          </p>
        </div>

        {/* Status controls */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ background: "white", padding: "8px 14px", borderRadius: "10px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: "600" }}>{t("workerAvailability")}:</span>
            <button
              onClick={() => handleToggleAvailability(!profile?.is_available)}
              className={`btn ${profile?.is_available ? "btn-primary" : "btn-secondary"}`}
              style={{ padding: "4px 10px", fontSize: "0.8rem" }}
            >
              {profile?.is_available ? "🟢 " + t("online") : "⚪ " + t("offline")}
            </button>
          </div>

          <div style={{ background: "white", padding: "8px 14px", borderRadius: "10px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: "600" }}>Emergency Callout:</span>
            <button
              onClick={() => handleToggleEmergency(!profile?.emergency_available)}
              className={`btn ${profile?.emergency_available ? "btn-emergency" : "btn-secondary"}`}
              style={{ padding: "4px 10px", fontSize: "0.8rem" }}
            >
              {profile?.emergency_available ? "🚨 Active" : "Off"}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid-4" style={{ marginBottom: "24px" }}>
        <div className="card">
          <div style={{ color: "#059669", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", fontWeight: "700" }}>
            <DollarSign size={18} /> {t("totalEarnings")}
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#0f172a", marginTop: "6px" }}>
            ₹{profile?.total_jobs_completed ? (profile.total_jobs_completed * 380).toFixed(0) : "0"}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>Direct 95% worker payout</div>
        </div>

        <div className="card">
          <div style={{ color: "#2563eb", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", fontWeight: "700" }}>
            <CheckCircle size={18} /> Jobs Completed
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#0f172a", marginTop: "6px" }}>
            {profile?.total_jobs_completed || 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>Reliability Score: {profile?.reliability_score}%</div>
        </div>

        <div className="card">
          <div style={{ color: "#f59e0b", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", fontWeight: "700" }}>
            <Award size={18} /> Rating & Reputation
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#0f172a", marginTop: "6px" }}>
            {profile?.average_rating} ★
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>{profile?.rating_count} customer reviews</div>
        </div>

        <div className="card">
          <div style={{ color: "#059669", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", fontWeight: "700" }}>
            <HeartHandshake size={18} /> Welfare Fund Balance
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#059669", marginTop: "6px" }}>
            ₹{welfare?.balance?.toFixed(0) || "4850"}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#047857", marginTop: "2px" }}>Emergency Medical Eligible ✓</div>
        </div>
      </div>

      {/* Main Jobs & Welfare Split Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "24px" }}>
        {/* Assigned Jobs & Lifecycle Actions */}
        <div>
          <h3 className="card-title" style={{ marginBottom: "14px" }}>
            <Clock size={20} /> Assigned Service Jobs ({jobs.length})
          </h3>

          {jobs.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
              No current jobs assigned. Keep your availability status Online to receive incoming requests!
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {jobs.map((job) => (
                <div key={job.id} className="card" style={{ borderLeft: "4px solid #2563eb" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <h4 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>{job.service_name}</h4>
                        {job.is_emergency && <span className="badge badge-red">EMERGENCY</span>}
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
                        Booking #{job.booking_ref} • Customer: <strong>{job.customer_name}</strong>
                      </div>
                    </div>

                    <span className="badge badge-blue">{job.status}</span>
                  </div>

                  <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "12px" }}>
                    <div>📍 <strong>Address:</strong> {job.address}</div>
                    <div style={{ marginTop: "4px" }}>📝 <strong>Problem:</strong> {job.problem_description || "Standard Service"}</div>
                  </div>

                  {/* Progressive action button based on current status */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "6px" }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#059669" }}>
                      Estimated Fee: ₹{job.total_amount || job.labour_charge}
                    </div>

                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {job.status === "WORKER_ASSIGNED" && (
                        <>
                          <button
                            onClick={() => handleTransitionStatus(job.id, "ACCEPTED")}
                            className="btn btn-primary"
                            style={{ padding: "6px 14px" }}
                          >
                            <CheckCircle size={16} /> {t("acceptJob")}
                          </button>
                          <button
                            onClick={() => handleCancelJob(job)}
                            className="btn btn-secondary"
                            style={{ padding: "6px 12px", color: "#dc2626", borderColor: "#fecaca" }}
                            title="Decline this job assignment"
                          >
                            <XCircle size={16} /> Decline
                          </button>
                        </>
                      )}

                      {job.status === "ACCEPTED" && (
                        <>
                          <button
                            onClick={() => handleTransitionStatus(job.id, "ON_THE_WAY")}
                            className="btn btn-navy"
                            style={{ padding: "6px 14px" }}
                          >
                            <Navigation size={16} /> {t("startTravel")}
                          </button>
                          <button
                            onClick={() => handleCancelJob(job)}
                            className="btn btn-secondary"
                            style={{ padding: "6px 12px", color: "#dc2626", borderColor: "#fecaca" }}
                            title="Cancel accepted job assignment"
                          >
                            <XCircle size={16} /> Cancel
                          </button>
                        </>
                      )}

                      {job.status === "ON_THE_WAY" && (
                        <button
                          onClick={() => handleTransitionStatus(job.id, "ARRIVED")}
                          className="btn btn-navy"
                          style={{ padding: "6px 14px" }}
                        >
                          <MapPin size={16} /> {t("markArrived")}
                        </button>
                      )}

                      {job.status === "ARRIVED" && (
                        <button
                          onClick={() => handleTransitionStatus(job.id, "SERVICE_STARTED")}
                          className="btn btn-navy"
                          style={{ padding: "6px 14px" }}
                        >
                          <Wrench size={16} /> {t("startService")}
                        </button>
                      )}

                      {job.status === "SERVICE_STARTED" && (
                        <button
                          onClick={() => {
                            setCompletingJob(job);
                            setLabourCharge(job.labour_charge || 350);
                          }}
                          className="btn btn-primary"
                          style={{ padding: "6px 14px" }}
                        >
                          <CheckCircle size={16} /> {t("completeJob")}
                        </button>
                      )}

                      {job.status === "COMPLETED" && (
                        <span style={{ fontSize: "0.82rem", color: "#f59e0b", fontWeight: "600" }}>
                          Waiting for customer UPI payment...
                        </span>
                      )}

                      {job.status === "PAID" && (
                        <span style={{ fontSize: "0.82rem", color: "#059669", fontWeight: "700" }}>
                          ✓ Payment Received & Closed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Worker Welfare & Social Security Card */}
        <div>
          <h3 className="card-title" style={{ marginBottom: "14px" }}>
            <HeartHandshake size={20} color="#059669" /> Cooperative Social Security & Welfare
          </h3>

          <div className="card" style={{ background: "linear-gradient(145deg, #ffffff 0%, #f0fdf4 100%)", border: "1px solid #a7f3d0" }}>
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", fontWeight: "700" }}>
                {t("insuranceCover")}
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0f172a", marginTop: "4px" }}>
                ₹5,00,000 Group Accident & Health Cover
              </div>
              <div style={{ fontSize: "0.8rem", color: "#059669", fontWeight: "600", marginTop: "2px" }}>
                Policy: {welfare?.insurance_policy || "MH-COOP-LIFE-90412"} • Active 2026
              </div>
            </div>

            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "14px", marginBottom: "16px" }}>
              <div style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", fontWeight: "700" }}>
                Cooperative Welfare Contribution
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "0.9rem" }}>
                <span>Accumulated Welfare Fund:</span>
                <strong>₹{welfare?.balance || 4850}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "0.9rem" }}>
                <span>Emergency Grant Eligibility:</span>
                <strong style={{ color: "#059669" }}>Approved ✓</strong>
              </div>
            </div>

            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "14px" }}>
              <div style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", fontWeight: "700", marginBottom: "8px" }}>
                Verified Skills & Certifications
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem" }}>
                <div style={{ background: "white", padding: "6px 10px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                  🏆 Maharashtra State Plumbing Skills Council Certified
                </div>
                <div style={{ background: "white", padding: "6px 10px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                  ⚡ High-Rise Piping & CPVC Safety Standard (NSDC)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Complete Job Modal */}
      {completingJob && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "440px" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "4px" }}>
              Complete Service #{completingJob.booking_ref}
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "16px" }}>
              Enter the finalized charges for customer bill generation.
            </p>

            <form onSubmit={handleCompleteService}>
              <div className="form-group">
                <label className="form-label">Labour Charge (INR)</label>
                <input
                  type="number"
                  required
                  className="form-input"
                  value={labourCharge}
                  onChange={(e) => setLabourCharge(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Material / Spares Replaced (INR, if any)</label>
                <input
                  type="number"
                  className="form-input"
                  value={materialCharge}
                  onChange={(e) => setMaterialCharge(e.target.value)}
                />
              </div>

              <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "6px", marginBottom: "16px", fontSize: "0.85rem" }}>
                <div>Total to be billed: <strong>₹{parseFloat(labourCharge || 0) + parseFloat(materialCharge || 0)}</strong></div>
                <div style={{ color: "#059669", fontSize: "0.78rem" }}>
                  Your direct payout (95%): ₹{((parseFloat(labourCharge || 0) + parseFloat(materialCharge || 0)) * 0.95).toFixed(2)}
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setCompletingJob(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Confirm & Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
