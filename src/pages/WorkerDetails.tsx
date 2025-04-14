import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, ChevronLeft, ChevronRight, Pencil, AlertCircle, Clock, CheckCircle2, Home, Calendar, Shield, BarChart, Trash2, Edit } from "lucide-react";
import { format } from "date-fns"; // Ensure this import is present
import { workers, overtime } from "@/lib/api";
import { Worker, WorkerDetail, WorkerDetailWithApproval, ApprovalStatus } from "@/types";
import { getAndClearNotification } from "@/utils/notifications";
import { toast } from "@/hooks/use-toast";
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";
import WorkerDetailsEdit from "@/components/WorkerDetailsEdit";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const WorkerDetails = () => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedWorker, setSelectedWorker] = useState("");
  const [details, setDetails] = useState<WorkerDetail[]>([]);
  const [workersList, setWorkersList] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{ id: string; name: string; staffId: string; grade: string; role?: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedEntry, setSelectedEntry] = useState<WorkerDetailWithApproval | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>("Standard");
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [summaryEditForm, setSummaryEditForm] = useState({
    category_a_amount: 0,
    category_c_amount: 0,
    transportation_cost: 0
  });
  const [isSavingSummary, setIsSavingSummary] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
      setUserRole(userData.role || "Standard");
    }
  }, []);

  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const data = await workers.getAll();
        // Use type assertion as a workaround for potential type definition mismatch
        setWorkersList(data as any[]); 
      } catch (error) {
        console.error("Failed to fetch workers:", error);
      }
    };

    fetchWorkers();
  }, []);

  // Define fetchDetails function for reuse outside the useEffect
  const fetchDetails = async () => {
    if (!selectedWorker) return;

    setLoading(true);
    try {
      const data = await overtime.getByWorker(
        selectedWorker,
        selectedMonth,
        selectedYear,
        { forceRefresh: true } // Force refresh to bust cache
      );
      // Sort the details by date in ascending order
      const sortedData = data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setDetails(sortedData);
    } catch (error) {
      console.error("Failed to fetch details:", error);
    } finally {
      setLoading(false);
    }
  };

  // Call fetchDetails when selection changes
  useEffect(() => {
    if (selectedWorker) {
      fetchDetails();
    }
  }, [selectedWorker, selectedMonth, selectedYear]);

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

  // Memoize the workers list sorting
  const sortedWorkersList = useMemo(() => {
    return [...workersList].sort((a, b) => a.name.localeCompare(b.name));
  }, [workersList]);

  // Convert calculateTotals to a memoized callback
  const calculateTotals = useCallback(() => {
    return details.reduce((acc, detail) => ({
      totalCategoryA: acc.totalCategoryA + (detail.category_a_hours || 0),
      totalCategoryC: acc.totalCategoryC + (detail.category_c_hours || 0),
      totalCategoryAAmount: acc.totalCategoryAAmount + ((detail as any).category_a_amount || (detail.category_a_hours || 0) * 2),
      totalCategoryCAmount: acc.totalCategoryCAmount + ((detail as any).category_c_amount || (detail.category_c_hours || 0) * 3),
      totalTransport: acc.totalTransport + (detail.transportation ? (detail.transportation_cost || parseFloat(detail.workers.default_area) || 0) : 0)
    }), {
      totalCategoryA: 0,
      totalCategoryC: 0,
      totalCategoryAAmount: 0,
      totalCategoryCAmount: 0,
      totalTransport: 0
    });
  }, [details]);

  // Memoize the calculateTotals function result
  const totals = useMemo(() => calculateTotals(), [calculateTotals]);

  // Implement pagination
  const paginatedDetails = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return details.slice(startIndex, startIndex + itemsPerPage);
  }, [details, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => Math.ceil(details.length / itemsPerPage), [details.length, itemsPerPage]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleItemsPerPageChange = useCallback((value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1); // Reset to first page when changing items per page
  }, []);

  // Convert exportWorkerDetails to a memoized callback
  const exportWorkerDetails = useCallback((exportType: 'transportation' | 'overtime') => {
    if (!details.length || !selectedWorker) return;

    const worker = workersList.find(w => w.id === selectedWorker);
    if (!worker) return;

    const monthName = months.find(m => m.value === selectedMonth)?.label;
    
    if (exportType === 'transportation') {
      const fileName = `${worker.name}_${monthName}_${selectedYear}_transportation.csv`;
      
      const headerFields = [
        `Employee: ${worker.name}`,
        `Post: North East District`,
        `Region: Accra East`,
        `Activity: Distribution Operation`,
        `Purpose of travel: Distribution activities`,
        `Allowance for the month of: ${monthName}`
      ];
      
      let csvContent = headerFields.join('\n') + '\n\n';
      csvContent += 'Date,Origin,Destination,Purpose,Amount\n';

      // Add each detail row
      details.forEach((detail) => {
        if (detail.transportation) {
          csvContent += `${format(new Date(detail.date), "yyyy-MM-dd")},`;
          csvContent += `${worker.area || detail.workers.default_area || 'Worker Area'},`;
          csvContent += `North East District,`;
          csvContent += `Distribution activities,`;
          csvContent += `${(detail.transportation_cost || parseFloat(detail.workers.default_area) || 0).toFixed(2)}\n`;
        }
      });

      // Add totals row
      csvContent += `\nTotal,,,,${totals.totalTransport.toFixed(2)}`;
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (exportType === 'overtime') {
      const fileName = `${worker.name}_${monthName}_${selectedYear}_overtime.csv`;
      
      const headerFields = [
        `OVERTIME CLAIMS FOR THE MONTH OF: ${monthName}`,
        `Grade: ${worker.grade}`,
        `Post: North East District`,
        `Region: Accra East`,
      ];
      
      let csvContent = headerFields.join('\n') + '\n\n';
      // Create a hierarchical header with two rows
      csvContent += 'Name,Date,Time,Time,CAT,CAT,HRS,Remarks\n';
      csvContent += ',,AM,PM,A,C,,\n';

      // Add each detail row
      details.forEach((detail) => {
        const totalHours = (detail.category_a_hours || 0) + (detail.category_c_hours || 0);
        
        csvContent += `${worker.name},`;
        csvContent += `${format(new Date(detail.date), "yyyy-MM-dd")},`;
        csvContent += `${detail.entry_time},`;
        csvContent += `${detail.exit_time},`;
        csvContent += `${detail.category_a_hours || ''},`;
        csvContent += `${detail.category_c_hours || ''},`;
        csvContent += `${totalHours > 0 ? totalHours.toFixed(2) : ''},`;
        csvContent += `${detail.remarks || ''}\n`;
      });

      // Add totals row - align Total Hours under HRS column
      const totalHrs = totals.totalCategoryA + totals.totalCategoryC;
      csvContent += `\nTotal,,,,,,${totalHrs.toFixed(2)},`;
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [details, selectedWorker, workersList, selectedMonth, selectedYear, totals]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    // Keyboard shortcuts for pagination
    if (e.key === 'ArrowLeft' && currentPage > 1) {
      handlePageChange(currentPage - 1);
    } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  }, [currentPage, totalPages, handlePageChange]);

  // Get appropriate badge for approval status
  const getApprovalBadge = (status: ApprovalStatus) => {
    switch (status) {
      case "Pending":
        return <Badge variant="outline" className="flex items-center gap-1 text-xs py-1"><Clock className="h-3.5 w-3.5" /> Pending</Badge>;
      case "Standard":
        return <Badge variant="secondary" className="flex items-center gap-1 text-xs py-1 bg-green-100 text-green-800 border-green-200"><CheckCircle2 className="h-3.5 w-3.5" /> Standard</Badge>;
      case "Supervisor":
        return <Badge variant="secondary" className="flex items-center gap-1 text-xs py-1 bg-blue-100 text-blue-800 border-blue-200"><CheckCircle2 className="h-3.5 w-3.5" /> Supervisor</Badge>;
      case "Accountant":
        return <Badge variant="secondary" className="flex items-center gap-1 text-xs py-1 bg-purple-100 text-purple-800 border-purple-200"><CheckCircle2 className="h-3.5 w-3.5" /> Accountant</Badge>;
      case "Approved":
        return <Badge variant="success" className="flex items-center gap-1 text-xs py-1"><CheckCircle2 className="h-3.5 w-3.5" /> Approved</Badge>;
      case "Rejected":
        return <Badge variant="destructive" className="flex items-center gap-1 text-xs py-1"><AlertCircle className="h-3.5 w-3.5" /> Rejected</Badge>;
    }
  };

  // Handler for opening the edit dialog
  const handleEditEntry = (entry: WorkerDetailWithApproval) => {
    setSelectedEntry(entry);
    setIsEditDialogOpen(true);
  };

  // Handler for closing the edit dialog
  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setSelectedEntry(null);
  };

  // Handler for refreshing data after an entry update
  const handleEntryUpdated = () => {
    if (selectedWorker) {
      fetchDetails();
    }
  };

  // Can user edit this entry?
  const canEdit = (status: ApprovalStatus): boolean => {
    // Follow hierarchical approval flow for editing
    if (userRole === "Standard" && status === "Pending") {
      return true; // Standard admin can only edit pending entries
    }
    
    if (userRole === "Supervisor" && status === "Standard") {
      return true; // Supervisors can only edit Standard-approved entries
    }
    
    if (userRole === "Accountant" && status === "Supervisor") {
      return true; // Accountants can only edit Supervisor-approved entries
    }
    
    if (userRole === "Director") {
      return false; // Directors can only approve/reject
    }
    
    return false; // No other combinations are allowed
  };

  // Handler for initiating delete
  const handleDeleteEntry = (entryId: string) => {
    setDeletingEntryId(entryId);
    setIsDeleteDialogOpen(true);
  };

  // Handler for confirming delete
  const confirmDeleteEntry = async () => {
    if (!deletingEntryId) return;

    try {
      await overtime.delete(deletingEntryId);
      toast({
        title: "Success",
        description: "Overtime entry deleted successfully.",
      });
      setDeletingEntryId(null);
      setIsDeleteDialogOpen(false);
      fetchDetails(); // Refresh the list
    } catch (error) {
      console.error("Failed to delete overtime entry:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete entry.",
        variant: "destructive",
      });
    }
  };

  // Can user delete this entry?
  const canDelete = (entry: WorkerDetailWithApproval): boolean => {
    // Standard role can only delete PENDING or REJECTED entries they created
    if (userRole === "Standard") {
      // Use type assertion to access created_by, assuming it exists
      return (entry as any).created_by === user?.id && 
             (entry.approval_status === "Pending" || entry.approval_status === "Rejected");
    }
    // Supervisor+ can delete any entry
    return ["Supervisor", "Accountant", "Director"].includes(userRole);
  };

  // Handle monthly summary editing
  const handleEditSummary = () => {
    if (!selectedWorker) return;
    
    // Initialize form with current values
    const categoryAAmount = totals.totalCategoryAAmount || 0;
    const categoryCAmount = totals.totalCategoryCAmount || 0;
    const transportCost = totals.totalTransport || 0;
    
    setSummaryEditForm({
      category_a_amount: categoryAAmount,
      category_c_amount: categoryCAmount,
      transportation_cost: transportCost
    });
    
    setIsEditingSummary(true);
  };
  
  // Handle canceling summary edit
  const handleCancelSummaryEdit = () => {
    setIsEditingSummary(false);
    setSummaryEditForm({
      category_a_amount: 0,
      category_c_amount: 0,
      transportation_cost: 0
    });
  };
  
  // Handle saving edited summary amounts
  const handleSaveSummary = async () => {
    if (!selectedWorker) return;
    
    try {
      setIsSavingSummary(true);
      await overtime.updateMonthlyAmounts(
        selectedWorker,
        selectedMonth,
        selectedYear,
        summaryEditForm
      );
      
      toast({
        title: "Success",
        description: "Monthly summary amounts updated successfully",
      });
      
      setIsEditingSummary(false);
      
      // Add a small delay before refreshing data to allow cache to clear
      setTimeout(() => {
        fetchDetails(); // Refresh data after delay
      }, 300); // 300ms delay
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update summary amounts",
        variant: "destructive",
      });
      setIsSavingSummary(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Staff Details
            </h1>
            {user && (
              <p className="mt-2 text-lg text-gray-600">
                Hello, {user.name} ({user.staffId})
                {userRole && <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {userRole} Role
                </span>}
              </p>
            )}
          </div>
          <Button variant="outline" onClick={() => navigate("/")}>
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>

        <Card className="p-6">
          <div className="flex gap-4 mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate(userRole === "Standard" ? "/dashboard" : "/supervisor-dashboard")}
            >
              <Home className="mr-2 h-4 w-4" /> Dashboard
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate(userRole === "Standard" ? "/monthly-summary" : "/supervisor-monthly-summary")}
            >
              <Calendar className="mr-2 h-4 w-4" /> Monthly Summary
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate(userRole === "Standard" ? "/risk-management" : "/supervisor-risk-management")}
            >
              <Shield className="mr-2 h-4 w-4" /> Risk Application
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate(userRole === "Standard" ? "/analytics" : "/supervisor-analytics")}
            >
              <BarChart className="mr-2 h-4 w-4" /> Analytics
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-medium mb-4">Select Staff</h3>
              <Select
                value={selectedWorker}
                onValueChange={setSelectedWorker}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a staff" />
                </SelectTrigger>
                <SelectContent>
                  {sortedWorkersList.map((worker) => (
                    <SelectItem key={worker.id} value={worker.id}>
                      {worker.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Select Month</h3>
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

            <div>
              <h3 className="text-lg font-medium mb-4">Select Year</h3>
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
          </div>

          <div className="mt-8">
            {loading ? (
              <div className="space-y-4">
                <div className="flex flex-col space-y-3">
                  <Skeleton className="h-8 w-64 mb-4" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
                <TableSkeleton rows={6} columns={7} />
              </div>
            ) : details.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Entry Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Exit Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category A Hours
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category C Hours
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Transport
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedDetails.map((detail, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {format(new Date(detail.date), "PP")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {detail.entry_time}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {detail.exit_time}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {detail.category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {detail.category_a_hours}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {detail.category_c_hours}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {detail.transportation 
                              ? <span className="font-bold text-green-600">₵{(detail.transportation_cost || parseFloat(detail.workers.default_area) || 0).toFixed(2)}</span>
                              : 'No'
                            }
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {getApprovalBadge((detail as WorkerDetailWithApproval).approval_status || "Pending")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <Button
                              variant={canEdit((detail as WorkerDetailWithApproval).approval_status || "Pending") ? "ghost" : "outline"}
                              onClick={() => handleEditEntry(detail as WorkerDetailWithApproval)}
                              disabled={!canEdit((detail as WorkerDetailWithApproval).approval_status || "Pending")}
                              size="sm"
                              className={canEdit((detail as WorkerDetailWithApproval).approval_status || "Pending") ? "hover:bg-blue-50 hover:text-blue-700" : ""}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => handleDeleteEntry(detail.id)}
                              disabled={!canDelete(detail as WorkerDetailWithApproval)}
                              size="sm"
                              className={canDelete(detail as WorkerDetailWithApproval) ? "text-red-600 hover:bg-red-50 hover:text-red-700" : "text-gray-400 cursor-not-allowed"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-medium">
                        <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          Totals {isEditingSummary && <span className="text-xs text-blue-600">(Editing)</span>}
                        </td>
                        {isEditingSummary ? (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="mb-1">{totals.totalCategoryA.toFixed(2)} hrs</div>
                              <Input
                                type="number"
                                value={summaryEditForm.category_a_amount}
                                onChange={(e) => setSummaryEditForm({...summaryEditForm, category_a_amount: parseFloat(e.target.value) || 0})}
                                className="w-24 h-8 text-sm"
                                placeholder="Amount (₵)"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="mb-1">{totals.totalCategoryC.toFixed(2)} hrs</div>
                              <Input
                                type="number"
                                value={summaryEditForm.category_c_amount}
                                onChange={(e) => setSummaryEditForm({...summaryEditForm, category_c_amount: parseFloat(e.target.value) || 0})}
                                className="w-24 h-8 text-sm"
                                placeholder="Amount (₵)"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <Input
                                type="number"
                                value={summaryEditForm.transportation_cost}
                                onChange={(e) => setSummaryEditForm({...summaryEditForm, transportation_cost: parseFloat(e.target.value) || 0})}
                                className="w-24 h-8 text-sm"
                                placeholder="Transport (₵)"
                              />
                            </td>
                            <td colSpan={2} className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleSaveSummary}
                                disabled={isSavingSummary}
                              >
                                {isSavingSummary ? "Saving..." : "Save"}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={handleCancelSummaryEdit}
                                disabled={isSavingSummary}
                              >
                                Cancel
                              </Button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="text-green-600 font-bold text-base">₵{totals.totalCategoryAAmount.toFixed(2)}</div>
                              <div className="text-gray-500 text-xs mt-1">{totals.totalCategoryA.toFixed(2)} hrs</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="text-green-600 font-bold text-base">₵{totals.totalCategoryCAmount.toFixed(2)}</div>
                              <div className="text-gray-500 text-xs mt-1">{totals.totalCategoryC.toFixed(2)} hrs</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="text-green-600 font-bold text-base">₵{totals.totalTransport.toFixed(2)}</div>
                            </td>
                            <td colSpan={2} className="px-6 py-4 whitespace-nowrap">
                              {(userRole === "Standard" || userRole === "Supervisor" || userRole === "Accountant") && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleEditSummary}
                                  disabled={!selectedWorker || details.length === 0}
                                >
                                  <Edit className="mr-2 h-4 w-4" /> Edit Totals
                                </Button>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex justify-end space-x-4">
                  <Button
                    variant="outline"
                    onClick={() => exportWorkerDetails('transportation')}
                    disabled={!details.length}
                  >
                    Export Transportation
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => exportWorkerDetails('overtime')}
                    disabled={!details.length}
                  >
                    Export Overtime
                  </Button>
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      aria-label="Previous page"
                      tabIndex={0}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      aria-label="Next page"
                      tabIndex={0}
                    >
                      Next
                    </Button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to{" "}
                        <span className="font-medium">{Math.min(currentPage * itemsPerPage, details.length)}</span> of{" "}
                        <span className="font-medium">{details.length}</span> results
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Select
                        value={itemsPerPage.toString()}
                        onValueChange={handleItemsPerPageChange}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Rows per page" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 per page</SelectItem>
                          <SelectItem value="25">25 per page</SelectItem>
                          <SelectItem value="50">50 per page</SelectItem>
                          <SelectItem value="100">100 per page</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex">
                        <Button
                          variant="outline"
                          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          aria-label="Previous page"
                          tabIndex={0}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="px-4 py-2">
                          Page {currentPage} of {totalPages}
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          aria-label="Next page"
                          tabIndex={0}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-xs text-gray-500">
                  <p>Keyboard shortcuts: Left arrow (previous page), Right arrow (next page)</p>
                </div>
              </>
            ) : (
              <p className="text-center text-gray-500 py-8">
                {selectedWorker
                  ? "No overtime entries found for the selected period"
                  : "Select a worker to view details"}
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Edit Entry Dialog */}
      {selectedEntry && (
        <WorkerDetailsEdit
          entry={selectedEntry}
          isOpen={isEditDialogOpen}
          onClose={handleCloseEditDialog}
          onUpdate={handleEntryUpdated}
          userRole={userRole}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this overtime entry? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteEntry}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkerDetails;