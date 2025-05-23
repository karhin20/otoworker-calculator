import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { LogOut, Download, Edit, Home, Shield, BarChart, Clock, CheckCircle2, AlertCircle, Users, ThumbsUp, Loader2 } from "lucide-react";
import { overtime } from "@/lib/api";
import { WorkerSummary, ApprovalStatus } from "@/types"; // Ensure types are correct
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { toast } from "@/hooks/use-toast";
import { getAndClearNotification } from "@/utils/notifications";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import RoleBadge from "@/components/RoleBadge";
import { getDisplayApprovalStatus } from "@/utils/displayRoles";

// Rename component
const SupervisorMonthlySummary = () => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState<WorkerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<{ name: string; staffId: string; grade: string; role?: string } | null>(null);
  const [userRole, setUserRole] = useState<string>("Standard"); // Default, will be updated
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    category_a_amount: 0,
    category_c_amount: 0,
    transportation_cost: 0
  });
  const [approvalFilter, setApprovalFilter] = useState<string>("all");
  const [approvalWorkerId, setApprovalWorkerId] = useState<string | null>(null);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [isConfirmingApproval, setIsConfirmingApproval] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
      const role = userData.role || "Standard";
      setUserRole(role);
      // Redirect if not Supervisor or above
       if (!role || role === "Standard") {
            navigate("/monthly-summary"); // Redirect standard users to their summary
       }
    } else {
        navigate("/"); // Redirect if not logged in
    }
  }, [navigate]);

  // Define fetchSummary function for reuse
  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const data = await overtime.getMonthlySummary(selectedMonth, selectedYear, { forceRefresh: true });
      const sortedData = data.sort((a, b) => a.name.localeCompare(b.name));
      setSummary(sortedData);
    } catch (error) {
      console.error("Failed to fetch summary:", error);
      toast({
        title: "Error Fetching Summary",
        description: "Could not load monthly summary data.",
        variant: "destructive",
      });
      setSummary([]); // Ensure summary is an empty array on error
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]); // Add dependencies


  useEffect(() => {
    if (userRole !== "Standard") { // Only fetch if role is Supervisor or higher
        fetchSummary();
    }
  }, [selectedMonth, selectedYear, userRole, fetchSummary]); // Depend on fetchSummary


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

  // Get appropriate badge for approval status
  const getApprovalBadge = (worker: WorkerSummary) => {
    const status = worker.approval_status || "Pending";
    const statusCounts = (worker.status_counts || {}) as Record<string, number>;
    const totalEntries = worker.entries?.length || 0;
    
    // Create status indicator showing counts
    let countText = "";
    if (totalEntries > 0) {
      countText = `(${statusCounts[status] || 0}/${totalEntries})`;
    }
    
    switch (status) {
      case "Pending":
        return (
          <div className="flex flex-col">
            <Badge variant="outline" className="flex items-center gap-1 text-xs py-1">
              <Clock className="h-3.5 w-3.5" /> Pending {countText}
            </Badge>
            {totalEntries > 0 && (
              <div className="text-xs mt-1 text-muted-foreground">
                {statusCounts.Pending || 0} pending, {statusCounts.Standard || 0} {getDisplayApprovalStatus("Standard")}
              </div>
            )}
          </div>
        );
      case "Standard":
        return (
          <div className="flex flex-col">
            <Badge variant="secondary" className="flex items-center gap-1 text-xs py-1 bg-green-100 text-green-800 border-green-200">
              <CheckCircle2 className="h-3.5 w-3.5" /> {getDisplayApprovalStatus("Standard")} {countText}
            </Badge>
            {totalEntries > 0 && statusCounts.Standard !== totalEntries && (
              <div className="text-xs mt-1 text-muted-foreground">
                All entries must be {getDisplayApprovalStatus("Standard")} approved
              </div>
            )}
          </div>
        );
      case "Supervisor":
        return (
          <div className="flex flex-col">
            <Badge variant="secondary" className="flex items-center gap-1 text-xs py-1 bg-blue-100 text-blue-800 border-blue-200">
              <CheckCircle2 className="h-3.5 w-3.5" /> {getDisplayApprovalStatus("Supervisor")} {countText}
            </Badge>
            {totalEntries > 0 && statusCounts.Supervisor !== totalEntries && (
              <div className="text-xs mt-1 text-muted-foreground">
                {statusCounts.Supervisor || 0} {getDisplayApprovalStatus("Supervisor")}, {statusCounts.Standard || 0} {getDisplayApprovalStatus("Standard")}
              </div>
            )}
          </div>
        );
      case "Approved":
        return (
          <div className="flex flex-col">
            <Badge variant="success" className="flex items-center gap-1 text-xs py-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Approved {countText}
            </Badge>
          </div>
        );
      case "Rejected":
        return (
          <div className="flex flex-col">
            <Badge variant="destructive" className="flex items-center gap-1 text-xs py-1">
              <AlertCircle className="h-3.5 w-3.5" /> Rejected {countText}
            </Badge>
          </div>
        );
      default:
        return (
          <div className="flex flex-col">
            <Badge variant="outline" className="flex items-center gap-1 text-xs py-1">
              <Clock className="h-3.5 w-3.5" /> {status} {countText}
            </Badge>
          </div>
        );
    }
  };


  // Handle entering edit mode for a worker
  const handleEditWorker = (workerId: string, currentSummary: WorkerSummary & { approval_statuses?: ApprovalStatus[] }) => {
    const currentStatuses = currentSummary.approval_statuses || ["Pending"];

    // Strict hierarchy-based permissions
    let canEditRole = false;
    if ((userRole === "Director" || userRole === "RCM") && currentStatuses.includes("Supervisor")) {
        canEditRole = true;
    } else if ((userRole === "Supervisor" || userRole === "RDM") && currentStatuses.includes("Standard")) {
        canEditRole = true;
    } else if (userRole === "Standard" && currentStatuses.includes("Pending")) {
        canEditRole = true;
    }

    if (canEditRole) {
      setEditingWorkerId(workerId);
      setEditForm({
        category_a_amount: currentSummary.category_a_amount ?? 0,
        category_c_amount: currentSummary.category_c_amount ?? 0,
        transportation_cost: currentSummary.transportation_cost ?? 0
      });
    } else {
      toast({
        title: "Cannot Edit",
        description: "You can only edit entries that have been approved by the immediate lower level.",
        variant: "destructive",
      });
    }
  };


  // Handle canceling edit mode
  const handleCancelEdit = () => {
    setEditingWorkerId(null);
    setEditForm({
      category_a_amount: 0,
      category_c_amount: 0,
      transportation_cost: 0
    });
  };

  // Handle saving edited amounts (Now calls backend)
    const handleSaveAmounts = async (workerId: string) => {
        try {
            setLoading(true); // Start loading indicator
            await overtime.updateMonthlyAmounts(workerId, selectedMonth, selectedYear, editForm);
            toast({
                title: "Success",
                description: "Amounts updated successfully",
            });
            handleCancelEdit();
            
            // Add a small delay before refreshing data to allow cache to clear
            setTimeout(() => {
                fetchSummary(); // Refresh data after delay
                setLoading(false); // Stop loading indicator after refresh
            }, 300); // 300ms delay
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to update amounts",
                variant: "destructive",
            });
            setLoading(false); // Stop loading indicator on error
        }
    };


  // Handle mass approval (for directors)
  const handleApproveAll = async () => {
    try {
      setLoading(true);
      // Call the correct API function
      await overtime.approveAllSummariesByDirector(selectedMonth, selectedYear);

      toast({
        title: "Success",
        description: "All Supervisor-reviewed entries have been approved.",
      });

      // Refresh data
      fetchSummary();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to bulk approve entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter summaries based on approval status
  const filterSummaries = (summaries: WorkerSummary[]) => {
    if (approvalFilter === "all") return summaries;

    return summaries.filter(summaryItem => {
      const statuses = (summaryItem as any).approval_statuses || ["Pending"]; // Cast to access potential property

      switch (approvalFilter) {
        case "pending":
          return statuses.includes("Pending");
        case "standard":
          return statuses.includes("Standard");
        case "supervisor":
          return statuses.includes("Supervisor");
        case "approved":
          return statuses.every((status: ApprovalStatus) => status === "Approved");
        case "rejected":
          return statuses.includes("Rejected");
        default:
          return true;
      }
    });
  };


  // Final filtered summaries
  const finalFilteredSummaries = useMemo(() => {
    const textFiltered = filterSummaries(summary).filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.staff_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.grade.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return textFiltered;
  }, [summary, searchQuery, approvalFilter]);


  // Export data function remains largely the same, check if WorkerSummary includes necessary fields
  const exportData = (type: 'overtime' | 'transport') => {
    try {
      let csvContent = '';
      const monthYear = `${months[selectedMonth]} ${selectedYear}`;
      const fileName = `${type}_summary_${monthYear}.csv`;

      // Filter out the data based on the approval status
      const filteredSummaries = summary.filter(row => {
        if (approvalFilter === "all") return true;
        return row.approval_status === approvalFilter;
      });

      // Calculate the totals
      const totals = filteredSummaries.reduce((acc, row) => {
        return {
          categoryA: acc.categoryA + (row.category_a_hours || 0),
          categoryAAmount: acc.categoryAAmount + (row.category_a_amount || (row.category_a_hours || 0) * 2),
          categoryC: acc.categoryC + (row.category_c_hours || 0),
          categoryCAmount: acc.categoryCAmount + (row.category_c_amount || (row.category_c_hours || 0) * 3),
          transportCost: acc.transportCost + (row.transportation_cost || 0),
          transportDays: acc.transportDays + (row.transportation_days || 0)
        };
      }, {
        categoryA: 0,
        categoryAAmount: 0,
        categoryC: 0,
        categoryCAmount: 0,
        transportCost: 0,
        transportDays: 0
      });

      if (type === 'overtime') {
        csvContent = 'Name,Staff ID,Grade,Category A Hours,Category A Amount,Category C Hours,Category C Amount\n';
        filteredSummaries.forEach((row) => {
          const catAAmount = row.category_a_amount !== undefined ? row.category_a_amount : (row.category_a_hours * 2);
          const catCAmount = row.category_c_amount !== undefined ? row.category_c_amount : (row.category_c_hours * 3);
          csvContent += `${row.name},${row.staff_id},${row.grade},${row.category_a_hours.toFixed(2)},${catAAmount.toFixed(2)},${row.category_c_hours.toFixed(2)},${catCAmount.toFixed(2)}\n`;
        });
        csvContent += `\nTotals,,,${totals.categoryA.toFixed(2)},${totals.categoryAAmount.toFixed(2)},${totals.categoryC.toFixed(2)},${totals.categoryCAmount.toFixed(2)}\n`;
      } else {
        csvContent = 'Name,Staff ID,Grade,Total Days,Transport Cost\n';
        filteredSummaries.forEach((row) => {
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

  // Add approval handler functions
  const handleApproveWorker = (workerId: string) => {
    setApprovalWorkerId(workerId);
    setIsApprovalDialogOpen(true);
    setIsConfirmingApproval(false); // Reset the confirmation state
  };
  
  const confirmApproval = async () => {
    if (!approvalWorkerId) return;
    
    try {
      setIsConfirmingApproval(true); // Set confirming state to true to disable button
      setLoading(true); // Start loading indicator
      await overtime.approveWorker(approvalWorkerId, selectedMonth, selectedYear);
      
      toast({
        title: "Success",
        description: "Worker entries approved successfully",
      });
      
      // Reset state and refresh
      setApprovalWorkerId(null);
      setIsApprovalDialogOpen(false);
      fetchSummary();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false); // Stop loading indicator regardless of outcome
      setIsConfirmingApproval(false); // Reset confirmation state
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Management Monthly Summary
              </h1>
              {user && (
                <p className="mt-2 text-lg text-gray-600">
                  Hello, {user.name} ({user.staffId})
                  {userRole && <span className="ml-2"><RoleBadge role={userRole} showFullName={true} /></span>}
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
            {/* Updated Navigation */}
             <div className="flex gap-4 mb-6 flex-wrap">
               <Button
                variant="ghost"
                onClick={() => navigate("/supervisor-dashboard")}
               >
                 <Home className="mr-2 h-4 w-4" /> Dashboard
               </Button>
               <Button
                 variant="ghost"
                 onClick={() => navigate("/supervisor-risk-management")}
               >
                 <Shield className="mr-2 h-4 w-4" /> Risk Management
               </Button>
                <Button
                 variant="ghost"
                 onClick={() => navigate("/supervisor-analytics")}
               >
                 <BarChart className="mr-2 h-4 w-4" /> Analytics
               </Button>
             </div>

            {/* Filters and Search */}
            <div className="flex gap-4 mb-6 flex-wrap">
               {/* Month Selector */}
              <div className="w-40">
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
              {/* Year Selector */}
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
              {/* Approval Status Filter */}
              <div className="w-40">
                <Select
                  value={approvalFilter}
                  onValueChange={setApprovalFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="standard">{getDisplayApprovalStatus("Standard")} Approved</SelectItem>
                    <SelectItem value="supervisor">{getDisplayApprovalStatus("Supervisor")} Approved</SelectItem>
                    <SelectItem value="approved">Fully Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Search Input */}
              <div className="flex-1 min-w-[200px]">
                <Input
                  id="summary-search"
                  placeholder="Search by name, staff ID, or grade..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>


            {/* Director/RCM Approve All Button */}
            {(userRole === "Director" || userRole === "RCM") && (
                <div className="flex justify-end mb-4">
                    <Button
                        variant="director"
                        onClick={handleApproveAll}
                        disabled={loading}
                        className="gap-1"
                    >
                        <ThumbsUp className="h-5 w-5" /> Approve All {getDisplayApprovalStatus("Supervisor")}-Reviewed Entries
                    </Button>
                </div>
            )}


            {/* Summary Table */}
            {loading ? (
              <LoadingSkeleton rows={5} columns={8} />
            ) : finalFilteredSummaries.length > 0 ? (
              <div className="mt-8">
                <div className="overflow-hidden shadow-lg ring-1 ring-black ring-opacity-5 rounded-lg border border-gray-200">
                  {/* Table header */}
                   <div className="bg-gray-100 grid grid-cols-8 divide-x divide-gray-200 font-semibold">
                    <div className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider col-span-1">Name</div>
                    <div className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider col-span-1">Staff ID</div>
                    <div className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider col-span-1">Grade</div>
                    <div className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider col-span-1">Category A</div>
                    <div className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider col-span-1">Category C</div>
                    <div className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider col-span-1">Transport</div>
                    <div className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider col-span-1">Status</div>
                    <div className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider col-span-1">Actions</div>
                   </div>


                  {/* Table body */}
                  <div className="bg-white divide-y divide-gray-200">
                    {finalFilteredSummaries.map((summaryItem) => {
                      // Check if all entries for this worker are Standard approved
                      const allEntriesStandard = summaryItem.entries && summaryItem.entries.length > 0
                        ? summaryItem.entries.every(e => e.approval_status === "Standard")
                        : false;
                      return (
                      <div key={summaryItem.worker_id} className="grid grid-cols-8 divide-x divide-gray-200 hover:bg-gray-50 transition-colors">
                        {/* Worker Info */}
                        <div className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 col-span-1">
                          <div className="truncate max-w-[150px]" title={summaryItem.name}>
                            {summaryItem.name}
                          </div>
                        </div>
                        <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 col-span-1">{summaryItem.staff_id}</div>
                        <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 col-span-1">{summaryItem.grade}</div>

                         {/* Amounts - Editable by Supervisor and Accountant */}
                           {editingWorkerId === summaryItem.worker_id && (userRole === "Accountant" || userRole === "Supervisor" || userRole === "RDM") ? (
                           <>
                             <div className="px-2 py-2 whitespace-nowrap text-sm text-gray-600 col-span-1">
                               <div className="mb-1 text-xs font-semibold text-gray-700">Hours: {summaryItem.category_a_hours.toFixed(2)}</div>
                               <Input
                                 type="number"
                                 value={editForm.category_a_amount}
                                 onChange={(e) => setEditForm({...editForm, category_a_amount: parseFloat(e.target.value) || 0})}
                                 className="h-8 text-sm"
                                 placeholder="Amount (₵)"
                               />
                             </div>
                             <div className="px-2 py-2 whitespace-nowrap text-sm text-gray-600 col-span-1">
                               <div className="mb-1 text-xs font-semibold text-gray-700">Hours: {summaryItem.category_c_hours.toFixed(2)}</div>
                               <Input
                                 type="number"
                                 value={editForm.category_c_amount}
                                 onChange={(e) => setEditForm({...editForm, category_c_amount: parseFloat(e.target.value) || 0})}
                                 className="h-8 text-sm"
                                 placeholder="Amount (₵)"
                               />
                             </div>
                             <div className="px-2 py-2 whitespace-nowrap text-sm text-gray-600 col-span-1">
                               <Input
                                 type="number"
                                 value={editForm.transportation_cost}
                                 onChange={(e) => setEditForm({...editForm, transportation_cost: parseFloat(e.target.value) || 0})}
                                 className="h-8 text-sm"
                                 placeholder="Amount (₵)"
                               />
                             </div>
                           </>
                         ) : (
                           <>
                             <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 col-span-1">
                                 <div className="text-green-600 font-bold text-base">₵{summaryItem.category_a_amount?.toFixed(2) ?? '0.00'}</div>
                                 <div className="text-gray-500 text-xs mt-1">{summaryItem.category_a_hours.toFixed(2)} hrs</div>
                             </div>
                             <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 col-span-1">
                                 <div className="text-green-600 font-bold text-base">₵{summaryItem.category_c_amount?.toFixed(2) ?? '0.00'}</div>
                                 <div className="text-gray-500 text-xs mt-1">{summaryItem.category_c_hours.toFixed(2)} hrs</div>
                             </div>
                             <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 col-span-1">
                                 <div className="text-green-600 font-bold text-base">₵{summaryItem.transportation_cost?.toFixed(2) ?? '0.00'}</div>
                                 <div className="text-gray-500 text-xs mt-1">{summaryItem.transportation_days || 0} days</div>
                             </div>
                           </>
                         )}


                        {/* Status Badge */}
                        <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 col-span-1">
                              {getApprovalBadge(summaryItem as WorkerSummary)}
                        </div>

                         {/* Action Buttons */}
                         <div className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 col-span-1 flex gap-1 items-center">
                           {editingWorkerId === summaryItem.worker_id ? (
                             <>
                                 <Button 
                                  variant="approve" 
                                  size="sm" 
                                  onClick={() => handleSaveAmounts(summaryItem.worker_id)} 
                                  disabled={loading}
                                 >
                                   {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                   Save
                                 </Button>
                                 <Button variant="outline" size="sm" onClick={handleCancelEdit} disabled={loading}>Cancel</Button>
                             </>
                           ) : (
                             <>
                                  {/* Edit button for Supervisor/RDM and Accountant */}
                                  {(userRole === "Supervisor" || userRole === "RDM" || userRole === "Accountant") && (
                                   <Button
                                       variant="outline"
                                     size="sm"
                                     onClick={() => handleEditWorker(summaryItem.worker_id, summaryItem as any)}
                                       disabled={
                                         loading ||
                                         editingWorkerId !== null ||
                                         // For RDM, only enable if all entries are Standard approved
                                         (userRole === "RDM" && !allEntriesStandard) ||
                                         // For Supervisor, keep previous logic
                                         (userRole === "Supervisor" && !((summaryItem as any).approval_statuses?.includes("Standard") || (summaryItem as any).approval_statuses?.includes("Pending")))
                                       }
                                       title={`Edit amounts (${getDisplayApprovalStatus(userRole)})`}
                                   >
                                     <Edit className="h-4 w-4" />
                                   </Button>
                                )}
                                  
                                  {/* Approve button for Supervisor/RDM */}
                                  {(userRole === "Supervisor" || userRole === "RDM") && (
                                     <Button
                                       variant="rdm"
                                       size="sm"
                                       onClick={() => handleApproveWorker(summaryItem.worker_id)}
                                       disabled={
                                         loading ||
                                         editingWorkerId !== null ||
                                         // For RDM, only enable if all entries are Standard approved
                                         (userRole === "RDM" && !allEntriesStandard) ||
                                         // For Supervisor, keep previous logic
                                         (userRole === "Supervisor" && (!((summaryItem as any).approval_statuses?.includes("Standard")) || (summaryItem as any).approval_statuses?.includes("Supervisor") || (summaryItem as any).approval_statuses?.includes("Approved")))
                                       }
                                       title={`Approve as ${getDisplayApprovalStatus("Supervisor")}`}
                                     >
                                       {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                                     </Button>
                                  )}
                                  
                                  {/* View Details button for Director/RCM at Supervisor stage */}
                                  {(userRole === "Director" || userRole === "RCM") && (
                                    <Button
                                        variant="director"
                                        size="sm"
                                          onClick={() => navigate(`/worker-details-supervisor?id=${summaryItem.worker_id}`)} // Navigate to supervisor worker details with ID
                                          disabled={!(summaryItem as any).approval_statuses?.includes("Supervisor")}
                                        title="View details for final approval"
                                    >
                                        <Users className="h-4 w-4" />
                                    </Button>
                                )}
                             </>
                           )}
                         </div>

                      </div>
                      );
                    })}
                  </div>

                  {/* Totals row */}
                  <div className="bg-gray-100 grid grid-cols-8 divide-x divide-gray-200 font-medium">
                    <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 col-span-3">Monthly Totals</div>
                    {/* Calculate total amounts dynamically for display */}
                    <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 col-span-1">
                        <div className="text-green-600 font-bold text-base">₵{finalFilteredSummaries.reduce((sum, row) => sum + ((row as any).category_a_amount !== undefined ? (row as any).category_a_amount : (row.category_a_hours * 2)), 0).toFixed(2)}</div>
                        <div className="text-gray-500 text-xs mt-1">{totals.totalCategoryA.toFixed(2)} hrs</div>
                    </div>
                     <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 col-span-1">
                        <div className="text-green-600 font-bold text-base">₵{finalFilteredSummaries.reduce((sum, row) => sum + ((row as any).category_c_amount !== undefined ? (row as any).category_c_amount : (row.category_c_hours * 3)), 0).toFixed(2)}</div>
                        <div className="text-gray-500 text-xs mt-1">{totals.totalCategoryC.toFixed(2)} hrs</div>
                    </div>
                    <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 col-span-1">
                      <div className="text-green-600 font-bold text-base">₵{totals.totalTransport.toFixed(2)}</div>
                    </div>
                    <div className="px-6 py-4 whitespace-nowrap col-span-2"></div> {/* Spans Status and Actions */}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                No data available for the selected month and filters.
              </p>
            )}

            {/* Export Buttons */}
            <div className="mt-6 flex justify-end space-x-4">
              <Button
                onClick={() => exportData('overtime')}
                variant="outline"
                className="border-blue-200 hover:bg-blue-50"
                disabled={finalFilteredSummaries.length === 0} // Disable if no filtered data
              >
                <Download className="mr-2 h-4 w-4" />
                Export Overtime
              </Button>
              <Button
                onClick={() => exportData('transport')}
                variant="outline"
                className="border-green-200 hover:bg-green-50"
                 disabled={finalFilteredSummaries.length === 0} // Disable if no filtered data
              >
                <Download className="mr-2 h-4 w-4" />
                Export Transport
              </Button>
            </div>
          </Card>
        </div>
      </div>
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Approval</DialogTitle>
            <DialogDescription>
              {(userRole === "Supervisor" || userRole === "RDM") ? 
                `Are you sure you want to approve this worker's entries? This will change only entries with ${getDisplayApprovalStatus("Standard")} status to ${getDisplayApprovalStatus("Supervisor")} status. Entries not yet approved by District Head will not be affected.` : 
                (userRole === "Director" || userRole === "RCM") ?
                `Are you sure you want to approve this worker's entries? This will change only entries with ${getDisplayApprovalStatus("Supervisor")} status to Approved status. Entries not yet approved by RDM will not be affected.` :
                `Are you sure you want to approve these entries?`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              type="submit" 
              onClick={confirmApproval} 
              disabled={isConfirmingApproval}
            >
              {isConfirmingApproval ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : "Confirm"}
            </Button>
            <Button 
              type="reset" 
              onClick={() => setIsApprovalDialogOpen(false)} 
              variant="outline" 
              disabled={isConfirmingApproval}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ErrorBoundary>
  );
};

// Export the renamed component
export default SupervisorMonthlySummary; 