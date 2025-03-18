import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { LogOut, Download, Shield } from "lucide-react";
import { overtime } from "@/lib/api";
import { WorkerSummary } from "@/types";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { toast } from "@/hooks/use-toast";
import { getAndClearNotification } from "@/utils/notifications";
import { FixedSizeList as List } from 'react-window';

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

  // Memoize the calculateTotals function
  const calculateTotals = useCallback(() => {
    return summary.reduce((acc, item) => ({
      totalCategoryA: acc.totalCategoryA + (item.category_a_hours || 0),
      totalCategoryC: acc.totalCategoryC + (item.category_c_hours || 0),
      totalTransport: acc.totalTransport + (item.transportation_cost || 0)
    }), {
      totalCategoryA: 0,
      totalCategoryC: 0,
      totalTransport: 0
    });
  }, [summary]);

  // Memoize totals
  const totals = useMemo(() => calculateTotals(), [calculateTotals]);

  // Memoize filtered summary data
  const filteredSummary = useMemo(() => {
    return summary.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.staff_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.grade.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [summary, searchQuery]);

  // Row renderer for virtualized list
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    if (index >= filteredSummary.length) return null;
    
    const summary = filteredSummary[index];
    
    return (
      <div style={style} className="flex divide-x divide-gray-200">
        <div className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 w-1/6">
          {summary.name}
        </div>
        <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-1/6">
          {summary.staff_id}
        </div>
        <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-1/6">
          {summary.grade}
        </div>
        <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-1/6">
          {summary.category_a_hours?.toFixed(2) || "0.00"}
        </div>
        <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-1/6">
          {summary.category_c_hours?.toFixed(2) || "0.00"}
        </div>
        <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-1/6">
          ₵{summary.transportation_cost?.toFixed(2) || "0.00"}
        </div>
      </div>
    );
  }, [filteredSummary]);

  const exportData = (type: 'overtime' | 'transport') => {
    try {
      const totals = calculateTotals();
      let csvContent = '';
      const monthYear = `${months.find(m => m.value === selectedMonth)?.label}_${selectedYear}`;
      const fileName = `${type}_summary_${monthYear}.csv`;

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
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Show success toast
      toast({
        title: "Export Successful",
        description: `${type === 'overtime' ? 'Overtime' : 'Transport'} data has been exported to ${fileName}`,
        variant: "default",
      });
    } catch (error) {
      console.error("Export error:", error);
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
                  placeholder="Search by name, staff ID, or grade..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard")}
              >
                Back to Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/risk-management")}
              >
                <Shield className="mr-2 h-4 w-4" /> Risk Management
              </Button>
            </div>

            {loading ? (
              <LoadingSkeleton rows={5} columns={7} />
            ) : filteredSummary.length > 0 ? (
              <div className="mt-8">
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  {/* Table header */}
                  <div className="bg-gray-50 flex divide-x divide-gray-200">
                    <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      Name
                    </div>
                    <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      Staff ID
                    </div>
                    <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      Grade
                    </div>
                    <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      Category A Hours
                    </div>
                    <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      Category C Hours
                    </div>
                    <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      Transport Cost
                    </div>
                  </div>
                  
                  {/* Virtualized list */}
                  <div className="bg-white">
                    <List
                      height={400}
                      itemCount={filteredSummary.length}
                      itemSize={53} // Adjust based on your row height
                      width="100%"
                    >
                      {Row}
                    </List>
                  </div>
                  
                  {/* Totals row */}
                  <div className="bg-gray-50 flex divide-x divide-gray-200 font-medium">
                    <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 w-1/2" style={{ gridColumn: 'span 3' }}>
                      Monthly Totals
                    </div>
                    <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 w-1/6">
                      {totals.totalCategoryA.toFixed(2)}
                    </div>
                    <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 w-1/6">
                      {totals.totalCategoryC.toFixed(2)}
                    </div>
                    <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 w-1/6">
                      ₵{totals.totalTransport.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                No data available for the selected month
              </p>
            )}

            <div className="mt-4 flex justify-end space-x-4">
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
          </Card>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default MonthlySummary;
