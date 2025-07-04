import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (user: User, isFirstTime?: boolean) => void;
  logout: () => void;
  isAuthenticated: boolean;
  showWelcome: boolean;
  isFirstTimeLogin: boolean;
  dismissWelcome: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isFirstTimeLogin, setIsFirstTimeLogin] = useState(false);
  const [welcomeShown, setWelcomeShown] = useState(false);

  useEffect(() => {
    // Check if user is logged in when app starts
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        // Don't show welcome dialog for already authenticated sessions
        setWelcomeShown(true);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = (userData: User, isFirstTime = false) => {
    setUser(userData);
    setIsFirstTimeLogin(isFirstTime);
    // Only show welcome if it hasn't been shown yet in this session
    if (!welcomeShown) {
      setShowWelcome(true);
      setWelcomeShown(true);
    }
  };

  const dismissWelcome = () => {
    setShowWelcome(false);
  };

  const logout = async () => {
    try {
      // Clear state immediately to avoid white page
      setUser(null);
      setShowWelcome(false);
      setIsFirstTimeLogin(false);
      setWelcomeShown(false);
      
      // Make the API call in the background
      await fetch("/api/auth/logout", { 
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Logout API call failed:", error);
    }
    // State is already cleared, user will see login page immediately
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user,
    showWelcome,
    isFirstTimeLogin,
    dismissWelcome,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}