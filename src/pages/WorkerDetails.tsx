import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut } from "lucide-react";
import { format } from "date-fns";
import { workers, overtime } from "@/lib/api";
import { Worker, WorkerDetail } from "@/types";

const WorkerDetails = () => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedWorker, setSelectedWorker] = useState("");
  const [details, setDetails] = useState<WorkerDetail[]>([]);
  const [workersList, setWorkersList] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{ name: string; staffId: string; grade: string } | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const data = await workers.getAll();
        const sortWorkers = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
        setWorkersList(data.sort(sortWorkers));
      } catch (error) {
        console.error("Failed to fetch workers:", error);
      }
    };

    fetchWorkers();
  }, []);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!selectedWorker) return;

      setLoading(true);
      try {
        const data = await overtime.getByWorker(
          selectedWorker,
          selectedMonth,
          selectedYear
        );
        setDetails(data);
      } catch (error) {
        console.error("Failed to fetch details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [selectedWorker, selectedMonth, selectedYear]);

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
    return details.reduce((acc, detail) => ({
      totalCategoryA: acc.totalCategoryA + (detail.category_a_hours || 0),
      totalCategoryC: acc.totalCategoryC + (detail.category_c_hours || 0),
      totalTransport: acc.totalTransport + (detail.transportation ? (detail.transportation_cost || parseFloat(detail.workers.default_area) || 0) : 0)
    }), {
      totalCategoryA: 0,
      totalCategoryC: 0,
      totalTransport: 0
    });
  };

  const exportWorkerDetails = () => {
    if (!details.length || !selectedWorker) return;

    const worker = workersList.find(w => w.id === selectedWorker);
    if (!worker) return;

    const monthName = months.find(m => m.value === selectedMonth)?.label;
    const fileName = `${worker.name}_${monthName}_${selectedYear}_details.csv`;

    const totals = calculateTotals();
    let csvContent = 'Date,Entry Time,Exit Time,Category,Category A Hours,Category C Hours,Transport Cost\n';

    // Add each detail row
    details.forEach((detail) => {
      csvContent += `${format(new Date(detail.date), "yyyy-MM-dd")},`;
      csvContent += `${detail.entry_time},`;
      csvContent += `${detail.exit_time},`;
      csvContent += `${detail.category},`;
      csvContent += `${detail.category_a_hours || ''},`;
      csvContent += `${detail.category_c_hours || ''},`;
      csvContent += `${detail.transportation ? (detail.transportation_cost || parseFloat(detail.workers.default_area) || 0).toFixed(2) : ''}\n`;
    });

    // Add totals row
    csvContent += `\nTotals,,,,`;
    csvContent += `${totals.totalCategoryA.toFixed(2)},`;
    csvContent += `${totals.totalCategoryC.toFixed(2)},`;
    csvContent += `${totals.totalTransport.toFixed(2)}`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Worker Details
            </h1>
            {user && (
              <p className="mt-2 text-lg text-gray-600">
                Hello, {user.name} ({user.staffId}) - {user.grade}
              </p>
            )}
          </div>
          <Button variant="outline" onClick={() => navigate("/")}>
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>

        <Card className="p-6">
          <div className="flex gap-4 mb-6">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
            <Button variant="outline" onClick={() => navigate("/monthly-summary")}>
              Monthly Summary
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-medium mb-4">Select Worker</h3>
              <Select
                value={selectedWorker}
                onValueChange={setSelectedWorker}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a worker" />
                </SelectTrigger>
                <SelectContent>
                  {workersList.map((worker) => (
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
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {details.map((detail, index) => (
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
                              ? `₵${(detail.transportation_cost || parseFloat(detail.workers.default_area) || 0).toFixed(2)}`
                              : 'No'
                            }
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-medium">
                        <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          Totals
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {calculateTotals().totalCategoryA.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {calculateTotals().totalCategoryC.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₵{calculateTotals().totalTransport.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="outline"
                    onClick={exportWorkerDetails}
                    disabled={!details.length}
                  >
                    Export Details
                  </Button>
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
    </div>
  );
};

export default WorkerDetails;
