import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { LogOut, Download } from "lucide-react";
import { overtime } from "@/lib/api";
import { WorkerSummary } from "@/types";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorBoundary } from "@/components/ui/error-boundary";

const MonthlySummary = () => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState<WorkerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<{ name: string; staffId: string; grade: string } | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const data = await overtime.getMonthlySummary(selectedMonth, selectedYear);
        // Sort the summary data alphabetically by worker name
        const sortedData = data.sort((a, b) => a.name.localeCompare(b.name));
        setSummary(sortedData);
      } catch (error) {
        console.error("Failed to fetch summary:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [selectedMonth, selectedYear]);

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Alt + N to focus search
      if (e.altKey && e.key === 'n') {
        const searchInput = document.getElementById('summary-search');
        if (searchInput) searchInput.focus();
      }
      // Alt + B to go back to dashboard
      if (e.altKey && e.key === 'b') {
        navigate('/dashboard');
      }
      // Alt + O to export overtime data
      if (e.altKey && e.key === 'o') {
        exportData('overtime');
      }
      // Alt + T to export transport data
      if (e.altKey && e.key === 't') {
        exportData('transport');
      }
      // Alt + Left/Right to change months
      if (e.altKey && e.key === 'ArrowLeft') {
        setSelectedMonth(prev => prev > 1 ? prev - 1 : 12);
      }
      if (e.altKey && e.key === 'ArrowRight') {
        setSelectedMonth(prev => prev < 12 ? prev + 1 : 1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate]);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" }
  ];

  const years = Array.from(
    { length: 5 },
    (_, i) => selectedYear - 2 + i
  );

  const calculateTotals = () => {
    return summary.reduce((acc, item) => ({
      totalCategoryA: acc.totalCategoryA + (item.category_a_hours || 0),
      totalCategoryC: acc.totalCategoryC + (item.category_c_hours || 0),
      totalTransport: acc.totalTransport + (item.transportation_cost || 0)
    }), {
      totalCategoryA: 0,
      totalCategoryC: 0,
      totalTransport: 0
    });
  };

  const exportData = (type: 'overtime' | 'transport') => {
    const totals = calculateTotals();
    let csvContent = '';
    const monthYear = `${months.find(m => m.value === selectedMonth)?.label}_${selectedYear}`;

    if (type === 'overtime') {
      csvContent = 'Name,Staff ID,Grade,Category A Hours,Category C Hours\n';
      summary.forEach((row) => {
        csvContent += `${row.name},${row.staff_id},${row.grade},${row.category_a_hours.toFixed(2)},${row.category_c_hours.toFixed(2)}\n`;
      });
      csvContent += `\nTotals,,,${totals.totalCategoryA.toFixed(2)},${totals.totalCategoryC.toFixed(2)}\n`;
    } else {
      csvContent = 'Name,Staff ID,Grade,Total Days,Transport Cost\n';
      summary.forEach((row) => {
        csvContent += `${row.name},${row.staff_id},${row.grade},${row.transportation_days},${row.transportation_cost.toFixed(2)}\n`;
      });
      csvContent += `\nTotals,,,,${totals.totalTransport.toFixed(2)}\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${type}_summary_${monthYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter summary data based on search query
  const filteredSummary = summary.filter(item => 
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
                Monthly Summary
              </h1>
              {user && (
                <p className="mt-2 text-lg text-gray-600">
                  Hello, {user.name} ({user.staffId}) - {user.grade}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </div>

          <Card className="p-6">
            <div className="flex gap-4 mb-6">
              <div className="w-48">
                <Select
                  value={selectedMonth.toString()}
                  onValueChange={(value) => setSelectedMonth(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-32">
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(value) => setSelectedYear(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Input
                  id="summary-search"
                  placeholder="Search by name, staff ID, or grade... (Alt+N)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard")}
                title="Back to Dashboard (Alt+B)"
              >
                Back to Dashboard
              </Button>
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
                        {filteredSummary.map((item) => (
                          <tr key={item.worker_id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.staff_id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.grade}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.category_a_hours.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.category_c_hours.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.transportation_days}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              ₵{(item.transportation_cost || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 font-medium">
                          <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            Monthly Totals
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {calculateTotals().totalCategoryA.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {calculateTotals().totalCategoryC.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₵{calculateTotals().totalTransport.toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-end space-x-4">
              <Button
                onClick={() => exportData('overtime')}
                variant="outline"
                title="Export Overtime Data (Alt+O)"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Overtime
              </Button>
              <Button
                onClick={() => exportData('transport')}
                variant="outline"
                title="Export Transport Data (Alt+T)"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Transport
              </Button>
            </div>
          </Card>

          {/* Add keyboard shortcuts help */}
          <div className="mt-4 text-sm text-gray-500">
            <p className="font-medium">Keyboard Shortcuts:</p>
            <ul className="mt-2 space-y-1">
              <li>Alt + N: Focus search</li>
              <li>Alt + B: Back to dashboard</li>
              <li>Alt + O: Export overtime data</li>
              <li>Alt + T: Export transport data</li>
              <li>Alt + ←/→: Previous/Next month</li>
            </ul>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default MonthlySummary;
