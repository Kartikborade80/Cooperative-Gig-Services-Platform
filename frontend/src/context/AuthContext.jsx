import React, { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../services/api";
import { translations } from "../i18n/translations";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("coop_gig_token") || null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(localStorage.getItem("coop_gig_role") || null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState(localStorage.getItem("coop_gig_lang") || "en");

  const changeLanguage = (newLang) => {
    setLang(newLang);
    localStorage.setItem("coop_gig_lang", newLang);
  };

  const t = (key) => {
    const val = translations[lang]?.[key] ?? translations["en"]?.[key];
    return val !== undefined ? val : key;
  };

  const fetchCurrentUser = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await authAPI.getMe();
      setUser(res.data);
      setRole(res.data.role);
      localStorage.setItem("coop_gig_role", res.data.role);
    } catch (err) {
      console.error("Token verification failed:", err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();

    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, [token]);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { access_token, role: userRole } = res.data;
    localStorage.setItem("coop_gig_token", access_token);
    localStorage.setItem("coop_gig_role", userRole);
    setToken(access_token);
    setRole(userRole);
    const meRes = await authAPI.getMe();
    setUser(meRes.data);
    return meRes.data;
  };

  const loginOtp = async (email, otpCode) => {
    const res = await authAPI.loginOtp({ email, otp_code: otpCode });
    const { access_token, role: userRole } = res.data;
    localStorage.setItem("coop_gig_token", access_token);
    localStorage.setItem("coop_gig_role", userRole);
    setToken(access_token);
    setRole(userRole);
    const meRes = await authAPI.getMe();
    setUser(meRes.data);
    return meRes.data;
  };

  const register = async (formData) => {
    await authAPI.register(formData);
    return await login(formData.email, formData.password);
  };

  const registerWorker = async (formData) => {
    const res = await authAPI.registerWorker(formData);
    const { access_token, role: userRole } = res.data;
    localStorage.setItem("coop_gig_token", access_token);
    localStorage.setItem("coop_gig_role", userRole);
    setToken(access_token);
    setRole(userRole);
    const meRes = await authAPI.getMe();
    setUser(meRes.data);
    return meRes.data;
  };

  const logout = () => {
    localStorage.removeItem("coop_gig_token");
    localStorage.removeItem("coop_gig_role");
    setToken(null);
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        role,
        loading,
        lang,
        changeLanguage,
        t,
        login,
        loginOtp,
        register,
        registerWorker,
        logout,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
