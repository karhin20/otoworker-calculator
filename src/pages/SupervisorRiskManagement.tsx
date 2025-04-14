import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Home, Calendar, ChevronLeft, ChevronRight, Search, Download, CheckCircle2, XCircle, BarChart } from "lucide-react";
import { format } from "date-fns";
import { workers as workersApi, risk } from "@/lib/api";
import { Worker, RiskEntry } from "@/types";
import { toast } from "@/hooks/use-toast";
import { getAndClearNotification } from "@/utils/notifications";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SupervisorRiskManagement = () => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [riskEntries, setRiskEntries] = useState<RiskEntry[]>([]);
  const [_workersList, setWorkersList] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ name: string; staffId: string; grade: string; role?: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedEntry, setSelectedEntry] = useState<RiskEntry | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
      
      // Redirect standard users to regular dashboard
      if (!userData.role || userData.role === "Standard") {
        navigate("/risk-management");
      }
    }
  }, [navigate]);
  
  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const data = await workersApi.getAll();
        setWorkersList(data);
      } catch (error) {
        console.error("Failed to fetch workers:", error);
      }
    };

    fetchWorkers();
  }, []);

  useEffect(() => {
    const fetchRiskEntries = async () => {
      setLoading(true);
      try {
        const data = await risk.getMonthly(selectedMonth, selectedYear);
        // Sort the entries by date in descending order (newest first)
        const sortedData = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRiskEntries(sortedData);
      } catch (error) {
        console.error("Failed to fetch risk entries:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRiskEntries();
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

  // Generate month options
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

  // Generate year options
  const years = Array.from(
    { length: 5 },
    (_, i) => selectedYear - 2 + i
  );

  // Handle sign out
  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  // Filter risk entries based on search term
  const filteredRiskEntries = useMemo(() => {
    return riskEntries.filter(entry => 
      entry.worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.worker.staff_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [riskEntries, searchTerm]);

  // Implement pagination
  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRiskEntries.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRiskEntries, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => Math.ceil(filteredRiskEntries.length / itemsPerPage), [filteredRiskEntries.length, itemsPerPage]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle items per page change
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Handle view entry details
  const handleViewEntry = (entry: RiskEntry) => {
    setSelectedEntry(entry);
    setIsViewDialogOpen(true);
  };

  // Close view dialog
  const handleCloseViewDialog = () => {
    setIsViewDialogOpen(false);
    setSelectedEntry(null);
  };

  // Handle approve risk entry
  const handleApproveEntry = async (entryId: string) => {
    setIsApproving(true);
    try {
      await risk.approve(entryId);
      toast({
        title: "Approved",
        description: "Risk entry has been approved successfully",
        variant: "default",
      });
      // Refresh risk entries
      const data = await risk.getMonthly(selectedMonth, selectedYear);
      const sortedData = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRiskEntries(sortedData);
      handleCloseViewDialog();
    } catch (error) {
      console.error("Failed to approve risk entry:", error);
      toast({
        title: "Error",
        description: "Failed to approve risk entry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsApproving(false);
    }
  };

  // Handle reject risk entry
  const handleRejectEntry = async (entryId: string) => {
    setIsRejecting(true);
    try {
      await risk.reject(entryId);
      toast({
        title: "Rejected",
        description: "Risk entry has been rejected",
        variant: "destructive",
      });
      // Refresh risk entries
      const data = await risk.getMonthly(selectedMonth, selectedYear);
      const sortedData = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRiskEntries(sortedData);
      handleCloseViewDialog();
    } catch (error) {
      console.error("Failed to reject risk entry:", error);
      toast({
        title: "Error",
        description: "Failed to reject risk entry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRejecting(false);
    }
  };

  // Export risk entries
  const handleExportEntries = () => {
    try {
      let csvContent = 'Staff ID,Name,Date,Location,Size/Depth,Rate,Remarks\n';
      riskEntries.forEach((entry) => {
        csvContent += `${entry.worker.staff_id},`;
        csvContent += `${entry.worker.name},`;
        csvContent += `${format(new Date(entry.date), "yyyy-MM-dd")},`;
        csvContent += `${entry.location},`;
        csvContent += `${entry.size_depth},`;
        csvContent += `${entry.rate.toFixed(2)},`;
        csvContent += `${entry.remarks || ""}\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `risk_entries_${selectedMonth}_${selectedYear}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Successful",
        description: "Risk entries have been exported to CSV",
        variant: "default",
      });
    } catch (error) {
      console.error("Failed to export risk entries:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export risk entries. Please try again.",
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
                Risk Management Portal
              </h1>
              {user && (
                <p className="mt-2 text-lg text-gray-600">
                  Hello, {user.name} ({user.staffId})
                  {user.role && <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {user.role} Role
                  </span>}
                </p>
              )}
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </div>

          <Card className="p-4 bg-white shadow-sm">
            <nav className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                onClick={() => navigate("/supervisor-dashboard")}
              >
                <Home className="mr-2 h-4 w-4" /> Dashboard
              </Button>
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
            </nav>
          </Card>

          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Month</h3>
                  <Select
                  value={selectedMonth.toString()}
                  onValueChange={(value) => setSelectedMonth(parseInt(value))}
                  >
                  <SelectTrigger className="w-full">
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
                <h3 className="text-lg font-medium mb-4">Year</h3>
                  <Select
                  value={selectedYear.toString()}
                  onValueChange={(value) => setSelectedYear(parseInt(value))}
                  >
                  <SelectTrigger className="w-full">
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
                
              <div>
                <h3 className="text-lg font-medium mb-4">Search</h3>
                <div className="flex w-full items-center space-x-2">
                  <Input
                    type="text"
                    placeholder="Search worker or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-grow"
                  />
                  <Button variant="outline" size="icon" className="h-10 w-10">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                    </div>
                  </div>

            <div className="flex justify-end mb-6">
                      <Button 
                        variant="outline" 
                onClick={handleExportEntries}
                disabled={riskEntries.length === 0}
                      >
                <Download className="mr-2 h-4 w-4" />
                Export Entries
                      </Button>
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
                  <TableSkeleton rows={6} columns={6} />
          </div>
              ) : riskEntries.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Worker
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Staff ID
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Location
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedEntries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {entry.worker.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {entry.worker.staff_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(entry.date), "PP")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {entry.location}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {(entry as any).status === "approved" ? (
                                <Badge variant="success" className="text-xs">Approved</Badge>
                              ) : (entry as any).status === "rejected" ? (
                                <Badge variant="destructive" className="text-xs">Rejected</Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">Pending</Badge>
                              )}
                </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              ₵{entry.rate.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewEntry(entry)}
                              >
                                View Details
                              </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
                    <div className="flex flex-1 justify-between sm:hidden">
                      <Button
                        variant="outline"
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to{" "}
                          <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredRiskEntries.length)}</span> of{" "}
                          <span className="font-medium">{filteredRiskEntries.length}</span> results
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
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-lg text-gray-500">No risk entries found for the selected period.</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6 bg-blue-50 border border-blue-100">
            <h3 className="text-xl font-semibold text-blue-800 mb-4">Risk Management for Admin Roles</h3>
            <p className="text-blue-700 mb-4">
              As an admin user (Supervisor, Accountant, Director), you can review and manage risk entries submitted by workers.
              You can approve or reject entries based on policy and view detailed information about each entry.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div className="space-y-2">
                <h4 className="text-lg font-medium text-blue-800">Approving Entries</h4>
                <p className="text-blue-700">
                  Review the details of each entry carefully before approving.
                  Approved entries will be processed for payment.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-medium text-blue-800">Rejecting Entries</h4>
                <p className="text-blue-700">
                  If an entry has incorrect information or doesn't qualify for risk allowance,
                  you can reject it with an explanation.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* View Entry Dialog */}
      {selectedEntry && (
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Risk Entry Details</DialogTitle>
              <DialogDescription>
                View the full details of this risk entry.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Worker</Label>
                  <p className="font-medium">{selectedEntry.worker.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Staff ID</Label>
                  <p className="font-medium">{selectedEntry.worker.staff_id}</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p className="font-medium">{format(new Date(selectedEntry.date), "PP")}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Location</Label>
                  <p className="font-medium">{selectedEntry.location}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Size/Depth</Label>
                <p className="font-medium">{selectedEntry.size_depth}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Rate</Label>
                <p className="font-medium">₵{selectedEntry.rate.toFixed(2)}</p>
              </div>
              {selectedEntry.remarks && (
                <div>
                  <Label className="text-muted-foreground">Remarks</Label>
                  <p className="font-medium">{selectedEntry.remarks}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <p className="font-medium">
                  {(selectedEntry as any).status === "approved" ? (
                    <Badge variant="success">Approved</Badge>
                  ) : (selectedEntry as any).status === "rejected" ? (
                    <Badge variant="destructive">Rejected</Badge>
                  ) : (
                    <Badge variant="outline">Pending</Badge>
                  )}
                </p>
              </div>
              {(selectedEntry as any).approved_by && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <span className="text-gray-500">Approved By:</span>
                  <p className="font-medium">{(selectedEntry as any).approved_by}</p>
                </div>
              )}
              {(selectedEntry as any).approved_at && (
                <div>
                  <Label className="text-muted-foreground">Approved At</Label>
                  <p className="font-medium">{format(new Date((selectedEntry as any).approved_at), "PPp")}</p>
                </div>
              )}
            </div>
            <DialogFooter className="flex justify-between">
              <div className="space-x-2">
                {/* Show approve/reject buttons only for pending entries */}
                {(selectedEntry as any).status === "pending" && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => handleRejectEntry(selectedEntry.id)}
                      disabled={isRejecting || isApproving}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      {isRejecting ? "Rejecting..." : "Reject"}
                    </Button>
                    <Button
                      variant="default"
                      onClick={() => handleApproveEntry(selectedEntry.id)}
                      disabled={isRejecting || isApproving}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {isApproving ? "Approving..." : "Approve"}
                    </Button>
                  </>
                )}
              </div>
              <Button variant="outline" onClick={handleCloseViewDialog}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </ErrorBoundary>
  );
};

export default SupervisorRiskManagement; 