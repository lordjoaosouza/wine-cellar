import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  isAuthenticated as checkIsAuthenticated,
  logout,
  requestLoginCode,
  verifyLoginCode,
} from "@/services/auth";
import { subscribeAuthLogout } from "@/services/auth-events";

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  requestCode: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkIsAuthenticated().then((authenticated) => {
      setIsAuthenticated(authenticated);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => subscribeAuthLogout(() => setIsAuthenticated(false)), []);

  const requestCode = useCallback(
    (email: string) => requestLoginCode(email),
    []
  );

  const verifyCode = useCallback(async (email: string, code: string) => {
    await verifyLoginCode(email, code);
    setIsAuthenticated(true);
  }, []);

  const signOut = useCallback(async () => {
    await logout();
    setIsAuthenticated(false);
  }, []);

  const value = useMemo(
    () => ({ isAuthenticated, isLoading, requestCode, signOut, verifyCode }),
    [isAuthenticated, isLoading, requestCode, signOut, verifyCode]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSession(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useSession must be used within an AuthProvider");
  }
  return context;
}
