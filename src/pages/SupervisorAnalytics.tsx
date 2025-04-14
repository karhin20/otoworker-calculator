import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Calendar, Download, Home, Shield } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { TableSkeleton } from "@/components/ui/skeleton";
import { overtime, risk } from "@/lib/api";
import { WorkerSummary, RiskSummary } from "@/types";
import { getAndClearNotification } from "@/utils/notifications";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import {
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

// Rename component
const SupervisorAnalytics = () => {
  const navigate = useNavigate();
  const [summaryData, setSummaryData] = useState<WorkerSummary[]>([]);
  const [riskSummaryData, setRiskSummaryData] = useState<RiskSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [user, setUser] = useState<{ name: string; staffId: string; grade: string; role?: string } | null>(null);

  // Generate month options
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  // Generate year options (last 5 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => ({
    value: currentYear - i,
    label: (currentYear - i).toString()
  }));

  // Load user data on mount
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
       const parsedUser = JSON.parse(userData);
       setUser(parsedUser);
       // Redirect if not Supervisor or above
       if (!parsedUser.role || parsedUser.role === "Standard") {
            navigate("/analytics"); // Redirect standard users to their analytics
       }
    } else {
        navigate("/"); // Redirect if not logged in
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

  // Fetch summary data when month or year changes
  useEffect(() => {
    const fetchSummaryData = async () => {
      setLoading(true);
      try {
        const data = await overtime.getMonthlySummary(selectedMonth, selectedYear);
        setSummaryData(data.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error: any) {
        toast({
          title: "Error Fetching Summary",
          description: error.message || "Failed to fetch summary data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSummaryData();
  }, [selectedMonth, selectedYear]);

  // Fetch risk summary data when month or year changes
  useEffect(() => {
    const fetchRiskSummaryData = async () => {
      try {
        const data = await risk.getSummary(selectedMonth, selectedYear);
        setRiskSummaryData(data.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error: any) {
        // Silently handle the error and set empty data
        setRiskSummaryData([]);
      }
    };

    fetchRiskSummaryData();
  }, [selectedMonth, selectedYear]);

  // Handle sign out
  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  // Memoized calculated data for charts
  const chartData = useMemo(() => {
    if (!summaryData.length) return {
      byGrade: [],
      transportCost: [],
      topWorkers: [],
      overtimeDistribution: []
    };

    // Group overtime hours by grade
    const byGrade = Array.from(
      summaryData.reduce((acc, worker) => {
        const grade = worker.grade;
        if (!acc.has(grade)) {
          acc.set(grade, {
            grade,
            categoryA: 0,
            categoryC: 0,
            count: 0
          });
        }

        const gradeData = acc.get(grade)!;
        gradeData.categoryA += worker.category_a_hours;
        gradeData.categoryC += worker.category_c_hours;
        gradeData.count += 1;

        return acc;
      }, new Map())
    ).map(([, value]) => value);

    // Transport cost data
    const transportCost = summaryData
      .filter(worker => worker.transportation_cost > 0)
      .map(worker => ({
        name: worker.name,
        cost: worker.transportation_cost,
        days: worker.transportation_days
      }));

    // Top workers by overtime hours
    const topWorkers = [...summaryData]
      .sort((a, b) => {
        const totalA = a.category_a_hours + a.category_c_hours;
        const totalB = b.category_a_hours + b.category_c_hours;
        return totalB - totalA;
      })
      .slice(0, 5)
      .map(worker => ({
        name: worker.name,
        total: worker.category_a_hours + worker.category_c_hours,
        categoryA: worker.category_a_hours,
        categoryC: worker.category_c_hours
      }));

    // Overtime distribution for pie chart
    const overtimeDistribution = [
      { name: 'Category A', value: summaryData.reduce((sum, worker) => sum + worker.category_a_hours, 0) },
      { name: 'Category C', value: summaryData.reduce((sum, worker) => sum + worker.category_c_hours, 0) }
    ];

    return { byGrade, transportCost, topWorkers, overtimeDistribution };
  }, [summaryData]);

  // Memoized calculated data for risk charts
  const riskChartData = useMemo(() => {
    if (!riskSummaryData.length) return {
      topRiskWorkers: []
    };

    // Top workers by risk amount
    const topRiskWorkers = [...riskSummaryData]
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 5)
      .map(worker => ({
        name: worker.name,
        totalAmount: worker.total_amount,
        totalEntries: worker.total_entries
      }));

    return { topRiskWorkers };
  }, [riskSummaryData]);

  // Calculate totals
  const totals = useMemo(() => {
    if (!summaryData) return {
      categoryA: 0,
      categoryC: 0,
      categoryAAmount: 0,
      categoryCAmount: 0,
      transportDays: 0,
      transportCost: 0,
      riskEntries: 0,
      riskAmount: 0
    };

    const result = {
      categoryA: 0,
      categoryC: 0,
      categoryAAmount: 0,
      categoryCAmount: 0,
      transportDays: 0,
      transportCost: 0,
      riskEntries: 0,
      riskAmount: 0
    };

    summaryData.forEach(worker => {
      result.categoryA += worker.category_a_hours || 0;
      result.categoryC += worker.category_c_hours || 0;
      result.categoryAAmount += worker.category_a_amount || 0;
      result.categoryCAmount += worker.category_c_amount || 0;
      result.transportDays += worker.transportation_days || 0;
      result.transportCost += worker.transportation_cost || 0;
      result.riskEntries += (worker as any).risk_entries || 0;
      result.riskAmount += (worker as any).risk_amount || 0;
    });

    return result;
  }, [summaryData]);

  // COLORS for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Handle month change
  const handleMonthChange = (value: string) => {
    setSelectedMonth(parseInt(value));
  };

  // Handle year change
  const handleYearChange = (value: string) => {
    setSelectedYear(parseInt(value));
  };

  // Export data as CSV
  const exportData = () => {
    try {
      // Headers
      let csv = 'Worker,Grade,Category A Hours,Category C Hours,Transportation Days,Transportation Cost';

      // Add risk headers if we have risk data
      if (riskSummaryData.length > 0) {
        csv += ',Risk Entries,Risk Amount';
      }

      csv += '\n';

      // Combine data from both sources
      const allWorkerIds = new Set([
        ...summaryData.map(w => w.worker_id),
        ...riskSummaryData.map(w => w.worker_id)
      ]);

      // Create a map for quick lookup
      const overtimeMap = new Map(summaryData.map(w => [w.worker_id, w]));
      const riskMap = new Map(riskSummaryData.map(w => [w.worker_id, w]));

      // Add data rows
      Array.from(allWorkerIds).forEach(workerId => {
        const overtimeData = overtimeMap.get(workerId);
        const riskData = riskMap.get(workerId);

        // If we have overtime data
        if (overtimeData) {
          csv += `${overtimeData.name},`;
          csv += `${overtimeData.grade},`;
          csv += `${overtimeData.category_a_hours},`;
          csv += `${overtimeData.category_c_hours},`;
          csv += `${overtimeData.transportation_days},`;
          csv += `${overtimeData.transportation_cost.toFixed(2)}`;
        } else if (riskData) {
          // If we only have risk data
          csv += `${riskData.name},`;
          csv += `${riskData.grade},`;
          csv += `0,0,0,0.00`;
        }

        // Add risk data if available
        if (riskSummaryData.length > 0) {
          if (riskData) {
            csv += `,${riskData.total_entries},${riskData.total_amount.toFixed(2)}`;
          } else {
            csv += `,0,0.00`;
          }
        }

        csv += '\n';
      });

      // Add totals row
      csv += `Total,,${totals.categoryA.toFixed(2)},${totals.categoryC.toFixed(2)},${totals.transportDays},${totals.transportCost.toFixed(2)}`;

      // Add risk totals if available
      if (riskSummaryData.length > 0) {
        csv += `,${totals.riskEntries},${totals.riskAmount.toFixed(2)}`;
      }

      csv += '\n';

      // Create download link
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `overtime_analytics_${selectedMonth}_${selectedYear}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Successful",
        description: "Analytics data has been exported successfully.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error exporting the data. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Management Analytics Dashboard
              </h1>
              {user ? (
                <p className="mt-2 text-lg text-gray-600">
                  Hello, {user.name}! You are viewing analytics for {months.find(m => m.value === selectedMonth)?.label} {selectedYear}.
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

          {/* Updated Navigation for Supervisors */}
          <Card className="p-4 bg-white shadow-sm">
            <nav className="flex flex-wrap gap-2 space-x-2">
              <Button
                variant="ghost"
                onClick={() => navigate("/supervisor-dashboard")}
              >
                <Home className="mr-2 h-4 w-4" /> Dashboard
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate("/supervisor-monthly-summary")} // Link to supervisor summary
              >
                <Calendar className="mr-2 h-4 w-4" /> Monthly Summary
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate("/supervisor-risk-management")} // Link to supervisor risk
              >
                <Shield className="mr-2 h-4 w-4" /> Risk Management
              </Button>
            </nav>
          </Card>

          <Card className="p-6 bg-white shadow-sm">
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Overtime, Transportation & Risk Analytics
              </h2>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Month:</span>
                  <Select value={selectedMonth.toString()} onValueChange={handleMonthChange}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map(month => (
                        <SelectItem key={month.value} value={month.value.toString()}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Year:</span>
                  <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
                    <SelectTrigger className="w-28">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(year => (
                        <SelectItem key={year.value} value={year.value.toString()}>
                          {year.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={exportData}>
                  <Download className="mr-2 h-4 w-4" /> Export Data
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="space-y-6">
                <TableSkeleton rows={5} columns={3} />
              </div>
            ) : (
              <div className="space-y-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <Card className="p-4 bg-blue-50 shadow-sm">
                    <h3 className="text-lg font-medium text-blue-800">Overtime Hours</h3>
                    <p className="text-3xl font-bold text-blue-900 mt-2">{(totals.categoryA + totals.categoryC).toFixed(2)}</p>
                    <p className="text-sm text-blue-600 mt-1">Cat A: {totals.categoryA.toFixed(2)} | Cat C: {totals.categoryC.toFixed(2)}</p>
                  </Card>
                  <Card className="p-4 bg-green-50 shadow-sm">
                    <h3 className="text-lg font-medium text-green-800">Category A Amount</h3>
                    <p className="text-3xl font-bold text-green-900 mt-2">₵{totals.categoryAAmount.toFixed(2)}</p>
                  </Card>
                  <Card className="p-4 bg-amber-50 shadow-sm">
                    <h3 className="text-lg font-medium text-amber-800">Category C Amount</h3>
                    <p className="text-3xl font-bold text-amber-900 mt-2">₵{totals.categoryCAmount.toFixed(2)}</p>
                  </Card>
                  <Card className="p-4 bg-purple-50 shadow-sm">
                    <h3 className="text-lg font-medium text-purple-800">Total Transport Cost</h3>
                    <p className="text-3xl font-bold text-purple-900 mt-2">₵{totals.transportCost.toFixed(2)}</p>
                  </Card>
                  <Card className="p-4 bg-rose-50 shadow-sm">
                    <h3 className="text-lg font-medium text-rose-800">Total Risk Amount</h3>
                    <p className="text-3xl font-bold text-rose-900 mt-2">₵{totals.riskAmount.toFixed(2)}</p>
                    <p className="text-sm text-rose-600 mt-1">From {totals.riskEntries} risk entries</p>
                  </Card>
                </div>

                {/* Top Workers Chart */}
                <Card className="p-6 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4">Top Workers by Overtime Hours</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart
                        data={chartData.topWorkers}
                        layout="vertical"
                        margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} />
                        <Tooltip formatter={(value) => [`${value} hours`, '']} />
                        <Legend />
                        <Bar dataKey="categoryA" stackId="a" name="Category A" fill="#0088FE" />
                        <Bar dataKey="categoryC" stackId="a" name="Category C" fill="#00C49F" />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Risk Management Chart */}
                {riskChartData.topRiskWorkers.length > 0 && (
                  <Card className="p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">Top Workers by Risk Management Amount</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart
                          data={riskChartData.topRiskWorkers}
                          layout="vertical"
                          margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={100} />
                          <Tooltip
                            formatter={(value, name) => {
                              if (name === 'Risk Amount') return [`₵${typeof value === 'number' ? value.toFixed(2) : value}`, 'Amount'];
                              return [`${value} entries`, 'Entries'];
                            }}
                          />
                          <Legend />
                          <Bar dataKey="totalAmount" name="Risk Amount" fill="#FF8042" />
                          <Bar dataKey="totalEntries" name="Risk Entries" fill="#8884D8" />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}

                {/* Overtime by Grade Chart */}
                <Card className="p-6 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4">Overtime Hours by Grade</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart
                        data={chartData.byGrade}
                        margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="grade" angle={-45} textAnchor="end" height={70} />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${value} hours`, '']} />
                        <Legend />
                        <Bar dataKey="categoryA" name="Category A" fill="#0088FE" />
                        <Bar dataKey="categoryC" name="Category C" fill="#00C49F" />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Overtime Distribution Pie Chart */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">Overtime Distribution</h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData.overtimeDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {chartData.overtimeDistribution.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} hours`, '']} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  {/* Transportation Cost Chart */}
                  <Card className="p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">Transportation Costs</h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart
                          data={chartData.transportCost.slice(0, 5)}
                          margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={50} />
                          <YAxis />
                          <Tooltip
                            formatter={(value, name) => {
                              if (name === 'Transport Cost') {
                                return [`₵${typeof value === 'number' ? value.toFixed(2) : value}`, 'Cost'];
                              }
                              if (name === 'Transport Days') {
                                return [`${value} day${value !== 1 ? 's' : ''}`, 'Days'];
                              }
                              return [value, name];
                            }}
                          />
                          <Legend />
                          <Bar dataKey="days" name="Transport Days" fill="#82ca9d" />
                          <Bar dataKey="cost" name="Transport Cost" fill="#8884d8" />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </ErrorBoundary>
  );
};

// Export the renamed component
export default SupervisorAnalytics; 