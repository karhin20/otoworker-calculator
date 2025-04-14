import { ReactNode, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { isWorkerTokenValid, clearWorkerAuthData } from "@/utils/auth";
import { notifyError } from "@/utils/notifications";

interface WorkerProtectedRouteProps {
  children: ReactNode;
}

const WorkerProtectedRoute = ({ children }: WorkerProtectedRouteProps) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if worker is authenticated
    if (!isWorkerTokenValid()) {
      clearWorkerAuthData();
      notifyError("Your session has expired. Please sign in again.");
      navigate("/worker-signin");
      return;
    }

    // Check if we have worker data in localStorage
    const workerStr = localStorage.getItem("worker");
    if (workerStr) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }

    // Set up periodic checks (every minute)
    const interval = setInterval(() => {
      if (!isWorkerTokenValid()) {
        clearWorkerAuthData();
        notifyError("Your session has expired. Please sign in again.");
        navigate("/worker-signin");
      }
    }, 60000);
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, [navigate]);

  // Show loading state while checking
  if (isAuthenticated === null) {
    // You can replace this with a loading spinner component
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // Redirect non-authenticated workers
  if (!isWorkerTokenValid() || isAuthenticated === false) {
    clearWorkerAuthData();
    // We can use Navigate here (no notification since initial load)
    return <Navigate to="/worker-signin" replace />;
  }

  return <>{children}</>;
};

export default WorkerProtectedRoute; 