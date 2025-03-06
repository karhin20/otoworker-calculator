import { ReactNode, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { isTokenValid, clearAuthData } from "@/utils/auth";

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    // Set up periodic checks (every minute)
    const interval = setInterval(() => {
      if (!isTokenValid()) {
        clearAuthData();
        navigate("/");
      }
    }, 60000);
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, [navigate]);

  // Check on initial render
  if (!isTokenValid()) {
    clearAuthData();
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 