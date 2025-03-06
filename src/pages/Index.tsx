import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Worker, WorkerSummary, AREAS } from "@/types";
import { OvertimeEntry as OvertimeEntryComponent } from "@/components/OvertimeEntry";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Calendar, Users, LogOut, Download } from "lucide-react";
import { format } from "date-fns";
import { workers as workersApi, overtime } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Input } from "@/components/ui/input";
import { getAndClearNotification } from "@/utils/notifications";

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

  const handleAddEntry = async (entryData: {
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
      
      // Instead of showing toast here, set a notification for the next page
      import("@/utils/notifications").then(({ notifySuccess }) => {
        notifySuccess("Overtime entry added successfully!");
      });
      
      navigate("/dashboard");
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
  };

  const calculateTotals = () => {
    return summaryData.reduce((acc, item) => ({
      total_category_a: acc.total_category_a + (item.category_a_hours || 0),
      total_category_c: acc.total_category_c + (item.category_c_hours || 0),
      total_transport_cost: acc.total_transport_cost + (item.transportation_cost || 0)
    }), {
      total_category_a: 0,
      total_category_c: 0,
      total_transport_cost: 0
    });
  };

  const exportData = (type: 'overtime' | 'transport') => {
    try {
      const totals = calculateTotals();
      let csvContent = '';
      const monthYear = format(new Date(), 'MMMM_yyyy');
      const fileName = `${type}_summary_${monthYear}.csv`;

      if (type === 'overtime') {
        csvContent = 'Name,Staff ID,Grade,Category A Hours,Category C Hours\n';
        summaryData.forEach((row) => {
          csvContent += `${row.name},${row.staff_id},${row.grade},${row.category_a_hours.toFixed(2)},${row.category_c_hours.toFixed(2)}\n`;
        });
        csvContent += `\nTotals,,,${totals.total_category_a.toFixed(2)},${totals.total_category_c.toFixed(2)}\n`;
      } else {
        csvContent = 'Name,Staff ID,Grade,Total Days,Transport Cost\n';
        summaryData.forEach((row) => {
          csvContent += `${row.name},${row.staff_id},${row.grade},${row.transportation_days},${row.transportation_cost.toFixed(2)}\n`;
        });
        csvContent += `\nTotals,,,,${totals.total_transport_cost.toFixed(2)}\n`;
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

  // Filter summary data based on search query
  const filteredSummary = summaryData.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.staff_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.grade.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            </nav>
          </Card>

          <div className="grid grid-cols-1 gap-8">
            <OvertimeEntryComponent workers={workers} onSubmit={handleAddEntry} />
          </div>

          <Card className="p-6 animate-slideIn">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium">Monthly Summary</h3>
              <div className="flex gap-4">
                <Input
                  placeholder="Search by name, staff ID, or grade..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64"
                />
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
              <div className="relative w-full overflow-auto">
                <div className="overflow-x-auto border rounded-lg">
                  <div className="inline-block min-w-full align-middle">
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
                              {calculateTotals().total_category_a.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {calculateTotals().total_category_c.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ₵{calculateTotals().total_transport_cost.toFixed(2)}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Index;
