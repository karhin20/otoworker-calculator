import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Landing from "@/pages/Landing";
import SignIn from "@/pages/SignIn";
import SignUp from "@/pages/SignUp";
import Index from "@/pages/Index";
import WorkerDetails from "@/pages/WorkerDetails";
import MonthlySummary from "@/pages/MonthlySummary";
import ProtectedRoute from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => {
  return (
    <React.StrictMode>
      <Router>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
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
                path="/monthly-summary"
                element={
                  <ProtectedRoute>
                    <MonthlySummary />
                  </ProtectedRoute>
                }
              />

              {/* Redirect any unknown routes to landing */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster />
            <Sonner />
          </TooltipProvider>
        </QueryClientProvider>
      </Router>
    </React.StrictMode>
  );
};

export default App;
