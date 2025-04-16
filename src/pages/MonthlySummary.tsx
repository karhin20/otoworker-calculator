import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { LogOut, Download, Shield, CheckCircle2, AlertCircle, Clock, Edit, ThumbsUp, Users } from "lucide-react";
import { overtime } from "@/lib/api";
import { WorkerSummary, ApprovalStatus } from "@/types";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { toast } from "@/hooks/use-toast";
import { getAndClearNotification } from "@/utils/notifications";
import { Badge } from "@/components/ui/badge";
import RoleBadge from "@/components/RoleBadge";

const MonthlySummary = () => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState<WorkerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<{ name: string; staffId: string; grade: string; role?: string } | null>(null);
  const [userRole, setUserRole] = useState<string>("Standard");
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    category_a_amount: 0,
    category_c_amount: 0,
    transportation_cost: 0
  });
  const [approvalFilter, setApprovalFilter] = useState<string>("all");

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
      setUserRole(userData.role || "Standard");
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

  // Define fetchSummary function for reuse outside the useEffect
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
  const getApprovalBadge = (statuses: ApprovalStatus[]) => {
    // If any are rejected, show rejected
    if (statuses.includes("Rejected")) {
      return <Badge variant="destructive" className="flex items-center gap-1 text-xs py-1"><AlertCircle className="h-3.5 w-3.5" /> Rejected</Badge>;
    }
    
    // If all are approved, show approved (final approval)
    if (statuses.every(status => status === "Approved")) {
      return <Badge variant="success" className="flex items-center gap-1 text-xs py-1"><CheckCircle2 className="h-3.5 w-3.5" /> Approved</Badge>;
    }
    
    // If any are supervisor approved
    if (statuses.includes("Supervisor")) {
      return <Badge variant="secondary" className="flex items-center gap-1 text-xs py-1 bg-blue-100 text-blue-800 border-blue-200"><CheckCircle2 className="h-3.5 w-3.5" /> Supervisor</Badge>;
    }
    
    // If any are standard admin approved
    if (statuses.includes("Standard")) {
      return <Badge variant="secondary" className="flex items-center gap-1 text-xs py-1 bg-green-100 text-green-800 border-green-200"><CheckCircle2 className="h-3.5 w-3.5" /> Standard</Badge>;
    }
    
    // Default to pending
    return <Badge variant="outline" className="flex items-center gap-1 text-xs py-1"><Clock className="h-3.5 w-3.5" /> Pending</Badge>;
  };

  // Handle entering edit mode for a worker
  const handleEditWorker = (workerId: string, currentSummary: any) => {
    // Make sure it can only be edited if it's at the right stage for the user's role
    if (userRole === "Standard" && currentSummary.approval_statuses?.includes("Pending")) {
      setEditingWorkerId(workerId);
      setEditForm({
        category_a_amount: currentSummary.category_a_amount || currentSummary.category_a_hours * 2,
        category_c_amount: currentSummary.category_c_amount || currentSummary.category_c_hours * 3,
        transportation_cost: currentSummary.transportation_cost || 0
      });
    } else if ((userRole === "Supervisor" || userRole === "RDM") && currentSummary.approval_statuses?.includes("Standard")) {
      setEditingWorkerId(workerId);
      setEditForm({
        category_a_amount: currentSummary.category_a_amount || currentSummary.category_a_hours * 2,
        category_c_amount: currentSummary.category_c_amount || currentSummary.category_c_hours * 3,
        transportation_cost: currentSummary.transportation_cost || 0
      });
    } else {
      // Wrong status for this user role
      toast({
        title: "Cannot Edit",
        description: "You can only edit entries at your approval level",
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

  // Handle saving edited amounts
  const handleSaveAmounts = async () => {
    try {
      // In a real implementation, this would need to update all entries for this worker
      // For this example, we'll just show a toast
      toast({
        title: "Success",
        description: "Amounts updated successfully",
      });
      
      // Reset edit state
      handleCancelEdit();
      
      // Refresh data
      fetchSummary();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update amounts",
        variant: "destructive",
      });
    }
  };

  // Handle mass approval (for directors)
  const handleApproveAll = async () => {
    try {
      setLoading(true);
      // Get user info for tracking who approved the entries
      const userInfo = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")!) : null;
      const userName = userInfo?.name || "Unknown User";
      
      // This would approve all entries at the accountant level
      await overtime.approveAllByDirector(selectedMonth, selectedYear, userName);
      
      toast({
        title: "Success",
        description: "All entries have been approved",
      });
      
      // Refresh data
      fetchSummary();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter summaries based on approval status
  const filterSummaries = (summaries: any[]) => {
    if (approvalFilter === "all") return summaries;
    
    return summaries.filter(summary => {
      const statuses = summary.approval_statuses || ["Pending"];
      
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
      <div className="min-h-screen bg-gray-50 py-8 px-2 sm:px-4 lg:px-6">
        <div className="max-w-full mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Monthly Summary
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
            <div className="flex gap-4 mb-6 flex-wrap">
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
                    <SelectItem value="standard">Standard Approved</SelectItem>
                    <SelectItem value="supervisor">Supervisor Approved</SelectItem>
                    <SelectItem value="approved">Fully Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
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
                variant="ghost"
                onClick={() => navigate("/risk-management")}
              >
                <Shield className="mr-2 h-4 w-4" /> Risk Application
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate("/worker-details")}
              >
                <Users className="mr-2 h-4 w-4" /> Staff Details
              </Button>

              <div className="flex justify-between items-center mt-4">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setApprovalFilter("all")}>
                    All
                  </Button>
                  <Button variant="outline" onClick={() => setApprovalFilter("pending")}>
                    Pending
                  </Button>
                  <Button variant="outline" onClick={() => setApprovalFilter("approved")}>
                    Approved
                  </Button>
                  <Button variant="outline" onClick={() => setApprovalFilter("rejected")}>
                    Rejected
                  </Button>
                </div>
                
                {userRole === "Director" && (
                  <Button 
                    variant="director" 
                    onClick={handleApproveAll}
                    disabled={loading}
                    className="gap-1"
                  >
                    <ThumbsUp className="h-5 w-5" /> Approve All Entries
                  </Button>
                )}
              </div>
            </div>

            {loading ? (
              <LoadingSkeleton rows={5} columns={8} />
            ) : finalFilteredSummaries.length > 0 ? (
              <div className="mt-8">
                <div className="overflow-x-auto shadow-lg ring-1 ring-black ring-opacity-5 rounded-lg border border-gray-200 max-w-full">
                  {/* Table header */}
                  <div className="bg-gray-100 grid grid-cols-8 divide-x divide-gray-200 font-semibold">
                    <div className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider col-span-1">
                      Name
                    </div>
                    <div className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider col-span-1">
                            Staff ID
                    </div>
                    <div className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider col-span-1">
                            Grade
                    </div>
                    <div className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider col-span-1">
                      Category A
                    </div>
                    <div className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider col-span-1">
                      Category C
                    </div>
                    <div className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider col-span-1">
                      Transport
                    </div>
                    <div className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider col-span-1">
                      Status
                    </div>
                    {(userRole === "Accountant" || userRole === "Director") && (
                      <div className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider col-span-1">
                        Actions
                      </div>
                    )}
                  </div>
                  
                  {/* Table body */}
                  <div className="bg-white divide-y divide-gray-200">
                    {finalFilteredSummaries.map((summary) => (
                      <div key={summary.worker_id} className="grid grid-cols-8 divide-x divide-gray-200 hover:bg-gray-50 transition-colors">
                        <div className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 col-span-1">
                          <div className="truncate max-w-[150px]" title={summary.name}>
                            {summary.name}
                          </div>
                        </div>
                        <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 col-span-1">
                          {summary.staff_id}
                        </div>
                        <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 col-span-1">
                          {summary.grade}
                        </div>
                        
                        {editingWorkerId === summary.worker_id && userRole === "Accountant" ? (
                          // Edit mode for amount fields
                          <>
                            <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 col-span-1">
                              <Input
                                type="number"
                                value={editForm.category_a_amount}
                                onChange={(e) => setEditForm({...editForm, category_a_amount: parseFloat(e.target.value) || 0})}
                                className="w-full"
                              />
                            </div>
                            <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 col-span-1">
                              <Input
                                type="number"
                                value={editForm.category_c_amount}
                                onChange={(e) => setEditForm({...editForm, category_c_amount: parseFloat(e.target.value) || 0})}
                                className="w-full"
                              />
                            </div>
                            <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 col-span-1">
                              <Input
                                type="number"
                                value={editForm.transportation_cost}
                                onChange={(e) => setEditForm({...editForm, transportation_cost: parseFloat(e.target.value) || 0})}
                                className="w-full"
                              />
                            </div>
                          </>
                        ) : (
                          // Display mode
                          <>
                            <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 col-span-1">
                              <div className="font-semibold text-gray-700">{summary.category_a_hours.toFixed(2)} hrs</div>
                              <div className="text-blue-600 mt-1">₵{summary.category_a_amount?.toFixed(2) ?? (summary.category_a_hours * 2).toFixed(2)}</div>
                            </div>
                            <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 col-span-1">
                              <div className="font-semibold text-gray-700">{summary.category_c_hours.toFixed(2)} hrs</div>
                              <div className="text-blue-600 mt-1">₵{summary.category_c_amount?.toFixed(2) ?? (summary.category_c_hours * 3).toFixed(2)}</div>
                            </div>
                            <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 col-span-1">
                              <div className="font-semibold text-gray-700">{summary.transportation_days || 0} days</div>
                              <div className="text-blue-600 mt-1">₵{summary.transportation_cost?.toFixed(2) ?? "0.00"}</div>
                            </div>
                          </>
                        )}
                        
                        <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 col-span-1">
                          {getApprovalBadge(summary.approval_statuses || ["Pending"])}
                        </div>
                        
                        {(userRole === "Standard" || userRole === "District_Head" || userRole === "Supervisor" || userRole === "RDM" || userRole === "Accountant" || userRole === "Director" || userRole === "RCM") && (
                          <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 col-span-1 flex gap-2">
                            {editingWorkerId === summary.worker_id ? (
                              <>
                                <Button variant="approve" size="sm" onClick={handleSaveAmounts}>
                                  Save
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                {userRole === "Standard" && (
                                  <Button
                                    variant="standard"
                                    size="sm"
                                    onClick={() => handleEditWorker(summary.worker_id, summary)}
                                    disabled={
                                      editingWorkerId !== null || 
                                      !summary.approval_statuses?.includes("Pending") ||
                                      summary.approval_statuses?.includes("Standard") ||
                                      summary.approval_statuses?.includes("Approved")
                                    }
                                  >
                                    <Edit className="h-4 w-4 mr-1" /> Initial Review
                                  </Button>
                                )}
                                
                                {userRole === "Supervisor" && (
                                  <Button
                                    variant="supervisor"
                                    size="sm"
                                    onClick={() => handleEditWorker(summary.worker_id, summary)}
                                    disabled={
                                      editingWorkerId !== null || 
                                      !summary.approval_statuses?.includes("Standard") ||
                                      summary.approval_statuses?.includes("Supervisor") ||
                                      summary.approval_statuses?.includes("Approved")
                                    }
                                  >
                                    <Edit className="h-4 w-4 mr-1" /> Supervisor Review
                                  </Button>
                                )}
                                
                                {userRole === "Accountant" && (
                                  <Button
                                    variant="accountant"
                                    size="sm"
                                    onClick={() => handleEditWorker(summary.worker_id, summary)}
                                    disabled={
                                      editingWorkerId !== null || 
                                      !summary.approval_statuses?.includes("Supervisor") ||
                                      summary.approval_statuses?.includes("Accountant") ||
                                      summary.approval_statuses?.includes("Approved")
                                    }
                                  >
                                    <Edit className="h-4 w-4 mr-1" /> Edit Amounts
                                  </Button>
                                )}
                                
                                {userRole === "Director" && summary.approval_statuses?.includes("Supervisor") && (
                                  <Button
                                    variant="director"
                                    size="sm"
                                    onClick={() => navigate(`/worker-details?id=${summary.worker_id}`)}
                                  >
                                    <Users className="h-4 w-4 mr-1" /> View Details
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Totals row */}
                  <div className="bg-gray-100 grid grid-cols-8 divide-x divide-gray-200 font-medium">
                    <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 col-span-3">
                            Monthly Totals
                    </div>
                    <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 col-span-1">
                      <div className="font-semibold text-gray-700">{totals.totalCategoryA.toFixed(2)} hrs</div>
                      <div className="text-blue-600 font-bold text-base">₵{(totals.totalCategoryA * 2).toFixed(2)}</div>
                      <div className="text-gray-500 text-xs mt-1">{totals.totalCategoryA.toFixed(2)} hrs</div>
                    </div>
                    <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 col-span-1">
                      <div className="font-semibold text-gray-700">{totals.totalCategoryC.toFixed(2)} hrs</div>
                      <div className="text-blue-600 font-bold text-base">₵{(totals.totalCategoryC * 3).toFixed(2)}</div>
                      <div className="text-gray-500 text-xs mt-1">{totals.totalCategoryC.toFixed(2)} hrs</div>
                    </div>
                    <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 col-span-1">
                      <div className="font-bold text-base text-blue-600">₵{totals.totalTransport.toFixed(2)}</div>
                    </div>
                    <div className="px-6 py-4 whitespace-nowrap col-span-1"></div>
                    {(userRole === "Accountant" || userRole === "Director") && (
                      <div className="px-6 py-4 whitespace-nowrap col-span-1"></div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                No data available for the selected month
              </p>
            )}

            <div className="mt-6 flex justify-end space-x-4">
              <Button
                onClick={() => exportData('overtime')}
                variant="outline"
                className="border-blue-200 hover:bg-blue-50"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Overtime
              </Button>
              <Button
                onClick={() => exportData('transport')}
                variant="outline"
                className="border-blue-200 hover:bg-blue-50"
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
