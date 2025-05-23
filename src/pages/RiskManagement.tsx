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
import { LogOut, Download, Calendar as CalendarIcon, Home, BarChart, Users, FileText, Pencil, Trash2, ThumbsUp, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { getAndClearNotification } from "@/utils/notifications";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { workers as workersApi, risk } from "@/lib/api";
import { Worker, RiskEntry, ApprovalStatus, AdminRole } from "@/types";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getApprovalBadge } from "@/utils/displayRoles"; // Import helper for approval status badge

const RiskManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [entries, setEntries] = useState<RiskEntry[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [user, setUser] = useState<{ name: string; staffId: string; grade: string; role?: string } | null>(null);
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
  const [editingEntry, setEditingEntry] = useState<RiskEntry | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Edit Modal
  const [editForm, setEditForm] = useState({
    worker_id: "",
    date: new Date(),
    location: "",
    size_depth: "",
    remarks: "",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [approvalEntryId, setApprovalEntryId] = useState<string | null>(null);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [rejectionEntryId, setRejectionEntryId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);

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
        const sortedWorkers = [...data].sort((a: any, b: any) => 
          a.name?.localeCompare(b.name || '') || 0
        );
        setWorkers(sortedWorkers as any);
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
        description: "Risk Application entry added successfully.",
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
        csv += 'Date,Location,Size/Depth,Rate (Cedis),Remarks\n';
        
        // Add data rows for this worker
        workerEntries.forEach((entry: RiskEntry) => {
          csv += `${format(new Date(entry.date), "yyyy-MM-dd")},`;
          csv += `${entry.location},`;
          csv += `${entry.size_depth},`;
          csv += `${entry.rate?.toFixed(2) || "10.00"},`;
          csv += `${entry.remarks || ""}\n`;
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
        description: "Risk Application data has been exported successfully.",
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
      csv += 'Date,Location,Size/Depth,Rate (Cedis),Remarks\n';
      
      // Add data rows
      workerEntries.forEach(entry => {
        csv += `${format(new Date(entry.date), "yyyy-MM-dd")},`;
        csv += `${entry.location},`;
        csv += `${entry.size_depth},`;
        csv += `${entry.rate?.toFixed(2) || "10.00"},`;
        csv += `${entry.remarks || ""}\n`;
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
        description: `Risk Application data for ${getWorkerNameById(selectedWorker)} has been exported successfully.`,
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

  const handleEditEntry = (entry: RiskEntry) => {
    setEditingEntry(entry);
    setIsEditModalOpen(true);
  };

  const handleDeleteEntry = (entryId: string) => {
    setDeletingEntryId(entryId);
    setIsDeleteDialogOpen(true);
  };

  useEffect(() => {
    if (editingEntry) {
      setEditForm({
        worker_id: editingEntry.worker_id,
        date: new Date(editingEntry.date),
        location: editingEntry.location,
        size_depth: editingEntry.size_depth,
        remarks: editingEntry.remarks || "",
      });
    }
  }, [editingEntry]);

  const handleEditFormChange = (field: string, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    setEditSubmitting(true);
    try {
      await risk.update(editingEntry.id, {
        location: editForm.location,
        size_depth: editForm.size_depth,
        remarks: editForm.remarks,
      });
      toast({ title: "Success", description: "Risk entry updated successfully." });
      setIsEditModalOpen(false);
      setEditingEntry(null);
      // Refresh data
      const data = await risk.getMonthly(selectedMonth, selectedYear);
      setEntries(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to update risk entry.", variant: "destructive" });
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
    setEditingEntry(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingEntryId) return;
    try {
      await risk.delete(deletingEntryId);
      toast({ title: "Success", description: "Risk entry deleted successfully." });
      setIsDeleteDialogOpen(false);
      setDeletingEntryId(null);
      // Refresh data
      const data = await risk.getMonthly(selectedMonth, selectedYear);
      setEntries(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete risk entry.", variant: "destructive" });
    }
  };

  const handleDeleteDialogClose = () => {
    setIsDeleteDialogOpen(false);
    setDeletingEntryId(null);
  };

  // Handler for initiating approval process
  const handleApproveEntry = (entryId: string) => {
    setApprovalEntryId(entryId);
    setIsApprovalDialogOpen(true);
  };

  // Handle confirming approval
  const confirmApproval = async () => {
    if (!approvalEntryId) return;

    try {
      setLoading(true); // Start loading indicator

      await risk.approve(approvalEntryId);

      toast({
        title: "Success",
        description: "Risk entry approved successfully.",
      });

      // Reset state and refresh
      setApprovalEntryId(null);
      setIsApprovalDialogOpen(false);
      // Refresh data
      const data = await risk.getMonthly(selectedMonth, selectedYear);
      setEntries(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve risk entry",
        variant: "destructive",
      });
    } finally {
      setLoading(false); // Stop loading indicator regardless of outcome
    }
  };

  // Handler for initiating rejection process
  const handleRejectEntry = (entryId: string) => {
    setRejectionEntryId(entryId);
    setIsRejectionDialogOpen(true);
    setRejectionReason(""); // Clear previous reason
  };

  // Handle confirming rejection
  const confirmRejection = async () => {
    if (!rejectionEntryId) return;

    try {
      setLoading(true); // Start loading indicator

      await risk.reject(rejectionEntryId, rejectionReason);

      toast({
        title: "Success",
        description: "Risk entry rejected successfully.",
      });

      // Reset state and refresh
      setRejectionEntryId(null);
      setIsRejectionDialogOpen(false);
      setRejectionReason(""); // Clear reason
      // Refresh data
      const data = await risk.getMonthly(selectedMonth, selectedYear);
      setEntries(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject risk entry",
        variant: "destructive",
      });
    } finally {
      setLoading(false); // Stop loading indicator regardless of outcome
    }
  };

  // Can user approve this entry?
  const canApprove = (status: ApprovalStatus | undefined): boolean => {
    if (!user?.role || !status) return false;
    // Follow hierarchical approval flow
    if ((user.role as AdminRole | undefined) === "Standard" && status === "Pending") return true;
    if ((user.role as AdminRole | undefined) === "District_Head" && status === "Pending") return true;

    if ((user.role as AdminRole | undefined) === "Supervisor" && status === "Standard") return true;
    if ((user.role as AdminRole | undefined) === "RDM" && status === "Standard") return true;

    if ((user.role as AdminRole | undefined) === "Director" && status === "Supervisor") return true;
    if ((user.role as AdminRole | undefined) === "RCM" && status === "Supervisor") return true;

    return false; // No other combinations are allowed
  };

  // Can user reject this entry?
  const canReject = (status: ApprovalStatus | undefined): boolean => {
     if (!user?.role || !status) return false;
     // Any authorized role can reject entries that are not already rejected
     const authorizedRoles: (AdminRole | undefined)[] = ['Standard', 'District_Head', 'Supervisor', 'RDM', 'Accountant', 'Director', 'RCM'];
     if (authorizedRoles.includes(user.role as AdminRole | undefined) && status !== 'Rejected') {
       return true;
     }
     return false;
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Risk Application
              </h1>
              {user && (
                <p className="mt-2 text-lg text-gray-600">
                  Hello, {user.name} ({user.staffId})
                  {user.role && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {user.role === 'Standard' ? 'District Head' : user.role}
                    </span>
                  )}
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
                <Users className="mr-2 h-4 w-4" /> Staff Details
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

          <Card className="p-6 bg-white shadow-sm">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              Add Risk Management Entry
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

          <Card className="p-6 bg-white shadow-sm mt-8">
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
                    Worker Risk Application Details
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

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Risk Entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label>Worker</Label>
              <Select
                value={editForm.worker_id}
                onValueChange={value => handleEditFormChange("worker_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select worker" />
                </SelectTrigger>
                <SelectContent>
                  {workers.map(worker => (
                    <SelectItem key={worker.id} value={worker.id}>
                      {worker.name} ({worker.staff_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !editForm.date && "text-muted-foreground"
                    )}
                    onClick={() => setIsCalendarOpen(true)}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editForm.date ? format(editForm.date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editForm.date}
                    onSelect={date => handleEditFormChange("date", date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={editForm.location}
                onChange={e => handleEditFormChange("location", e.target.value)}
              />
            </div>
            <div>
              <Label>Size/Depth</Label>
              <Select
                value={editForm.size_depth}
                onValueChange={value => handleEditFormChange("size_depth", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select size/depth" />
                </SelectTrigger>
                <SelectContent>
                  {sizeOptions.map(size => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Remarks</Label>
              <Textarea
                value={editForm.remarks}
                onChange={e => handleEditFormChange("remarks", e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleEditModalClose}>Cancel</Button>
              <Button type="submit" disabled={editSubmitting}>{editSubmitting ? "Saving..." : "Save Changes"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Risk Entry</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this risk entry? This action cannot be undone.</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleDeleteDialogClose}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={handleDeleteConfirm}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Risk Entry</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to approve this risk entry?</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsApprovalDialogOpen(false)}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={confirmApproval}>Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectionDialogOpen} onOpenChange={setIsRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Risk Entry</DialogTitle>
          </DialogHeader>
          <p>Please provide a reason for rejecting this risk entry:</p>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Enter rejection reason"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsRejectionDialogOpen(false)}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={confirmRejection}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              {(user?.role && ['Standard', 'District_Head', 'Supervisor', 'RDM', 'Director', 'RCM'].includes(user.role)) && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEntries.map((entry) => {
              let approveButtonClass = "text-green-600 hover:bg-green-50 hover:text-green-700";
              if (user?.role === "Supervisor" || user?.role === "RDM") {
                approveButtonClass = "text-blue-600 hover:bg-blue-50 hover:text-blue-700";
              } else if (user?.role === "Director" || user?.role === "RCM") {
                approveButtonClass = "text-amber-600 hover:bg-amber-50 hover:text-amber-700";
              }
              return (
                <tr key={entry.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.worker.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{format(new Date(entry.date), "yyyy-MM-dd")}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.location}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.size_depth}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.remarks}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.rate?.toFixed(2) || "10.00"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getApprovalBadge(entry.approval_status || "Pending")}
                  </td>
                  {(user?.role && ['Standard', 'District_Head', 'Supervisor', 'RDM', 'Director', 'RCM'].includes(user.role)) && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEditEntry(entry)}>
                        <Pencil className="w-4 h-4 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteEntry(entry.id)}>
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                      </Button>
                      {canApprove(entry.approval_status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApproveEntry(entry.id)}
                          className={approveButtonClass}
                        >
                          <ThumbsUp className="w-4 h-4 mr-1" /> Approve
                        </Button>
                      )}
                      {canReject(entry.approval_status) && (
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => handleRejectEntry(entry.id)}
                           className="text-red-600 hover:bg-red-50 hover:text-red-700"
                         >
                           <AlertCircle className="w-4 h-4 mr-1" /> Reject
                         </Button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
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