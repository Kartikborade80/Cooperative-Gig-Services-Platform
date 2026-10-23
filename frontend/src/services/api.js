import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api` : "/api",
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token from localStorage automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("coop_gig_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Automatically handle 401 Unauthorized (expired token or invalid credentials)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || "";
      const isAuthAttempt = url.includes("/auth/login") || url.includes("/auth/register");
      if (!isAuthAttempt) {
        localStorage.removeItem("coop_gig_token");
        localStorage.removeItem("coop_gig_role");
        window.dispatchEvent(
          new CustomEvent("auth:unauthorized", {
            detail: error.response?.data?.detail || "Session expired",
          })
        );
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => API.post("/auth/login", data),
  loginOtp: (data) => API.post("/auth/login-otp", data),
  sendOtp: (data) => API.post("/auth/send-otp", data),
  verifyOtp: (data) => API.post("/auth/verify-otp", data),
  resetPassword: (data) => API.post("/auth/reset-password", data),
  register: (data) => API.post("/auth/register", data),
  registerWorker: (data) => API.post("/auth/register-worker", data),
  getMe: () => API.get("/auth/me"),
  updateProfile: (data) => API.put("/auth/profile", data),
  changePassword: (data) => API.post("/auth/change-password", data),
  toggleSubscription: () => API.post("/auth/subscription/toggle"),
  getAddresses: () => API.get("/auth/addresses"),
  addAddress: (data) => API.post("/auth/addresses", data),
  setDefaultAddress: (id) => API.put(`/auth/addresses/${id}/default`),
  deleteAddress: (id) => API.delete(`/auth/addresses/${id}`),
  getContacts: () => API.get("/auth/contacts"),
  addContact: (data) => API.post("/auth/contacts", data),
};

export const serviceAPI = {
  getCategories: () => API.get("/services/categories"),
  getServices: () => API.get("/services/"),
  getSkills: () => API.get("/services/skills"),
};

export const matchingAPI = {
  aiAssistant: (prompt) => API.post("/matching/ai-assistant", { prompt }),
  findWorkers: (params) => API.get("/matching/find-workers", { params }),
};

export const workerAPI = {
  getVerifiedWorkers: (params) => API.get("/workers/", { params }),
  getAllWorkers: () => API.get("/workers/all"),
  getWorkerMe: () => API.get("/workers/me/profile"),
  updateAvailability: (data) => API.patch("/workers/me/availability", data),
  updateLocation: (data) => API.patch("/workers/me/location", data),
  getWorkerById: (id) => API.get(`/workers/${id}`),
  verifyWorker: (id, data) => API.patch(`/workers/${id}/verification`, data),
  updateCategories: (data) => API.patch("/workers/me/categories", data),
};

export const bookingAPI = {
  createBooking: (data) => API.post("/bookings/", data),
  createEmergency: (data) => API.post("/bookings/emergency", data),
  getBookings: () => API.get("/bookings/"),
  getBookingById: (id) => API.get(`/bookings/${id}`),
  updateStatus: (id, data) => API.patch(`/bookings/${id}/status`, data),
  acceptBooking: (id) => API.post(`/bookings/${id}/accept`),
  rejectBooking: (id, reason) => API.post(`/bookings/${id}/reject?reason=${encodeURIComponent(reason || "Unavailable")}`),
  cancelBooking: (id, reason) => API.post(`/bookings/${id}/cancel`, { reason: reason || "Cancelled by user" }),
  proposePrice: (id, data) => API.post(`/bookings/${id}/propose-price`, data),
  respondPrice: (id, data) => API.post(`/bookings/${id}/respond-price`, data),
  getMessages: (id) => API.get(`/bookings/${id}/messages`),
  sendMessage: (id, message) => API.post(`/bookings/${id}/messages`, { message }),
};

export const paymentAPI = {
  processPayment: (data) => API.post("/payments/process", data),
  getHistory: () => API.get("/payments/history"),
};

export const invoiceAPI = {
  getInvoice: (bookingId) => API.get(`/invoices/${bookingId}`),
  // PDF download is done via raw fetch (needs blob response type)
};

export const ratingAPI = {
  submitRating: (data) => API.post("/ratings/", data),
};

export const welfareAPI = {
  getMyWelfare: () => API.get("/welfare/me"),
  getWorkerWelfare: (id) => API.get(`/welfare/worker/${id}`),
};

export const demandAPI = {
  getForecast: (params) => API.get("/demand/forecast", { params }),
  getRecommendations: (params) => API.get("/demand/recommendations", { params }),
  actionRecommendation: (id, action) => API.post(`/demand/recommendations/${id}/action`, { action }),
  getHeatmap: () => API.get("/demand/heatmap"),
};

export const coopAPI = {
  getStats: (id = 1) => API.get(`/cooperatives/${id}/stats`),
};

export const complaintAPI = {
  getComplaints: () => API.get("/complaints/"),
  createComplaint: (data) => API.post("/complaints/", data),
  resolveComplaint: (id, notes) => API.patch(`/complaints/${id}/resolve?resolution_notes=${encodeURIComponent(notes)}`),
};

export const notificationAPI = {
  getNotifications: () => API.get("/notifications/"),
  markRead: (id) => API.patch(`/notifications/${id}/read`),
};

export default API;
