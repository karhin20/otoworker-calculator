import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Shield, LogOut, Download, ChevronLeft, ChevronRight, Users, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { WorkerDetail, WorkerDetailWithApproval, ApprovalStatus } from "@/types";
import { workers, overtime } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { getAndClearNotification } from "@/utils/notifications";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const WorkerReports = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ id?: string; name: string; staffId: string; role?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [workerDbId, setWorkerDbId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [details, setDetails] = useState<WorkerDetail[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  // Load user data from localStorage
  useEffect(() => {
    const workerStr = localStorage.getItem("worker");
    if (workerStr) {
      setUser(JSON.parse(workerStr));
    }

    const notification = getAndClearNotification();
    if (notification) {
      toast({
        title: notification.type.charAt(0).toUpperCase() + notification.type.slice(1),
        description: notification.message,
        variant: notification.type === 'error' ? 'destructive' : 'default',
      });
    }
  }, []);

  // Get worker DB ID from staff ID when user data is loaded
  useEffect(() => {
    const fetchWorkerDbId = async () => {
      if (user?.staffId && !workerDbId) {
        setLoading(true);
        try {
          const workerDetails = await workers.getByStaffId(user.staffId);
          // Access the id property in a type-safe way
          if (workerDetails && typeof workerDetails === 'object' && 'id' in workerDetails) {
            setWorkerDbId(workerDetails.id as string);
          } else {
            throw new Error('Worker details or ID not found');
          }
        } catch (error) {
          console.error("Failed to fetch worker DB ID:", error);
          toast({
            title: "Error",
            description: "Failed to load your worker information for reports.",
            variant: "destructive",
          });
          setLoading(false);
        }
      }
    };
    fetchWorkerDbId();
  }, [user, workerDbId]);

  // Fetch worker details (overtime entries) when month/year changes or worker DB ID is available
  useEffect(() => {
    if (workerDbId) {
      fetchWorkerDetails();
    }
  }, [workerDbId, selectedMonth, selectedYear]);

  // Fetch worker details (overtime reports)
  const fetchWorkerDetails = async () => {
    if (!workerDbId) return;

    setLoading(true);
    try {
      const data = await overtime.getByWorker(
        workerDbId,
        selectedMonth,
        selectedYear
      );
      // Sort the details by date in ascending order
      const sortedData = data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setDetails(sortedData);
    } catch (error) {
      console.error("Failed to fetch details:", error);
      toast({
        title: "Error",
        description: "Failed to load your overtime details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals from the details
  const totals = useMemo(() => {
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

  // Implement pagination
  const paginatedDetails = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return details.slice(startIndex, startIndex + itemsPerPage);
  }, [details, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => Math.ceil(details.length / itemsPerPage), [details.length, itemsPerPage]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle items per page change
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Handle sign out
  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("workerToken");
    localStorage.removeItem("workerTokenExpiry");
    localStorage.removeItem("worker");
    navigate("/");
  };

  // Export worker details to CSV
  const exportWorkerDetails = (exportType: 'transportation' | 'overtime') => {
    if (!details.length || !user) return;
    
    const monthName = months.find(m => m.value === selectedMonth)?.label;
    
    if (exportType === 'transportation') {
      const fileName = `${user.name}_${monthName}_${selectedYear}_transportation.csv`;
      
      const headerFields = [
        `Employee: ${user.name}`,
        `Staff ID: ${user.staffId}`,
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
          csvContent += `${detail.workers.default_area || 'Worker Area'},`;
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
      const fileName = `${user.name}_${monthName}_${selectedYear}_overtime.csv`;
      
      const headerFields = [
        `OVERTIME CLAIMS FOR THE MONTH OF: ${monthName}`,
        `Name: ${user.name}`,
        `Staff ID: ${user.staffId}`,
        `Region: Accra East`,
      ];
      
      let csvContent = headerFields.join('\n') + '\n\n';
      // Create a hierarchical header with two rows
      csvContent += 'Date,Time In,Time Out,Clock Time (From Clock In System),CAT A,CAT C,HRS,Remarks\n';

      // Add each detail row
      details.forEach((detail) => {
        const totalHours = (detail.category_a_hours || 0) + (detail.category_c_hours || 0);
        
        csvContent += `${format(new Date(detail.date), "yyyy-MM-dd")},`;
        csvContent += `${detail.entry_time},`;
        csvContent += `${detail.exit_time},`;
        csvContent += `Auto, `;
        csvContent += `${detail.category_a_hours ?? 0},`;
        csvContent += `${detail.category_c_hours ?? 0},`;
        csvContent += `${totalHours > 0 ? totalHours.toFixed(2) : ''},`;
        csvContent += `${detail.remarks || ''}\n`;
      });

      // Add totals row - align Total Hours under HRS column
      const totalHrs = totals.totalCategoryA + totals.totalCategoryC;
      csvContent += `\nTotal,,,,,,,${totalHrs.toFixed(2)}`;
      
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
  };

  // Add function to get appropriate badge for approval status
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
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              My Overtime & Transportation Reports
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
              onClick={() => navigate("/worker-dashboard")}
            >
              <Users className="mr-2 h-4 w-4" /> Dashboard
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/clock-in-out")}
            >
              <Clock className="mr-2 h-4 w-4" /> Clock In/Out
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/worker-risk")}
            >
              <Shield className="mr-2 h-4 w-4" /> Risk Entries
            </Button>
          </nav>
        </Card>

        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            {detail.category_a_hours ?? 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {detail.category_c_hours ?? 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {detail.transportation 
                              ? <span className="font-mono">₵{(detail.transportation_cost || parseFloat(detail.workers.default_area) || 0).toFixed(2)}</span>
                              : 'No'
                            }
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {getApprovalBadge((detail as WorkerDetailWithApproval).approval_status || "Pending")}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-medium">
                        <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          Totals
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {totals.totalCategoryA.toFixed(2)} hrs
                          <div className="text-blue-600 mt-1">₵{totals.totalCategoryAAmount.toFixed(2)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {totals.totalCategoryC.toFixed(2)} hrs
                          <div className="text-blue-600 mt-1">₵{totals.totalCategoryCAmount.toFixed(2)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₵{totals.totalTransport.toFixed(2)}
                        </td>
                        <td></td>
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
                    <Download className="mr-2 h-4 w-4" />
                    Export Transportation
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => exportWorkerDetails('overtime')}
                    disabled={!details.length}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export Overtime
                  </Button>
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      aria-label="Previous page"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      aria-label="Next page"
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
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-center text-gray-500 py-8">
                No overtime entries found for the selected period
              </p>
            )}
          </div>
        </Card>

        {/* Explanation Card */}
        <Card className="p-6 bg-blue-50 border border-blue-100">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Understanding Your Reports</h3>
          <ul className="space-y-2 text-blue-700">
            <li className="flex items-start">
              <span className="inline-flex items-center justify-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 mr-2">1</span>
              <span>
                <strong>Category A Hours:</strong> Overtime hours on weekdays, paid at a standard rate
              </span>
            </li>
            <li className="flex items-start">
              <span className="inline-flex items-center justify-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 mr-2">2</span>
              <span>
                <strong>Category C Hours:</strong> Overtime hours on weekends and holidays, paid at a premium rate
              </span>
            </li>
            <li className="flex items-start">
              <span className="inline-flex items-center justify-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 mr-2">3</span>
              <span>
                <strong>Transport:</strong> Transportation allowance based on your assigned area
              </span>
            </li>
            <li className="flex items-start">
              <span className="inline-flex items-center justify-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 mr-2">4</span>
              <span>
                <strong>Status:</strong> Current approval status of your entries
              </span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default WorkerReports; 