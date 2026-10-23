import React, { useState } from "react";
import { ratingAPI } from "../services/api";
import { Star, X } from "lucide-react";

export const RatingModal = ({ booking, onClose, onSuccess }) => {
  const [score, setScore] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await ratingAPI.submitRating({
        booking_id: booking.id,
        score,
        feedback,
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to submit rating.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "460px" }}>
        <button onClick={onClose} className="modal-close"><X size={18} /></button>

        <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "4px", color: "#0f172a" }}>
          Rate Cooperative Worker
        </h3>
        <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "16px" }}>
          Your honest rating helps the cooperative recognize exceptional craftsmanship.
        </p>

        {error && (
          <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px", borderRadius: "6px", fontSize: "0.85rem", marginBottom: "14px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", margin: "20px 0" }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                onClick={() => setScore(star)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: star <= score ? "#f59e0b" : "#cbd5e1",
                  transition: "transform 0.1s",
                }}
              >
                <Star size={34} fill={star <= score ? "#f59e0b" : "none"} />
              </button>
            ))}
          </div>

          <div className="form-group">
            <label className="form-label">Review / Feedback (Optional)</label>
            <textarea
              className="form-input"
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Punctual, skilled, clean work, fair cooperative service..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: "100%", padding: "12px", fontSize: "1rem" }}
          >
            {loading ? "Submitting Rating..." : "Submit Review"}
          </button>
        </form>
      </div>
    </div>
  );
};
