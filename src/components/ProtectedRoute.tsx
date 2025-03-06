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
      console.log("Protected route checking token validity...");
      if (!isTokenValid()) {
        console.log("Token expired during session, clearing auth data");
        clearAuthData();
        notifyError("Your session has expired. Please sign in again.");
        navigate("/");
      }
    }, 60000);
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, [navigate]);

  // Check on initial render
  console.log("Protected route initial token check");
  if (!isTokenValid()) {
    console.log("Invalid token on route access, redirecting to login");
    clearAuthData();
    // We can use Navigate here (no notification since initial load)
    return <Navigate to="/" replace />;
  }

  console.log("Token valid, rendering protected content");
  return <>{children}</>;
};

export default ProtectedRoute; 