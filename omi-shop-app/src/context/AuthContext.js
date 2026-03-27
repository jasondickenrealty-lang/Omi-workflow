import React, { createContext, useState, useEffect, useContext } from "react";
import * as SecureStore from "expo-secure-store";
import { login as apiLogin } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for stored token on app start
  useEffect(() => {
    SecureStore.getItemAsync("jwt").then((t) => {
      if (t) setToken(t);
      setLoading(false);
    });
  }, []);

  const login = async (username, password) => {
    const res = await apiLogin(username, password);
    const jwt = res.data.access_token;
    await SecureStore.setItemAsync("jwt", jwt);
    setToken(jwt);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync("jwt");
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
