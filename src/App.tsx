import React from "react";
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

const queryClient = new QueryClient();

const App = () => {
  return (
    <React.StrictMode>
      <Router>
        <QueryClientProvider client={queryClient}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            
            {/* Protected routes */}
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

            {/* Redirect any unknown routes to landing */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </QueryClientProvider>
      </Router>
    </React.StrictMode>
  );
};

export default App;
