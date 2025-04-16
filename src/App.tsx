import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Landing from "@/pages/Landing";
import SignIn from "@/pages/SignIn";
import SignUp from "@/pages/SignUp";
import Index from "@/pages/Index";
import WorkerDetails from "@/pages/WorkerDetails";
import MonthlySummary from "@/pages/MonthlySummary";
import Analytics from "@/pages/Analytics";
import RiskManagement from "@/pages/RiskManagement";
import ProtectedRoute from "@/components/ProtectedRoute";
import AddWorker from "./pages/AddWorker";
import ClockInOut from "./pages/ClockInOut";
import WorkerDashboard from "./pages/WorkerDashboard";
import WorkerReports from "./pages/WorkerReports";
import WorkerRisk from "./pages/WorkerRisk";
import WorkerProtectedRoute from "@/components/WorkerProtectedRoute";
import WorkerSignIn from "@/pages/WorkerSignIn";
import WorkerPinSetup from "@/pages/WorkerPinSetup";
import SupervisorDashboard from "@/pages/SupervisorDashboard";
import SupervisorRiskManagement from "@/pages/SupervisorRiskManagement";
import SupervisorAnalytics from "@/pages/SupervisorAnalytics";
import SupervisorMonthlySummary from "@/pages/SupervisorMonthlySummary";
import PerformanceMonitor from "@/components/PerformanceMonitor";
import DeveloperRoleHelper from "@/components/DeveloperRoleHelper";
import WorkerDetailSupervisor from "./pages/WorkerDetailSupervisor";

const queryClient = new QueryClient();

const App = () => {
  const [showMonitor, setShowMonitor] = useState(false);
  
  // Check if user is a Developer for showing the performance monitor
  useEffect(() => {
    const checkUserRole = () => {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setShowMonitor(user.role === 'Developer');
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
    };
    
    checkUserRole();
    
    // Listen for storage changes in case user logs in/out
    window.addEventListener('storage', checkUserRole);
    
    return () => {
      window.removeEventListener('storage', checkUserRole);
    };
  }, []);

  return (
    <React.StrictMode>
      <Router>
        <QueryClientProvider client={queryClient}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/worker-signin" element={<WorkerSignIn />} />
            <Route path="/developer-tools" element={<DeveloperRoleHelper />} />
            
            {/* Admin Protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/worker-details"
              element={
                <ProtectedRoute>
                  <WorkerDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/worker-details-supervisor"
              element={
                <ProtectedRoute>
                  <WorkerDetailSupervisor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/add-worker"
              element={
                <ProtectedRoute>
                  <AddWorker />
                </ProtectedRoute>
              }
            />
            <Route
              path="/monthly-summary"
              element={
                <ProtectedRoute>
                  <MonthlySummary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/risk-management"
              element={
                <ProtectedRoute>
                  <RiskManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/worker-pin-setup"
              element={
                <ProtectedRoute>
                  <WorkerPinSetup />
                </ProtectedRoute>
              }
            />

            {/* Supervisor Protected routes */}
            <Route
              path="/supervisor-dashboard"
              element={
                <ProtectedRoute>
                  <SupervisorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/supervisor-risk-management"
              element={
                <ProtectedRoute>
                  <SupervisorRiskManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/supervisor-analytics"
              element={
                <ProtectedRoute>
                  <SupervisorAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/supervisor-monthly-summary"
              element={
                <ProtectedRoute>
                  <SupervisorMonthlySummary />
                </ProtectedRoute>
              }
            />

            {/* Worker Protected routes */}
            <Route
              path="/worker-dashboard"
              element={
                <WorkerProtectedRoute>
                  <WorkerDashboard />
                </WorkerProtectedRoute>
              }
            />
            <Route
              path="/clock-in-out"
              element={
                <WorkerProtectedRoute>
                  <ClockInOut />
                </WorkerProtectedRoute>
              }
            />
            <Route
              path="/worker-reports"
              element={
                <WorkerProtectedRoute>
                  <WorkerReports />
                </WorkerProtectedRoute>
              }
            />
            <Route
              path="/worker-risk"
              element={
                <WorkerProtectedRoute>
                  <WorkerRisk />
                </WorkerProtectedRoute>
              }
            />

            {/* Redirect any unknown routes to landing */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          
          {/* Performance Monitor component - only shown to Developers */}
          {showMonitor && <PerformanceMonitor />}
        </QueryClientProvider>
      </Router>
    </React.StrictMode>
  );
};

export default App;
