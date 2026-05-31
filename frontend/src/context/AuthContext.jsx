import { createContext, useContext, useEffect, useState } from "react";

const TOKEN_KEY = "seclabs:token";
const USER_KEY = "seclabs:user";

const AuthContext = createContext(null);

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

function loadStored() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = JSON.parse(localStorage.getItem(USER_KEY) || "null");
    if (!token || !user || isTokenExpired(token)) return { token: null, user: null };
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }) {
  const [{ token, user }, setAuth] = useState(loadStored);

  function login(newToken, userData) {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setAuth({ token: newToken, user: userData });
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setAuth({ token: null, user: null });
  }

  // Listen for 401 responses dispatched by apiClient.
  useEffect(() => {
    function onExpired() { logout(); }
    window.addEventListener("seclabs:auth:expired", onExpired);
    return () => window.removeEventListener("seclabs:auth:expired", onExpired);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
