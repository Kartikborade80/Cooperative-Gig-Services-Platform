import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { serviceAPI, matchingAPI, bookingAPI, invoiceAPI } from "../services/api";
import { LeafletWorkerMap } from "./LeafletWorkerMap";
import { UPIPaymentModal } from "./UPIPaymentModal";
import { InvoiceModal } from "./InvoiceModal";
import { RatingModal } from "./RatingModal";
import { ComplaintModal } from "./ComplaintModal";
import {
  Sparkles, AlertTriangle, ShieldCheck, MapPin,
  Clock, CheckCircle2, Star, CreditCard,
  FileText, Wrench, Phone, MessageCircle,
  Navigation, RefreshCw, User, Home, X,
  ThumbsUp, ThumbsDown, Send, Download
} from "lucide-react";

const STATUS_TABS = [
  { key: "all", label: "All Bookings" },
  { key: "pending", label: "Pending / Assigned" },
  { key: "active", label: "Active Service" },
  { key: "completed", label: "Completed / Paid" },
  { key: "cancelled", label: "Cancelled" },
];

const PENDING_STATUSES = ["REQUESTED", "WORKER_ASSIGNED", "PRICE_PROPOSED"];
const ACTIVE_STATUSES = ["ACCEPTED", "ON_THE_WAY", "ARRIVED", "SERVICE_STARTED", "COMPLETED", "PAYMENT_PENDING"];
const DONE_STATUSES = ["PAID", "RATED", "CLOSED"];

