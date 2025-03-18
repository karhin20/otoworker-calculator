import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TableSkeleton } from "@/components/ui/skeleton";
import { LogOut, Download, Calendar as CalendarIcon, Home, BarChart, Users, FileText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { getAndClearNotification } from "@/utils/notifications";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { workers as workersApi, risk } from "@/lib/api";
import { Worker, RiskEntry } from "@/types";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const RiskManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [entries, setEntries] = useState<RiskEntry[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [user, setUser] = useState<{ name: string; staffId: string; grade: string } | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWorker, setSelectedWorker] = useState(""); // For worker details tab
  const [activeTab, setActiveTab] = useState("all-entries");
  const [formData, setFormData] = useState({
    worker_id: "",
    date: new Date(),
    location: "",
    size_depth: "",
    remarks: "",
  });
  
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

  // Size/depth options
  const sizeOptions = ['4"', '5"', '6"', '8"'];

  // Load user data
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
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

  // Fetch workers data
  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const data = await workersApi.getAll();
        const sortedWorkers = [...data].sort((a, b) => a.name.localeCompare(b.name));
        setWorkers(sortedWorkers);
      } catch (error: any) {
        console.error("Failed to fetch workers:", error);
        toast({
          title: "Error Fetching Workers",
          description: error.message || "Failed to fetch workers. Please try again.",
          variant: "destructive",
        });
      }
    };

    fetchWorkers();
  }, []);

  // Fetch risk entries when month or year changes
  useEffect(() => {
    const fetchRiskEntries = async () => {
      setLoading(true);
      try {
        const data = await risk.getMonthly(selectedMonth, selectedYear);
        setEntries(data);
      } catch (error: any) {
        console.error("Failed to fetch risk entries:", error);
        toast({
          title: "Error Fetching Risk Entries",
          description: error.message || "Failed to fetch risk entries. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRiskEntries();
  }, [selectedMonth, selectedYear]);

  // Handle sign out
  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.worker_id || !formData.date || !formData.location || !formData.size_depth) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    setSubmitting(true);
    
    try {
      await risk.create({
        ...formData,
        date: format(formData.date, "yyyy-MM-dd"),
      });
      
      // Reset form
      setFormData({
        worker_id: "",
        date: new Date(),
        location: "",
        size_depth: "",
        remarks: "",
      });
      
      // Refresh data
      const data = await risk.getMonthly(selectedMonth, selectedYear);
      setEntries(data);
      
      toast({
        title: "Success",
        description: "Risk management entry added successfully.",
      });
    } catch (error: any) {
      console.error("Failed to add risk entry:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add risk entry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle month change
  const handleMonthChange = (value: string) => {
    setSelectedMonth(parseInt(value));
  };

  // Handle year change
  const handleYearChange = (value: string) => {
    setSelectedYear(parseInt(value));
  };

  // Filter entries based on search query
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim() && !selectedWorker) return entries;
    
    let filtered = entries;
    
    if (searchQuery.trim()) {
      filtered = filtered.filter(entry => 
        entry.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.worker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.worker.staff_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.worker.grade.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedWorker && activeTab === "worker-details") {
      filtered = filtered.filter(entry => entry.worker_id === selectedWorker);
    }
    
    return filtered;
  }, [entries, searchQuery, selectedWorker, activeTab]);

  // Calculate total amount
  const totalAmount = useMemo(() => {
    return filteredEntries.reduce((total, entry) => total + (entry.rate || 10), 0);
  }, [filteredEntries]);

  // Handle date change
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData(prev => ({ ...prev, date }));
      setIsCalendarOpen(false);
    }
  };

  // Export all data as CSV
  const exportData = () => {
    try {
      if (filteredEntries.length === 0) {
        toast({
          title: "No Data Available",
          description: "No risk management entries found for this period.",
          variant: "destructive",
        });
        return;
      }
      
      // Group entries by worker
      const workerGroups = new Map();
      
      filteredEntries.forEach(entry => {
        if (!workerGroups.has(entry.worker_id)) {
          workerGroups.set(entry.worker_id, []);
        }
        workerGroups.get(entry.worker_id).push(entry);
      });
      
      // Headers
      let csv = `Month, ${months.find(m => m.value === selectedMonth)?.label}\n`;
      csv += `Year, ${selectedYear}\n\n`;
      
      // Add each worker's data as a section
      Array.from(workerGroups.entries()).forEach(([_, workerEntries]) => {
        const workerInfo = workerEntries[0].worker;
        
        // Worker information
        csv += `Name: ${workerInfo.name}  Staff ID: ${workerInfo.staff_id}  Grade: ${workerInfo.grade}\n\n`;
        
        // Table headers
        csv += 'Date,Location,Size/Depth,Rate (₵)\n';
        
        // Add data rows for this worker
        workerEntries.forEach((entry: RiskEntry) => {
          csv += `${format(new Date(entry.date), "yyyy-MM-dd")},`;
          csv += `${entry.location},`;
          csv += `${entry.size_depth},`;
          csv += `${entry.rate?.toFixed(2) || "10.00"}\n`;
        });
        
        // Calculate subtotal for this worker
        const workerTotal = workerEntries.reduce((total: number, entry: RiskEntry) => total + (entry.rate || 10), 0);
        csv += `Subtotal,,,${workerTotal.toFixed(2)}\n\n`;
      });
      
      // Add overall total
      csv += `\nTotal Amount,,,${totalAmount.toFixed(2)}\n`;
      
      // Create download link
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      
      // Name the file for all entries
      const fileName = `risk_management_all_${months.find(m => m.value === selectedMonth)?.label}_${selectedYear}.csv`;
      
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Successful",
        description: "Risk management data has been exported successfully.",
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
  
  // Export data for a specific worker
  const exportWorkerData = () => {
    if (!selectedWorker) {
      toast({
        title: "No Worker Selected",
        description: "Please select a worker to export data.",
        variant: "destructive",
      });
      return;
    }
    
    // Filter entries for the selected worker
    const workerEntries = entries.filter(entry => entry.worker_id === selectedWorker);
    if (workerEntries.length === 0) {
      toast({
        title: "No Data Available",
        description: "No risk management entries found for the selected worker in this period.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Get worker details from the first entry
      const workerInfo = workerEntries[0].worker;
      
      // Headers - new format
      let csv = `Month, ${months.find(m => m.value === selectedMonth)?.label}\n`;
      csv += `Year, ${selectedYear}\n\n`;
      
      // Worker information on its own line
      csv += `Name: ${workerInfo.name}  Staff ID: ${workerInfo.staff_id}  Grade: ${workerInfo.grade}\n\n`;
      
      // Table headers
      csv += 'Date,Location,Size/Depth,Rate (₵)\n';
      
      // Add data rows
      workerEntries.forEach(entry => {
        csv += `${format(new Date(entry.date), "yyyy-MM-dd")},`;
        csv += `${entry.location},`;
        csv += `${entry.size_depth},`;
        csv += `${entry.rate?.toFixed(2) || "10.00"}\n`;
      });
      
      // Calculate total for this worker
      const workerTotal = workerEntries.reduce((total, entry) => total + (entry.rate || 10), 0);
      
      // Add total row
      csv += `\nTotal,,,${workerTotal.toFixed(2)}\n`;
      
      // Create download link
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `risk_management_${getWorkerNameById(selectedWorker)}_${months.find(m => m.value === selectedMonth)?.label}_${selectedYear}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Successful",
        description: `Risk management data for ${getWorkerNameById(selectedWorker)} has been exported successfully.`,
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

  // Helper function to get worker name by ID
  const getWorkerNameById = (workerId: string): string => {
    const worker = workers.find(w => w.id === workerId);
    return worker ? worker.name : "Unknown Worker";
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Risk Management
              </h1>
              {user ? (
                <p className="mt-2 text-lg text-gray-600">
                  Hello, {user.name}! You are viewing risk entries for {months.find(m => m.value === selectedMonth)?.label} {selectedYear}.
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
            <nav className="flex flex-wrap gap-2 space-x-2">
              <Button
                variant="ghost"
                onClick={() => navigate("/dashboard")}
              >
                <Home className="mr-2 h-4 w-4" /> Dashboard
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate("/worker-details")}
              >
                <Users className="mr-2 h-4 w-4" /> Worker Details
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate("/monthly-summary")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" /> Monthly Summary
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate("/analytics")}
              >
                <BarChart className="mr-2 h-4 w-4" /> Analytics
              </Button>
            </nav>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Risk Management Form */}
            <Card className="p-6 bg-white shadow-sm col-span-1">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                Add Risk Management Entry
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="worker">Worker</Label>
                  <Select
                    value={formData.worker_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, worker_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select worker" />
                    </SelectTrigger>
                    <SelectContent>
                      {workers.map((worker) => (
                        <SelectItem key={worker.id} value={worker.id}>
                          {worker.name} ({worker.staff_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.date && "text-muted-foreground"
                        )}
                        onClick={() => setIsCalendarOpen(true)}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.date ? format(formData.date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.date}
                        onSelect={handleDateChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Enter location"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="size_depth">Size/Depth</Label>
                  <Select
                    value={formData.size_depth}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, size_depth: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select size/depth" />
                    </SelectTrigger>
                    <SelectContent>
                      {sizeOptions.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    value={formData.remarks}
                    onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                    placeholder="Enter any additional remarks"
                    className="min-h-[100px]"
                  />
                </div>
                
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? "Adding Entry..." : "Add Entry"}
                </Button>
              </form>
            </Card>

            {/* Risk Entries Tabs */}
            <Card className="p-6 bg-white shadow-sm col-span-1 lg:col-span-2">
              <Tabs defaultValue="all-entries" className="mb-6" onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="all-entries">All Entries</TabsTrigger>
                  <TabsTrigger value="worker-details">Worker Details</TabsTrigger>
                </TabsList>
                <TabsContent value="all-entries">
                  <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-800">
                      Risk Management Entries
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

                  <div className="mb-4">
                    <Input
                      placeholder="Search by worker name, staff ID, or location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="max-w-md"
                    />
                  </div>

                  {renderEntriesTable()}
                </TabsContent>
                
                <TabsContent value="worker-details">
                  <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-800">
                      Worker Risk Management Details
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
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <Label htmlFor="worker-select">Select Worker</Label>
                      <Select
                        value={selectedWorker}
                        onValueChange={setSelectedWorker}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select worker" />
                        </SelectTrigger>
                        <SelectContent>
                          {workers.map((worker) => (
                            <SelectItem key={worker.id} value={worker.id}>
                              {worker.name} ({worker.staff_id})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-end">
                      <Button 
                        variant="outline" 
                        onClick={exportWorkerData}
                        disabled={!selectedWorker}
                        className="ml-auto"
                      >
                        <FileText className="mr-2 h-4 w-4" /> Export Worker Data
                      </Button>
                    </div>
                  </div>

                  {renderEntriesTable()}
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
  
  // Helper function to render the entries table
  function renderEntriesTable() {
    if (loading) {
      return <TableSkeleton rows={5} columns={6} />;
    } 
    
    if (activeTab === "worker-details" && !selectedWorker) {
      return (
        <div className="py-10 text-center text-gray-500">
          Please select a worker to view their risk management entries.
        </div>
      );
    }
    
    if (filteredEntries.length === 0) {
      return (
        <div className="py-10 text-center text-gray-500">
          No risk management entries found for this period.
        </div>
      );
    }
    
    return (
      <div className="overflow-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Worker</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size/Depth</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate (₵)</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEntries.map((entry) => (
              <tr key={entry.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <div>{entry.worker.name}</div>
                  <div className="text-xs text-gray-500">{entry.worker.staff_id} - {entry.worker.grade}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(entry.date), "PP")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {entry.location}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {entry.size_depth}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-md break-words">
                  {entry.remarks || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {entry.rate?.toFixed(2) || "10.00"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50">
              <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                Total Amount:
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                ₵{totalAmount.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  }
};

export default RiskManagement; 