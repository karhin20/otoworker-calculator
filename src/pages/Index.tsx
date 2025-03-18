import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Worker, WorkerSummary } from "@/types";
import { OvertimeEntry as OvertimeEntryComponent } from "@/components/OvertimeEntry";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Calendar, Users, LogOut, Download, BarChart, Shield } from "lucide-react";
import { format } from "date-fns";
import { workers as workersApi, overtime } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Input } from "@/components/ui/input";
import { getAndClearNotification, notifySuccess } from "@/utils/notifications";

const ResponsiveTable = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="overflow-x-auto pb-2 -mx-4 sm:mx-0">
      <div className="inline-block min-w-full align-middle">
        {children}
      </div>
    </div>
  );
};

const Index = () => {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [summaryData, setSummaryData] = useState<WorkerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear] = useState(new Date().getFullYear());
  const [user, setUser] = useState<{ name: string; staffId: string; grade: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchWorkers = async () => {
      setLoading(true);
      try {
        const data = await workersApi.getAll();
        const sortWorkers = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
        setWorkers(data.sort(sortWorkers));
      } catch (error: any) {
        console.error("Failed to fetch workers:", error);
        toast({
          title: "Error Fetching Workers",
          description: error.message || "Failed to fetch workers. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchWorkers();
  }, []);

  useEffect(() => {
    const fetchCurrentMonthSummary = async () => {
      setLoading(true);
      try {
        const data = await overtime.getMonthlySummary(currentMonth, currentYear);
        const sortedData = data.sort((a, b) => a.name.localeCompare(b.name));
        setSummaryData(sortedData);
      } catch (error: any) {
        console.error("Failed to fetch monthly summary:", error);
        toast({
          title: "Error Fetching Summary",
          description: error.message || "Failed to fetch monthly summary. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentMonthSummary();
  }, [currentMonth, currentYear]);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  // Check for notifications on component mount
  useEffect(() => {
    const notification = getAndClearNotification();
    if (notification) {
      toast({
        title: notification.type.charAt(0).toUpperCase() + notification.type.slice(1),
        description: notification.message,
        variant: notification.type === 'error' ? 'destructive' : 'default',
      });
    }
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  // Memoize sorted and filtered workers list
  const filteredSummary = useMemo(() => {
    return summaryData
      .filter((summary) => 
        summary.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        summary.staff_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        summary.grade.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [summaryData, searchQuery]);

  // Memoize the calculateTotals function
  const calculateTotals = useCallback(() => {
    return summaryData.reduce(
      (acc, item) => ({
        categoryA: acc.categoryA + (item.category_a_hours || 0),
        categoryC: acc.categoryC + (item.category_c_hours || 0),
        transportDays: acc.transportDays + (item.transportation_days || 0),
        transportCost: acc.transportCost + (item.transportation_cost || 0),
      }),
      { categoryA: 0, categoryC: 0, transportDays: 0, transportCost: 0 }
    );
  }, [summaryData]);

  // Memoize totals
  const totals = useMemo(() => calculateTotals(), [calculateTotals]);

  // Convert handleAddEntry to a memoized callback
  const handleAddEntry = useCallback(async (entryData: {
    worker_id: string;
    date: string;
    entry_time: string;
    exit_time: string;
    category: 'A' | 'C';
    category_a_hours: number;
    category_c_hours: number;
    transportation: boolean;
    transportation_cost?: number;
  }) => {
    try {
      setIsSubmitting(true);
      await overtime.create(entryData);
      
      // Set the notification
      notifySuccess("Overtime entry added successfully!");
      
      // Force full reload to ensure the notification is displayed
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Failed to add entry:", error);
      toast({
        title: "Error",
        description: "Failed to add overtime entry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const exportData = (type: 'overtime' | 'transport') => {
    try {
      let csvContent = '';
      const monthYear = format(new Date(), 'MMMM_yyyy');
      const fileName = `${type}_summary_${monthYear}.csv`;

      if (type === 'overtime') {
        csvContent = 'Name,Staff ID,Grade,Category A Hours,Category C Hours\n';
        summaryData.forEach((row) => {
          csvContent += `${row.name},${row.staff_id},${row.grade},${row.category_a_hours.toFixed(2)},${row.category_c_hours.toFixed(2)}\n`;
        });
        csvContent += `\nTotals,,,${totals.categoryA.toFixed(2)},${totals.categoryC.toFixed(2)}\n`;
      } else {
        csvContent = 'Name,Staff ID,Grade,Total Days,Transport Cost\n';
        summaryData.forEach((row) => {
          csvContent += `${row.name},${row.staff_id},${row.grade},${row.transportation_days},${row.transportation_cost.toFixed(2)}\n`;
        });
        csvContent += `\nTotals,,,,${totals.transportCost.toFixed(2)}\n`;
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Successful",
        description: `${type === 'overtime' ? 'Overtime' : 'Transport'} data has been exported to ${fileName}`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error exporting the data. Please try again.",
        variant: "destructive",
      });
      console.error("Export error:", error);
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Welcome to the Overtime, Transportation and Risk Management System
              </h1>
              {user ? (
                <p className="mt-2 text-lg text-gray-600">
                  Hello, {user.name}! You are logged in as {user.grade} ({user.staffId}).
                </p>
              ) : (
                <p className="mt-2 text-lg text-gray-600">
                  Please log in to access your details.
                </p>
              )}
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </div>

          <Card className="p-4 bg-white shadow-sm">
            <nav className="flex space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/add-worker")}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Worker
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate("/monthly-summary")}
              >
                <Calendar className="mr-2 h-4 w-4" /> Monthly Summary
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate("/worker-details")}
              >
                <Users className="mr-2 h-4 w-4" /> Worker Details
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate("/analytics")}
              >
                <BarChart className="mr-2 h-4 w-4" /> Analytics
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate("/risk-management")}
              >
                <Shield className="mr-2 h-4 w-4" /> Risk Management
              </Button>
            </nav>
          </Card>

          <div className="grid grid-cols-1 gap-8">
            <OvertimeEntryComponent 
              workers={workers} 
              onSubmit={handleAddEntry} 
              isSubmitting={isSubmitting} 
            />
          </div>

          <Card className="p-6 animate-slideIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                Dashboard
              </h2>
              <div className="w-full sm:w-auto max-w-sm">
                <Input
                  type="search"
                  placeholder="Search workers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium">Monthly Summary</h3>
              <div className="flex gap-4">
                <Button
                  onClick={() => exportData('overtime')}
                  variant="outline"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Overtime
                </Button>
                <Button
                  onClick={() => exportData('transport')}
                  variant="outline"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Transport
                </Button>
              </div>
            </div>

            {loading ? (
              <LoadingSkeleton rows={5} columns={7} />
            ) : (
              <ResponsiveTable>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Worker
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Staff ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Grade
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category A Hours
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category C Hours
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Days
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transport Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSummary.map((summary) => (
                      <tr key={summary.worker_id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {summary.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {summary.staff_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {summary.grade}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {summary.category_a_hours.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {summary.category_c_hours.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {summary.transportation_days}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ₵{summary.transportation_cost?.toFixed(2) || '0.00'}
                        </td>
                      </tr>
                    ))}
                    {filteredSummary.length > 0 && (
                      <tr className="bg-gray-50 font-medium">
                        <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          Monthly Totals
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {totals.categoryA.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {totals.categoryC.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {totals.transportDays}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₵{totals.transportCost.toFixed(2)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </ResponsiveTable>
            )}
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <h2 className="text-lg font-medium mb-2">Worker Details</h2>
              <p className="text-gray-500 mb-4">View and manage worker overtime details.</p>
              <Button onClick={() => navigate("/worker-details")}>
                <Users className="mr-2 h-4 w-4" /> Worker Details
              </Button>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <h2 className="text-lg font-medium mb-2">Monthly Summary</h2>
              <p className="text-gray-500 mb-4">View monthly overtime and transport summaries.</p>
              <Button onClick={() => navigate("/monthly-summary")}>
                <Calendar className="mr-2 h-4 w-4" /> Monthly Summary
              </Button>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <h2 className="text-lg font-medium mb-2">Add Worker</h2>
              <p className="text-gray-500 mb-4">Register a new worker in the system.</p>
              <Button onClick={() => navigate("/add-worker")}>
                <Plus className="mr-2 h-4 w-4" /> Add Worker
              </Button>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <h2 className="text-lg font-medium mb-2">Analytics</h2>
              <p className="text-gray-500 mb-4">View data visualization and insights.</p>
              <Button onClick={() => navigate("/analytics")}>
                <BarChart className="mr-2 h-4 w-4" /> Analytics
              </Button>
            </Card>
            
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <h2 className="text-lg font-medium mb-2">Risk Management</h2>
              <p className="text-gray-500 mb-4">Track and manage worker risk activities.</p>
              <Button onClick={() => navigate("/risk-management")}>
                <Shield className="mr-2 h-4 w-4" /> Risk Management
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Index;