export const CustomerDashboard = () => {
  const { user, t } = useAuth();

  // Location
  const [useGPS, setUseGPS] = useState(false);
  const [pincode, setPincode] = useState(user?.pincode || "423601");
  const [customerPos, setCustomerPos] = useState([user?.lat || 19.8917, user?.lon || 74.4795]);
  const [locationLabel, setLocationLabel] = useState(user?.city || "Kopargaon");
  const [gpsLoading, setGpsLoading] = useState(false);

  // Categories & services
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedService, setSelectedService] = useState(null);

  // AI
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Workers
  const [workers, setWorkers] = useState([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);

  // Bookings
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  // Modals
  const [selectedBookingForPay, setSelectedBookingForPay] = useState(null);
  const [selectedBookingForInvoice, setSelectedBookingForInvoice] = useState(null);
  const [selectedBookingForRate, setSelectedBookingForRate] = useState(null);
  const [selectedBookingForComplaint, setSelectedBookingForComplaint] = useState(null);

  // Booking creation
  const [bookingWorker, setBookingWorker] = useState(null);
  const [bookingAddress, setBookingAddress] = useState(user?.address || "");
  const [bookingPincode, setBookingPincode] = useState(user?.pincode || "423601");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTimeSlot, setBookingTimeSlot] = useState("");
  const [bookingProblem, setBookingProblem] = useState("");
  const [creatingBooking, setCreatingBooking] = useState(false);

  // Messaging
  const [messagingBooking, setMessagingBooking] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  // Price counter-offer
  const [priceActionBooking, setPriceActionBooking] = useState(null);

  const TIME_SLOTS = [
    "09:00 AM - 10:00 AM", "11:00 AM - 12:00 PM",
    "02:00 PM - 03:00 PM", "04:00 PM - 05:00 PM", "06:00 PM - 07:00 PM"
  ];

  useEffect(() => {
    loadCategories();
    loadBookings();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await serviceAPI.getCategories();
      setCategories(res.data);
      if (res.data.length > 0) {
        setSelectedCategory(res.data[0]);
        if (res.data[0].services?.length > 0) {
          const svc = res.data[0].services[0];
          setSelectedService(svc);
          fetchMatchingWorkers(svc.id, customerPos[0], customerPos[1]);
        }
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  };

  const loadBookings = async () => {
    setLoadingBookings(true);
    try {
      const res = await bookingAPI.getBookings();
      setBookings(res.data);
    } catch (err) {
      console.error("Failed to load bookings:", err);
    } finally {
      setLoadingBookings(false);
    }
  };

  const fetchMatchingWorkers = async (serviceId, lat, lon, isEmergency = false) => {
    setLoadingWorkers(true);
    try {
      const res = await matchingAPI.findWorkers({
        service_id: serviceId,
        lat: lat,
        lon: lon,
        is_emergency: isEmergency,
      });
      setWorkers(res.data);
    } catch (err) {
      console.error("Failed to match workers:", err);
    } finally {
      setLoadingWorkers(false);
    }
  };

  const handleGetGPS = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setCustomerPos([lat, lon]);
        setLocationLabel(`GPS: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
        setUseGPS(true);
        if (selectedService) fetchMatchingWorkers(selectedService.id, lat, lon);
        setGpsLoading(false);
      },
      (err) => {
        alert("Could not get GPS location: " + err.message);
        setGpsLoading(false);
      }
    );
  };

  const handlePincodeSearch = () => {
    const pin = pincode.trim();
    if (pin.length < 6) { alert("Please enter a valid 6-digit pincode."); return; }
    // Kopargaon 423601 → default coords; otherwise use as-is with fallback
    const pincodeCoords = {
      "423601": [19.8917, 74.4795],
      "422001": [19.9975, 73.7898],
      "411001": [18.5204, 73.8567],
    };
    const coords = pincodeCoords[pin] || [19.8917 + (Math.random() - 0.5) * 0.2, 74.4795 + (Math.random() - 0.5) * 0.2];
    setCustomerPos(coords);
    setLocationLabel(`PIN: ${pin}`);
    if (selectedService) fetchMatchingWorkers(selectedService.id, coords[0], coords[1]);
  };

  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat);
    setSelectedService(null);
    setWorkers([]);
  };

  const handleSelectService = (svc) => {
    setSelectedService(svc);
    fetchMatchingWorkers(svc.id, customerPos[0], customerPos[1]);
  };

  const handleAiDiagnose = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await matchingAPI.aiAssistant(aiPrompt);
      setAiResult(res.data);
      setBookingProblem(aiPrompt);
      if (res.data.suggested_service_id) {
        fetchMatchingWorkers(res.data.suggested_service_id, customerPos[0], customerPos[1]);
      } else if (selectedService) {
        fetchMatchingWorkers(selectedService.id, customerPos[0], customerPos[1]);
      }
    } catch (err) {
      console.error("AI Assistant error:", err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleEmergencyDispatch = async () => {
    const currentToken = localStorage.getItem("coop_gig_token");
    if (!currentToken) {
      alert("Please log in as a customer to request emergency dispatch.");
      return;
    }
    if (!window.confirm("Confirm 🚨 EMERGENCY CALLOUT? The system will dispatch the nearest verified emergency-duty worker.")) return;
    const srvId = selectedService?.id || 1;
    try {
      const res = await bookingAPI.createEmergency({
        service_id: srvId,
        address: bookingAddress || user?.address || "Kopargaon",
        lat: customerPos[0],
        lon: customerPos[1],
        problem_description: "EMERGENCY: Immediate assistance requested.",
        is_emergency: true,
      });
      alert(`Emergency Booking #${res.data.booking_ref} created! Worker dispatched.`);
      loadBookings();
    } catch (err) {
      if (err.response?.status === 401) {
        alert("Your session has expired. Please sign in again and retry emergency dispatch.");
      } else {
        alert("Emergency dispatch failed: " + (err.response?.data?.detail || err.message));
      }
    }
  };

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    if (!selectedService) return;
    setCreatingBooking(true);
    try {
      const res = await bookingAPI.createBooking({
        service_id: selectedService.id,
        worker_id: bookingWorker?.id || null,
        address: bookingAddress,
        pincode: bookingPincode,
        lat: customerPos[0],
        lon: customerPos[1],
        booking_date: bookingDate || undefined,
        time_slot: bookingTimeSlot || undefined,
        problem_description: bookingProblem || selectedService.name,
        city: locationLabel.includes("PIN") ? "" : user?.city || "Kopargaon",
        district: user?.district || "Ahmednagar",
      });
      alert(`✅ Booking #${res.data.booking_ref} placed! Worker notified via email and in-app.`);
      setBookingWorker(null);
      setBookingProblem("");
      setBookingDate("");
      setBookingTimeSlot("");
      loadBookings();
    } catch (err) {
      alert("Booking failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setCreatingBooking(false);
    }
  };

  const handleCancelBooking = async (booking) => {
    const reason = window.prompt("Please provide a reason for cancelling this booking request:", "Change of plans / booked another service");
    if (reason === null) return; // User pressed cancel in prompt
    try {
      await bookingAPI.cancelBooking(booking.id, reason || "Cancelled by customer");
      alert(`Booking #${booking.booking_ref} has been cancelled.`);
      loadBookings();
    } catch (err) {
      alert("Failed to cancel booking: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleRespondPrice = async (bookingId, action) => {
    try {
      await bookingAPI.respondPrice(bookingId, { action });
      loadBookings();
      setPriceActionBooking(null);
    } catch (err) {
      alert("Failed: " + (err.response?.data?.detail || err.message));
    }
  };

  const openMessages = async (booking) => {
    setMessagingBooking(booking);
    try {
      const res = await bookingAPI.getMessages(booking.id);
      setMessages(res.data);
    } catch (err) {
      console.error("Failed to load messages", err);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !messagingBooking) return;
    setSendingMsg(true);
    try {
      const res = await bookingAPI.sendMessage(messagingBooking.id, newMessage.trim());
      setMessages((prev) => [...prev, res.data]);
      setNewMessage("");
    } catch (err) {
      alert("Failed to send message.");
    } finally {
      setSendingMsg(false);
    }
  };

  const handleDownloadPDF = async (bookingId) => {
    try {
      const token = localStorage.getItem("coop_gig_token");
      const response = await fetch(`/api/invoices/${bookingId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Invoice not found or not yet paid");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice_Booking_${bookingId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("PDF Download failed: " + err.message);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      REQUESTED: <span className="badge badge-blue">Requested</span>,
      WORKER_ASSIGNED: <span className="badge badge-blue">Worker Assigned</span>,
      PRICE_PROPOSED: <span className="badge badge-yellow">⚡ Price Proposed</span>,
      ACCEPTED: <span className="badge badge-green">Accepted ✓</span>,
      ON_THE_WAY: <span className="badge badge-yellow">🚗 On The Way</span>,
      ARRIVED: <span className="badge badge-yellow">📍 Arrived</span>,
      SERVICE_STARTED: <span className="badge badge-yellow">🔧 In Progress</span>,
      COMPLETED: <span className="badge badge-green">✅ Completed – Pay Now</span>,
      PAYMENT_PENDING: <span className="badge badge-yellow">💳 Payment Pending</span>,
      PAID: <span className="badge badge-green">💚 Paid & Verified</span>,
      RATED: <span className="badge badge-green">★ Rated</span>,
      CLOSED: <span className="badge badge-blue">Closed</span>,
      REJECTED: <span className="badge badge-red">Rejected</span>,
      CANCELLED: <span className="badge badge-red">Cancelled</span>,
    };
    return map[status] || <span className="badge badge-blue">{status}</span>;
  };

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === "pending") return PENDING_STATUSES.includes(b.status);
    if (activeTab === "active") return ACTIVE_STATUSES.includes(b.status);
    if (activeTab === "completed") return DONE_STATUSES.includes(b.status);
    if (activeTab === "cancelled") return b.status === "CANCELLED" || b.status === "REJECTED";
    return true;
  });

  const pendingCount = bookings.filter((b) => PENDING_STATUSES.includes(b.status)).length;
  const activeCount = bookings.filter((b) => ACTIVE_STATUSES.includes(b.status)).length;
  const cancelledCount = bookings.filter((b) => b.status === "CANCELLED" || b.status === "REJECTED").length;

  return (
    <div>
      {/* Welcome Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "800", color: "#0f172a" }}>
            Welcome, {user?.full_name} 👋
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.88rem" }}>
            Book certified workers from Maharashtra Labour Cooperative Society.
          </p>
        </div>
        <button onClick={handleEmergencyDispatch} className="btn btn-emergency">
          <AlertTriangle size={17} />
          <span>{t("emergencyBtn")}</span>
        </button>
      </div>

      {/* ── LOCATION PANEL ── */}
      <div className="card" style={{ marginBottom: "20px", padding: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", fontWeight: "700", color: "#0f172a" }}>
          <MapPin size={18} color="#2563eb" /> Your Service Location
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={handleGetGPS}
            disabled={gpsLoading}
            className="btn btn-secondary"
            style={{ fontSize: "0.85rem" }}
          >
            <Navigation size={15} />
            {gpsLoading ? "Getting Location..." : "Use My Live GPS"}
          </button>
          <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>or enter PIN:</span>
          <input
            type="text"
            className="form-input"
            style={{ width: "110px", padding: "6px 10px", fontSize: "0.85rem" }}
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            maxLength={6}
            placeholder="423601"
          />
          <button onClick={handlePincodeSearch} className="btn btn-primary" style={{ fontSize: "0.85rem" }}>
            Search Area
          </button>
          {locationLabel && (
            <span style={{ fontSize: "0.82rem", color: "#059669", fontWeight: "600" }}>
              📍 {locationLabel}
            </span>
          )}
        </div>
      </div>

      {/* ── AI SERVICE ASSISTANT ── */}
      <div className="ai-box" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#059669", fontWeight: "700" }}>
          <Sparkles size={20} />
          <span>{t("aiAssistantTitle")}</span>
        </div>
        <p style={{ fontSize: "0.83rem", color: "#475569", marginTop: "4px" }}>{t("aiAssistantSubtitle")}</p>
        <form onSubmit={handleAiDiagnose} className="ai-input-wrapper">
          <input
            type="text" className="ai-textarea" value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder={t("aiPlaceholder")}
          />
          <button type="submit" disabled={aiLoading} className="btn btn-primary" style={{ padding: "0 20px" }}>
            {aiLoading ? "Analyzing..." : t("aiDiagnoseBtn")}
          </button>
        </form>
        {aiResult && (
          <div style={{ marginTop: "12px", background: "white", padding: "12px", borderRadius: "8px", border: "1px solid #bbf7d0", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px", fontSize: "0.83rem" }}>
            <div><span style={{ color: "#64748b" }}>Category:</span><div style={{ fontWeight: "700" }}>{aiResult.category}</div></div>
            <div><span style={{ color: "#64748b" }}>Problem:</span><div style={{ fontWeight: "700" }}>{aiResult.problem}</div></div>
            <div><span style={{ color: "#64748b" }}>Urgency:</span><div style={{ fontWeight: "700", color: aiResult.urgency === "High" ? "#ef4444" : "#059669" }}>{aiResult.urgency}</div></div>
            <div><span style={{ color: "#64748b" }}>Required Skill:</span><div style={{ fontWeight: "700", color: "#2563eb" }}>{aiResult.required_skill}</div></div>
          </div>
        )}
      </div>

      {/* ── CATEGORY & SERVICE SELECTION ── */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <h3 className="card-title" style={{ marginBottom: "12px" }}>
          <Wrench size={17} /> 1. Select Category
        </h3>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleSelectCategory(cat)}
              className={`btn ${selectedCategory?.id === cat.id ? "btn-primary" : "btn-secondary"}`}
              style={{ fontSize: "0.83rem", whiteSpace: "nowrap" }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {selectedCategory && (
          <>
            <h3 className="card-title" style={{ marginBottom: "10px" }}>
              2. Select Service under "{selectedCategory.name}"
            </h3>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {(selectedCategory.services || []).map((svc) => (
                <button
                  key={svc.id}
                  onClick={() => handleSelectService(svc)}
                  className={`btn ${selectedService?.id === svc.id ? "btn-primary" : "btn-secondary"}`}
                  style={{ fontSize: "0.82rem" }}
                >
                  {svc.name}
                  <span style={{ opacity: 0.8, fontSize: "0.75rem" }}>  ₹{svc.base_price}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── WORKERS + MAP ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "20px", marginBottom: "28px" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <h3 className="card-title">
              <ShieldCheck size={18} color="#059669" />
              {t("nearbyVerifiedWorkers")} ({workers.length})
            </h3>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Within 20 KM radius</span>
          </div>

          {loadingWorkers ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
              <RefreshCw size={20} style={{ animation: "spin 1s linear infinite" }} /> Matching workers…
            </div>
          ) : !selectedService ? (
            <div className="card" style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>
              Select a category & service above to see matched workers.
            </div>
          ) : workers.length === 0 ? (
            <div className="card" style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
              No verified workers found in 20 KM for {selectedService.name}.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {workers.map((item) => {
                const w = item.worker;
                const sc = item.scores;
                return (
                  <div key={w.id} className="card" style={{ borderLeft: "4px solid #059669" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <h4 style={{ fontWeight: "700", color: "#0f172a" }}>{w.full_name}</h4>
                          <span className="badge badge-coop" style={{ fontSize: "0.68rem" }}>✓ Verified</span>
                          {item.consumer_badge && (
                            <span className="badge badge-green" style={{ fontSize: "0.68rem" }}>{item.consumer_badge}</span>
                          )}
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "2px" }}>
                          {w.service_area} • {w.experience_years} yrs exp • ₹{w.starting_price}+
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "#334155", marginTop: "2px" }}>
                          🏷️ {w.categories?.map(c => c.category_name).join(", ") || "General"}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "#059669" }}>{sc.final_score}%</div>
                        <span style={{ fontSize: "0.7rem", color: "#64748b" }}>Match Score</span>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "6px", margin: "10px 0", background: "#f8fafc", padding: "8px", borderRadius: "6px", fontSize: "0.73rem" }}>
                      <div><span style={{ color: "#64748b" }}>Skill: </span><strong>{sc.skill_match}%</strong></div>
                      <div><span style={{ color: "#64748b" }}>Avail: </span><strong>{sc.availability}%</strong></div>
                      <div><span style={{ color: "#64748b" }}>Dist: </span><strong>{sc.distance_km}km</strong></div>
                      <div><span style={{ color: "#64748b" }}>Reliability: </span><strong>{sc.reliability}%</strong></div>
                      <div><span style={{ color: "#64748b" }}>Rating: </span><strong>{w.average_rating}★</strong></div>
                      <div><span style={{ color: "#059669" }}>Fair: </span><strong style={{ color: "#059669" }}>{sc.fairness_factor}%</strong></div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.8rem", color: "#2563eb", fontWeight: "600" }}>
                        ⏱ ETA: ~{sc.eta_minutes} min
                      </span>
                      <button
                        onClick={() => setBookingWorker(w)}
                        className="btn btn-primary"
                        style={{ padding: "5px 12px", fontSize: "0.83rem" }}
                      >
                        {t("bookNow")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Map */}
        <div>
          <h3 className="card-title" style={{ marginBottom: "10px" }}>
            <MapPin size={18} color="#2563eb" /> Worker Locations Map
          </h3>
          <div className="card" style={{ padding: "8px" }}>
            <LeafletWorkerMap
              customerPos={customerPos}
              workers={workers}
              onSelectWorker={(w) => setBookingWorker(w)}
            />
            <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "8px", display: "flex", justifyContent: "space-between" }}>
              <span>📍 Blue: Your Location</span>
              <span>🟢 Green: Verified Workers</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── BOOKING HISTORY ── */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
          <h3 className="card-title">
            <Clock size={18} /> My Bookings ({bookings.length})
          </h3>
          <button onClick={loadBookings} className="btn btn-secondary" style={{ fontSize: "0.8rem", padding: "4px 10px" }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "14px", flexWrap: "wrap" }}>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`btn ${activeTab === tab.key ? "btn-primary" : "btn-secondary"}`}
              style={{ fontSize: "0.8rem", padding: "4px 10px", position: "relative" }}
            >
              {tab.label}
              {tab.key === "pending" && pendingCount > 0 && (
                <span style={{ position: "absolute", top: "-6px", right: "-6px", background: "#ef4444", color: "white", borderRadius: "50%", width: "18px", height: "18px", fontSize: "0.65rem", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700" }}>
                  {pendingCount}
                </span>
              )}
              {tab.key === "active" && activeCount > 0 && (
                <span style={{ position: "absolute", top: "-6px", right: "-6px", background: "#f59e0b", color: "white", borderRadius: "50%", width: "18px", height: "18px", fontSize: "0.65rem", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700" }}>
                  {activeCount}
                </span>
              )}
              {tab.key === "cancelled" && cancelledCount > 0 && (
                <span style={{ position: "absolute", top: "-6px", right: "-6px", background: "#94a3b8", color: "white", borderRadius: "50%", width: "18px", height: "18px", fontSize: "0.65rem", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700" }}>
                  {cancelledCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {loadingBookings ? (
          <div style={{ textAlign: "center", padding: "30px" }}>Loading bookings…</div>
        ) : filteredBookings.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
            {activeTab === "all" ? "No bookings yet. Book a worker above!" : `No ${activeTab} bookings.`}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {filteredBookings.map((b) => (
              <div key={b.id} className="card" style={{ borderLeft: `4px solid ${DONE_STATUSES.includes(b.status) ? "#059669" : PENDING_STATUSES.includes(b.status) ? "#2563eb" : "#f59e0b"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <div style={{ fontWeight: "800", color: "#0f172a" }}>{b.booking_ref}</div>
                    <div style={{ fontSize: "0.82rem", color: "#334155" }}>
                      {b.service_name} • <strong>{b.worker_name || "Assigning..."}</strong>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "2px" }}>
                      📅 {b.booking_date || new Date(b.created_at).toLocaleDateString()}
                      {b.time_slot ? ` • ${b.time_slot}` : ""}
                    </div>
                    {b.address && (
                      <div style={{ fontSize: "0.78rem", color: "#64748b" }}>📍 {b.address}</div>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {getStatusBadge(b.status)}
                    <div style={{ fontWeight: "800", color: "#059669", fontSize: "1rem", marginTop: "4px" }}>
                      ₹{b.total_amount || b.labour_charge || 0}
                    </div>
                    {b.is_emergency && <span className="badge badge-red" style={{ fontSize: "0.65rem" }}>EMERGENCY</span>}
                  </div>
                </div>

                {/* Price Proposed — action row */}
                {b.status === "PRICE_PROPOSED" && b.worker_proposed_price && (
                  <div style={{ marginTop: "10px", background: "#fef9c3", border: "1px solid #fde68a", borderRadius: "8px", padding: "10px", fontSize: "0.85rem" }}>
                    <strong>Worker proposed price:</strong> ₹{b.worker_proposed_price}
                    {b.original_estimated_price && (
                      <span style={{ color: "#64748b" }}> (Original estimate: ₹{b.original_estimated_price})</span>
                    )}
                    <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                      <button
                        onClick={() => handleRespondPrice(b.id, "ACCEPT")}
                        className="btn btn-primary"
                        style={{ padding: "4px 12px", fontSize: "0.8rem" }}
                      >
                        <ThumbsUp size={13} /> Accept ₹{b.worker_proposed_price}
                      </button>
                      <button
                        onClick={() => handleRespondPrice(b.id, "REJECT")}
                        className="btn btn-secondary"
                        style={{ padding: "4px 12px", fontSize: "0.8rem", color: "#ef4444" }}
                      >
                        <ThumbsDown size={13} /> Decline
                      </button>
                    </div>
                  </div>
                )}

                {/* After ACCEPTED: show worker contact */}
                {["ACCEPTED", "ON_THE_WAY", "ARRIVED", "SERVICE_STARTED", "COMPLETED", "PAYMENT_PENDING", "PAID", "RATED"].includes(b.status) && b.worker_phone && (
                  <div style={{ marginTop: "8px", fontSize: "0.82rem", background: "#f0fdf4", border: "1px solid #a7f3d0", borderRadius: "6px", padding: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Phone size={14} color="#059669" />
                    <strong>Worker Contact:</strong> {b.worker_phone}
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: "flex", gap: "6px", marginTop: "10px", flexWrap: "wrap" }}>
                  {/* Pay */}
                  {(b.status === "COMPLETED" || b.status === "PAYMENT_PENDING") && (
                    <button onClick={() => setSelectedBookingForPay(b)} className="btn btn-primary" style={{ padding: "4px 10px", fontSize: "0.78rem" }}>
                      <CreditCard size={13} /> {t("payNow")}
                    </button>
                  )}

                  {/* View Invoice */}
                  {DONE_STATUSES.includes(b.status) && (
                    <button onClick={() => setSelectedBookingForInvoice(b.id)} className="btn btn-secondary" style={{ padding: "4px 10px", fontSize: "0.78rem" }}>
                      <FileText size={13} /> Invoice
                    </button>
                  )}

                  {/* Download PDF */}
                  {DONE_STATUSES.includes(b.status) && (
                    <button onClick={() => handleDownloadPDF(b.id)} className="btn btn-secondary" style={{ padding: "4px 10px", fontSize: "0.78rem" }}>
                      <Download size={13} /> PDF
                    </button>
                  )}

                  {/* Rate */}
                  {b.status === "PAID" && (
                    <button onClick={() => setSelectedBookingForRate(b)} className="btn btn-navy" style={{ padding: "4px 10px", fontSize: "0.78rem" }}>
                      <Star size={13} /> {t("rateWorker")}
                    </button>
                  )}

                  {/* Message — only after accepted */}
                  {["ACCEPTED", "ON_THE_WAY", "ARRIVED", "SERVICE_STARTED", "COMPLETED", "PAYMENT_PENDING"].includes(b.status) && (
                    <button onClick={() => openMessages(b)} className="btn btn-secondary" style={{ padding: "4px 10px", fontSize: "0.78rem" }}>
                      <MessageCircle size={13} /> Message Worker
                    </button>
                  )}

                  {/* Cancel Booking option for active/pending requests */}
                  {["REQUESTED", "MATCHING", "WORKER_ASSIGNED", "PRICE_PROPOSED", "ACCEPTED", "SCHEDULED"].includes(b.status) && (
                    <button
                      onClick={() => handleCancelBooking(b)}
                      className="btn btn-secondary"
                      style={{ padding: "4px 10px", fontSize: "0.78rem", color: "#dc2626", borderColor: "#fecaca", background: "#fef2f2" }}
                      title="Cancel this booking request"
                    >
                      <X size={13} /> Cancel Booking
                    </button>
                  )}

                  {/* Re-book / Find Another Worker for cancelled or rejected bookings */}
                  {(b.status === "CANCELLED" || b.status === "REJECTED") && (
                    <button
                      onClick={() => {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="btn btn-primary"
                      style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                      title="Find and book another available worker"
                    >
                      <RefreshCw size={13} /> Find Another Worker
                    </button>
                  )}

                  {/* Grievance */}
                  <button
                    onClick={() => setSelectedBookingForComplaint(b)}
                    className="btn btn-secondary"
                    style={{ padding: "4px 8px", fontSize: "0.72rem", color: "#ef4444" }}
                    title="Report Issue"
                  >
                    Grievance
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── BOOKING FORM MODAL ── */}
      {bookingWorker && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "500px" }}>
            <button onClick={() => setBookingWorker(null)} className="modal-close"><X size={18} /></button>
            <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "4px" }}>
              Book: {bookingWorker.full_name}
            </h3>
            <p style={{ fontSize: "0.8rem", color: "#059669", marginBottom: "16px" }}>
              ✓ Verified Cooperative Worker • Category: {bookingWorker.categories?.map(c => c.category_name).join(", ")}
            </p>

            <form onSubmit={handleCreateBooking}>
              {/* Category and service shown read-only */}
              <div className="form-group">
                <label className="form-label">Service</label>
                <input type="text" disabled className="form-input"
                  value={selectedService ? `${selectedService.name} (₹${selectedService.base_price} base)` : "—"} />
              </div>

              <div className="form-group">
                <label className="form-label">Service Address *</label>
                <input type="text" required className="form-input"
                  value={bookingAddress}
                  onChange={(e) => setBookingAddress(e.target.value)}
                  placeholder="House No., Street, Area..." />
              </div>

              <div className="form-group">
                <label className="form-label">Pincode</label>
                <input type="text" className="form-input" style={{ width: "120px" }}
                  value={bookingPincode}
                  onChange={(e) => setBookingPincode(e.target.value)} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div className="form-group">
                  <label className="form-label">Preferred Date</label>
                  <input type="date" className="form-input"
                    value={bookingDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setBookingDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Time Slot</label>
                  <select className="form-input" value={bookingTimeSlot} onChange={(e) => setBookingTimeSlot(e.target.value)}>
                    <option value="">Any time</option>
                    {TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Describe the Problem</label>
                <textarea className="form-input" rows={3}
                  value={bookingProblem}
                  onChange={(e) => setBookingProblem(e.target.value)}
                  placeholder="e.g., Kitchen pipe leaking under sink..." />
              </div>

              <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "6px", marginBottom: "14px", fontSize: "0.82rem" }}>
                <strong>Estimated Base Price:</strong> ₹{selectedService?.base_price || 0}
                <div style={{ color: "#64748b", marginTop: "2px" }}>Worker may propose a revised price after reviewing your request.</div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button type="button" onClick={() => setBookingWorker(null)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" disabled={creatingBooking} className="btn btn-primary" style={{ flex: 1 }}>
                  {creatingBooking ? "Booking…" : "✅ Confirm & Book"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MESSAGING MODAL ── */}
      {messagingBooking && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "480px", padding: "20px" }}>
            <button onClick={() => setMessagingBooking(null)} className="modal-close"><X size={18} /></button>
            <h3 style={{ fontWeight: "700", marginBottom: "4px", fontSize: "1.1rem" }}>
              <MessageCircle size={18} style={{ marginRight: "6px" }} />
              Chat — Booking #{messagingBooking.booking_ref}
            </h3>
            <p style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: "12px" }}>
              Worker: {messagingBooking.worker_name} {messagingBooking.worker_phone && `• 📞 ${messagingBooking.worker_phone}`}
            </p>

            <div style={{ height: "260px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px", display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px", background: "#f8fafc" }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0" }}>No messages yet. Start the conversation!</div>
              ) : messages.map((m) => {
                const isMe = m.sender_role === "CUSTOMER";
                return (
                  <div key={m.id} style={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                    <div style={{
                      background: isMe ? "#2563eb" : "white",
                      color: isMe ? "white" : "#0f172a",
                      padding: "8px 12px", borderRadius: isMe ? "12px 12px 0 12px" : "12px 12px 12px 0",
                      fontSize: "0.84rem", border: isMe ? "none" : "1px solid #e2e8f0"
                    }}>
                      {m.message}
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "#94a3b8", marginTop: "2px", textAlign: isMe ? "right" : "left" }}>
                      {m.sender_name} • {new Date(m.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                className="form-input"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <button onClick={sendMessage} disabled={sendingMsg || !newMessage.trim()} className="btn btn-primary" style={{ padding: "0 16px" }}>
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedBookingForPay && (
        <UPIPaymentModal booking={selectedBookingForPay} onClose={() => setSelectedBookingForPay(null)}
          onSuccess={() => { setSelectedBookingForPay(null); loadBookings(); }} />
      )}
      {selectedBookingForInvoice && (
        <InvoiceModal bookingId={selectedBookingForInvoice} onClose={() => setSelectedBookingForInvoice(null)}
          onDownloadPDF={handleDownloadPDF} />
      )}
      {selectedBookingForRate && (
        <RatingModal booking={selectedBookingForRate} onClose={() => setSelectedBookingForRate(null)}
          onSuccess={() => { setSelectedBookingForRate(null); loadBookings(); }} />
      )}
      {selectedBookingForComplaint && (
        <ComplaintModal booking={selectedBookingForComplaint} onClose={() => setSelectedBookingForComplaint(null)}
          onSuccess={() => setSelectedBookingForComplaint(null)} />
      )}
    </div>
  );
};
