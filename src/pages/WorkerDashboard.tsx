import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, Shield, LogOut, PieChart, TimerOff, Timer, ChevronRight, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getAndClearNotification } from "@/utils/notifications";
import { Worker } from "@/types";
import { workers, Clock as ClockApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const WorkerDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ id?: string; name: string; staffId: string; role?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [_workerDbId, setWorkerDbId] = useState<string | null>(null);
  const [_currentMonth] = useState(new Date().getMonth() + 1);
  const [_currentYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState<{
    overtimeHours: number;
    transportDays: number;
    transportAmount: number;
    riskEntries: number;
    avgWorkHours: number;
  } | null>(null);
  const [clockStatus, setClockStatus] = useState<'clocked_in' | 'clocked_out' | null>(null);
  const [workerInfo, setWorkerInfo] = useState<{
    name: string;
    staffId: string;
    grade: string;
    defaultArea: string;
  } | null>(null);

  // Load user data (including ID) from localStorage
  useEffect(() => {
    const workerStr = localStorage.getItem("worker");
    if (workerStr) {
      setUser(JSON.parse(workerStr));
    }

    const notification = getAndClearNotification();
    if (notification) {
      toast({
        title: notification.type.charAt(0).toUpperCase() + notification.type.slice(1),
        description: notification.message,
        variant: notification.type === 'error' ? 'destructive' : 'default',
      });
    }
  }, []);

  // Fetch initial data (worker details by staff ID, then summary and clock status)
  useEffect(() => {
    const loadInitialData = async () => {
      if (user?.staffId) {
        setLoading(true); // Set loading true at the beginning
        try {
          // Fetch worker details using staffId to get the DB ID
          const workerDetails = await workers.getByStaffId(user.staffId) as unknown as Worker;
          if (workerDetails && workerDetails.id) {
            setWorkerDbId((workerDetails as any).id); // Store the DB ID
            // Now fetch summary and clock status using the obtained DB ID
            await fetchWorkerSummary(workerDetails.id);
            await fetchClockStatus(); // Clock status might implicitly use the authenticated worker ID now
          } else {
            throw new Error('Worker details or ID not found');
          }
        } catch (error) {
          console.error('Error loading initial worker data:', error);
          toast({
            title: "Error",
            description: "Failed to load your worker information.",
            variant: "destructive",
          });
          setLoading(false); // Ensure loading is set to false on error
        }
        // setLoading(false) will be called within fetchWorkerSummary if successful
      }
    };
    loadInitialData();
  }, [user]); // Depend on user state

  // Fetch worker summary using the database ID
  const fetchWorkerSummary = async (dbId: string) => {
    try {
      // No need to set loading true here, already set in loadInitialData
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      console.log(`Fetching summary for worker ${dbId} for ${currentMonth}/${currentYear}`);
      
      const response = await workers.getWorkerSummary(dbId, currentMonth, currentYear);

      if (response && response.worker) {
        setWorkerInfo({
          name: response.worker.name || "Unknown",
          staffId: response.worker.staff_id || "Unknown",
          grade: (user as any)?.grade || "Unknown",
          defaultArea: response.worker.default_area || "Unknown"
        });

        if (response.summary) {
          setSummary({
            overtimeHours: (response.summary.category_a_hours || 0) + (response.summary.category_c_hours || 0),
            transportDays: response.summary.transportation_days || 0,
            transportAmount: response.summary.transportation_cost || 0,
            riskEntries: response.summary.risk_entries || 0,
            avgWorkHours: response.summary.avg_work_hours || 0
          });
        } else {
          // Set default summary values if summary is missing
          setSummary({
            overtimeHours: 0,
            transportDays: 0,
            transportAmount: 0,
            riskEntries: 0,
            avgWorkHours: 0
          });
        }
      } else {
        console.warn("Worker summary response is missing data");
        // Set default values for worker info and summary
        setWorkerInfo({
          name: user?.name || "Unknown",
          staffId: user?.staffId || "Unknown",
          grade: (user as any)?.grade || "Unknown",
          defaultArea: "Unknown"
        });
        
        setSummary({
          overtimeHours: 0,
          transportDays: 0,
          transportAmount: 0,
          riskEntries: 0,
          avgWorkHours: 0
        });
      }
    } catch (error) {
      console.error('Error fetching worker summary:', error);
      
      // Set default values for worker info from local storage
      setWorkerInfo({
        name: user?.name || "Unknown",
        staffId: user?.staffId || "Unknown",
        grade: (user as any)?.grade || "Unknown",
        defaultArea: "Unknown"
      });
      
      // Set default summary values
      setSummary({
        overtimeHours: 0,
        transportDays: 0,
        transportAmount: 0,
        riskEntries: 0,
        avgWorkHours: 0
      });
      
      toast({
        title: "Warning",
        description: "Could not load your monthly summary data. Some information may be incomplete.",
        variant: "destructive",
      });
    } finally {
      // Set loading false after summary fetch attempt (success or fail)
      setLoading(false);
    }
  };

  // Fetch clock status - Now relies on the backend endpoint
  const fetchClockStatus = async () => {
    try {
      // This call should now succeed with the new backend endpoint
      const status = await ClockApi.getStatus();
      setClockStatus(status.status);
    } catch (error) {
      console.error("Failed to fetch clock status:", error);
      toast({ // Add toast for feedback
         title: "Clock Status Error",
         description: "Could not retrieve current clock status.",
         variant: "destructive",
      });
    }
  };

  // Handle signout
  const handleSignOut = () => {
    // Clear both admin and worker data on sign out from worker dashboard
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("workerToken");
    localStorage.removeItem("workerTokenExpiry");
    localStorage.removeItem("worker");
    navigate("/"); // Navigate to main landing/signin page
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Worker Dashboard
            </h1>
            {workerInfo && (
              <div className="mt-2 space-y-1">
                <p className="text-lg text-gray-600">
                  Hello, {workerInfo.name}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-sm">
                    Staff ID: {workerInfo.staffId}
                  </Badge>
                  <Badge variant="outline" className="text-sm">
                    Grade: {workerInfo.grade}
                  </Badge>
                  <Badge variant="outline" className="text-sm">
                    Area: {workerInfo.defaultArea}
                  </Badge>
                </div>
              </div>
            )}
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>

        {/* Current Status */}
        <Card className="p-6 relative overflow-hidden border-l-4 border-l-blue-500">
          <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-blue-50 to-transparent"></div>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Current Status</h2>
              <p className="text-gray-600 text-sm">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
            </div>
            <div className="z-10">
              {clockStatus === 'clocked_in' ? (
                <Badge className="px-3 py-1.5 bg-green-100 text-green-800 border-green-200 text-sm">
                  <Timer className="h-4 w-4 mr-1.5" /> Clocked In
                </Badge>
              ) : (
                <Badge className="px-3 py-1.5 bg-gray-100 text-gray-800 border-gray-200 text-sm">
                  <TimerOff className="h-4 w-4 mr-1.5" /> Clocked Out
                </Badge>
              )}
            </div>
          </div>
          <div className="mt-4">
            <Button 
              onClick={() => navigate("/clock-in-out")}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Clock className="mr-2 h-4 w-4" />
              {clockStatus === 'clocked_in' ? 'View Clock Status' : 'Clock In Now'}
            </Button>
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Clock In/Out</h3>
                <p className="text-sm text-gray-500 mt-1">Track your work hours</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <Button 
              variant="outline" 
              className="mt-4 w-full justify-between" 
              onClick={() => navigate("/clock-in-out")}
            >
              Go to Clock In/Out
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Card>

          <Card className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">My Reports</h3>
                <p className="text-sm text-gray-500 mt-1">View your overtime and transport</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <Button 
              variant="outline" 
              className="mt-4 w-full justify-between" 
              onClick={() => navigate("/worker-reports")}
            >
              View Reports
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Card>

          <Card className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Risk Entries</h3>
                <p className="text-sm text-gray-500 mt-1">View and add risk activities</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Shield className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <Button 
              variant="outline" 
              className="mt-4 w-full justify-between" 
              onClick={() => navigate("/worker-risk")}
            >
              Risk Entries
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Card>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Monthly Summary</h2>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-8 w-32" />
              </div>
            ) : summary ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Total Overtime Hours</p>
                  <p className="text-2xl font-bold">{summary.overtimeHours.toFixed(1)} hours</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Transportation Days</p>
                  <p className="text-2xl font-bold">{summary.transportDays} days</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Transportation Amount</p>
                  <p className="text-2xl font-bold">₵{summary.transportAmount.toFixed(2)}</p>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full mt-2" 
                  onClick={() => navigate("/worker-reports")}
                >
                  <PieChart className="mr-2 h-4 w-4" />
                  View Full Report
                </Button>
              </div>
            ) : (
              <p className="text-gray-500 py-8 text-center">No data available</p>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Activity Stats</h2>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-8 w-32" />
              </div>
            ) : summary ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Risk Entries This Month</p>
                  <p className="text-2xl font-bold">{summary.riskEntries}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Average Work Hours</p>
                  <p className="text-2xl font-bold">{summary.avgWorkHours.toFixed(1)} hours</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Approval Status</p>
                  <Badge variant="outline" className="text-xs">
                    Pending Review
                  </Badge>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full mt-2" 
                  onClick={() => navigate("/worker-risk")}
                >
                  <Shield className="mr-2 h-4 w-4" />
                  View Risk Entries
                </Button>
              </div>
            ) : (
              <p className="text-gray-500 py-8 text-center">No data available</p>
            )}
          </Card>
        </div>

        {/* Guide Card */}
        <Card className="p-6 bg-blue-50 border border-blue-100">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-blue-800">Welcome to the Worker Portal</h3>
              <p className="mt-1 text-blue-700">
                Use this dashboard to track your work hours, view your overtime and transportation reports, 
                and manage your risk entries. Clock in at the start of your workday and clock out when you're done 
                to automatically track your hours.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default WorkerDashboard; 