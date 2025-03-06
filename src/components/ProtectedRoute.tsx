import { ReactNode, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { isTokenValid, clearAuthData } from "@/utils/auth";
import { notifyError } from "@/utils/notifications";

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
        notifyError("Your session has expired. Please sign in again.");
        navigate("/");
      }
    }, 60000);
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, [navigate]);

  // Check on initial render

  if (!isTokenValid()) {
    clearAuthData();
    // We can use Navigate here (no notification since initial load)
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 