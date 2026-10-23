import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// Fix Leaflet's default icon paths in bundled Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom Icons
const customerIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const workerIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Helper component to center map on coordinates update
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export const LeafletWorkerMap = ({ customerPos = [18.5204, 73.8567], workers = [], onSelectWorker }) => {
  return (
    <div style={{ width: "100%", height: "380px", position: "relative", borderRadius: "10px", overflow: "hidden" }}>
      <MapContainer
        center={customerPos}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <ChangeView center={customerPos} zoom={13} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Customer Location Pin */}
        <Marker position={customerPos} icon={customerIcon}>
          <Popup>
            <div style={{ textAlign: "center" }}>
              <strong>📍 Your Location</strong>
              <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Pune Service Area</div>
            </div>
          </Popup>
        </Marker>

        {/* Workers Pins */}
        {workers.map((item) => {
          const w = item.worker || item;
          const lat = w.lat || 18.5204;
          const lon = w.lon || 73.8567;
          const scores = item.scores;

          return (
            <Marker key={w.id} position={[lat, lon]} icon={workerIcon}>
              <Popup>
                <div style={{ minWidth: "180px" }}>
                  <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "0.95rem" }}>
                    {w.full_name}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#059669", fontWeight: "600", marginBottom: "4px" }}>
                    ✓ Verified Cooperative Worker
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#475569" }}>
                    ⭐ {w.average_rating} ({w.total_jobs_completed} jobs)
                  </div>
                  {scores && (
                    <div style={{ fontSize: "0.8rem", color: "#2563eb", fontWeight: "600", margin: "4px 0" }}>
                      Distance: {scores.distance_km} km (ETA: {scores.eta_minutes} mins)
                    </div>
                  )}
                  {onSelectWorker && (
                    <button
                      onClick={() => onSelectWorker(w)}
                      className="btn btn-primary"
                      style={{ width: "100%", padding: "5px 10px", fontSize: "0.75rem", marginTop: "8px" }}
                    >
                      Book Worker
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
