import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Worker, WorkerSummary } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, Users, LogOut, Download, BarChart, Shield } from "lucide-react";
import { format } from "date-fns";
import { workers as workersApi, overtime } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Input } from "@/components/ui/input";
import { getAndClearNotification } from "@/utils/notifications";

const ResponsiveTable = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="overflow-x-auto pb-2 -mx-4 sm:mx-0">
      <div className="inline-block min-w-full align-middle">
        {children}
      </div>
    </div>
  );
};

const SupervisorDashboard = () => {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [summaryData, setSummaryData] = useState<WorkerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear] = useState(new Date().getFullYear());
  const [user, setUser] = useState<{ name: string; staffId: string; grade: string; role?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchWorkers = async () => {
      setLoading(true);
      try {
        const data = await workersApi.getAll();
        const sortWorkers = (a: any, b: any) => a.name.localeCompare(b.name);
        setWorkers(data.sort(sortWorkers) as any);
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
      const userData = JSON.parse(userStr);
      setUser(userData);

      // Redirect standard users to regular dashboard
      if (!userData.role || userData.role === "Standard") {
        navigate("/dashboard");
      }
    }
  }, [navigate]);

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
        categoryAAmount: acc.categoryAAmount + (item.category_a_amount || (item.category_a_hours || 0) * 2),
        categoryCAmount: acc.categoryCAmount + (item.category_c_amount || (item.category_c_hours || 0) * 3),
        transportDays: acc.transportDays + (item.transportation_days || 0),
        transportCost: acc.transportCost + (item.transportation_cost || 0),
      }),
      { categoryA: 0, categoryC: 0, categoryAAmount: 0, categoryCAmount: 0, transportDays: 0, transportCost: 0 }
    );
  }, [summaryData]);

  // Memoize totals
  const totals = useMemo(() => calculateTotals(), [calculateTotals]);

  const exportData = (type: 'overtime' | 'transport') => {
    try {
      let csvContent = '';
      const monthYear = format(new Date(), 'MMMM_yyyy');
      const fileName = `${type}_summary_${monthYear}.csv`;

      if (type === 'overtime') {
        csvContent = 'Name,Staff ID,Grade,Category A Hours,Category A Amount,Category C Hours,Category C Amount\n';
        summaryData.forEach((row) => {
          const catAAmount = row.category_a_amount ?? (row.category_a_hours * 2);
          const catCAmount = row.category_c_amount ?? (row.category_c_hours * 3);
          csvContent += `${row.name},${row.staff_id},${row.grade},${row.category_a_hours.toFixed(2)},₵${catAAmount.toFixed(2)},${row.category_c_hours.toFixed(2)},₵${catCAmount.toFixed(2)}\n`;
        });
        csvContent += `\nTotals,,,${totals.categoryA.toFixed(2)},₵${totals.categoryAAmount.toFixed(2)},${totals.categoryC.toFixed(2)},₵${totals.categoryCAmount.toFixed(2)}\n`;
      } else {
        csvContent = 'Name,Staff ID,Grade,Total Days,Transport Cost\n';
        summaryData.forEach((row) => {
          csvContent += `${row.name},${row.staff_id},${row.grade},${row.transportation_days},₵${row.transportation_cost.toFixed(2)}\n`;
        });
        csvContent += `\nTotals,,,,₵${totals.transportCost.toFixed(2)}\n`;
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
                Management Portal
              </h1>
              {user ? (
                <p className="mt-2 text-lg text-gray-600">
                  Hello, {user.name}! You are logged in as
                  {user.role && <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {user.role} Role
                  </span>}
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
                onClick={() => navigate("/supervisor-monthly-summary")}
              >
                <Calendar className="mr-2 h-4 w-4" /> Monthly Summary
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate("/supervisor-analytics")}
              >
                <BarChart className="mr-2 h-4 w-4" /> Analytics
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate("/supervisor-risk-management")}
              >
                <Shield className="mr-2 h-4 w-4" /> Risk Application
              </Button>
            </nav>
          </Card>

          <Card className="p-6 animate-slideIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                Management Dashboard
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
                      <th className="px-8 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Worker
                      </th>
                      <th className="px-8 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Staff ID
                      </th>
                      <th className="px-8 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Grade
                      </th>
                      <th className="px-8 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Category A (₵)
                      </th>
                      <th className="px-8 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Category C (₵)
                      </th>
                      <th className="px-8 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Transport (₵)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSummary.map((summary) => (
                      <tr key={summary.worker_id}>
                        <td className="px-8 py-6 whitespace-nowrap text-base font-medium text-gray-900">
                          {summary.name}
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap text-base text-gray-500">
                          {summary.staff_id}
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap text-base text-gray-500">
                          {summary.grade}
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap text-base text-gray-500">
                          <div className="text-blue-600 font-bold text-lg">₵{summary.category_a_amount?.toFixed(2) ?? "0.00"}</div>
                          <div className="text-gray-500 text-sm mt-1">{summary.category_a_hours?.toFixed(2) ?? "0.00"} hrs</div>
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap text-base text-gray-500">
                          <div className="text-blue-600 font-bold text-lg">₵{summary.category_c_amount?.toFixed(2) ?? "0.00"}</div>
                          <div className="text-gray-500 text-sm mt-1">{summary.category_c_hours?.toFixed(2) ?? "0.00"} hrs</div>
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap text-base text-gray-500">
                          <div className="text-blue-600 font-bold text-lg">₵{summary.transportation_cost?.toFixed(2) ?? "0.00"}</div>
                          <div className="text-gray-500 text-sm mt-1">{summary.transportation_days || 0} days</div>
                        </td>
                      </tr>
                    ))}
                    {filteredSummary.length > 0 && (
                      <tr className="bg-gray-50 font-medium">
                        <td colSpan={3} className="px-8 py-6 whitespace-nowrap text-base font-semibold text-gray-900">
                          Monthly Totals
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap text-base text-gray-900">
                          <div className="font-medium text-gray-700">{totals.categoryA.toFixed(2)} hrs</div>
                          <div className="text-blue-600 font-bold text-lg">₵{totals.categoryAAmount.toFixed(2)}</div>
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap text-base text-gray-900">
                          <div className="font-medium text-gray-700">{totals.categoryC.toFixed(2)} hrs</div>
                          <div className="text-blue-600 font-bold text-lg">₵{totals.categoryCAmount.toFixed(2)}</div>
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap text-base text-gray-900">
                          <div className="font-bold text-lg text-blue-600">₵{totals.transportCost.toFixed(2)}</div>
                          <div className="text-gray-500 text-sm mt-1">{totals.transportDays.toFixed(0)} days</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </ResponsiveTable>
            )}
          </Card>

          <Card className="p-6 bg-blue-50 border border-blue-100">
            <h3 className="text-xl font-semibold text-blue-800 mb-4">Management Role Capabilities</h3>
            <ul className="space-y-3 ml-6 list-disc text-blue-700">
              <li>Review and approve worker overtime and transportation entries according to role</li>
              <li>View and manage risk entries for workers</li>
              <li>Generate reports and analytics for your team</li>
              <li>Export data for monthly reports</li>
              {user?.role === "Accountant" && (
                <li>Edit amounts for worker overtime and transportation entries</li>
              )}
              {user?.role === "Director" && (
                <li>Final approval of worker entries after accountant review</li>
              )}
            </ul>
          </Card>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default SupervisorDashboard;
