import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Worker, WorkerSummary, AREAS } from "@/types";
import { OvertimeEntry as OvertimeEntryComponent } from "@/components/OvertimeEntry";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Calendar, Users, LogOut } from "lucide-react";
import { format } from "date-fns";
import { workers as workersApi, overtime } from "@/lib/api";

const Index = () => {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [summaryData, setSummaryData] = useState<WorkerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchWorkers = async () => {
      setLoading(true);
      try {
        const data = await workersApi.getAll();
        setWorkers(data);
      } catch (error) {
        console.error("Failed to fetch workers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkers();
  }, []);

  useEffect(() => {
    const fetchCurrentMonthSummary = async () => {
      setLoading(true);
      try {
        const data = await overtime.getMonthlySummary(currentMonth, currentYear);
        setSummaryData(data);
      } catch (error) {
        console.error("Failed to fetch monthly summary:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentMonthSummary();
  }, [currentMonth, currentYear]);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleAddEntry = async (entryData: {
    worker_id: string;
    date: string;
    entry_time: string;
    exit_time: string;
    category: 'A' | 'C';
    category_a_hours: number;
    category_c_hours: number;
    transportation: boolean;
    transportation_cost?: number;
  }) => {
    try {
      // Find the worker to get their default_area
      const worker = workers.find(w => w.id === entryData.worker_id);
      if (!worker) throw new Error("Worker not found");

      // Find the area rate from AREAS constant
      const area = AREAS.find(a => a.name === worker.default_area);
      if (!area && entryData.transportation) {
        throw new Error("Area rate not found for worker's default area");
      }

      // If transportation is true, set the transportation_cost from area rate
      const dataToSubmit = {
        ...entryData,
        transportation_cost: entryData.transportation ? area?.rate || 0 : undefined
      };


      // Submit the entry with the transportation cost
      await overtime.create(dataToSubmit);
      
      // Refresh the summary data after adding new entry
      const newSummaryData = await overtime.getMonthlySummary(currentMonth, currentYear);
      setSummaryData(newSummaryData);
    } catch (error) {
      console.error("Error adding entry:", error);
      throw error;
    }
  };

  const calculateTotals = () => {
    return summaryData.reduce((acc, item) => ({
      total_category_a: acc.total_category_a + item.category_a_hours,
      total_category_c: acc.total_category_c + item.category_c_hours,
      total_transport_cost: acc.total_transport_cost + item.transportation_cost
    }), {
      total_category_a: 0,
      total_category_c: 0,
      total_transport_cost: 0
    });
  };

  const exportData = (type: 'overtime' | 'transport') => {
    const totals = calculateTotals();
    let csvContent = '';

    if (type === 'overtime') {
      csvContent = 'Name,Staff ID,Grade,Category A Hours,Category C Hours\n';
      summaryData.forEach((row) => {
        csvContent += `${row.name},${row.staff_id},${row.grade},${row.category_a_hours.toFixed(2)},${row.category_c_hours.toFixed(2)}\n`;
      });
      csvContent += `\nTotals,,,${totals.total_category_a.toFixed(2)},${totals.total_category_c.toFixed(2)}\n`;
    } else {
      csvContent = 'Name,Staff ID,Grade,Total Days,Transport Cost\n';
      summaryData.forEach((row) => {
        csvContent += `${row.name},${row.staff_id},${row.grade},${row.transportation_days},${row.transportation_cost.toFixed(2)}\n`;
      });
      csvContent += `\nTotals,,,,${totals.total_transport_cost.toFixed(2)}\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${type}_summary_${format(new Date(), 'yyyy-MM')}.csv`);
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
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Overtime, Transportation and Risk Management System
            </h1>
            <p className="mt-4 text-lg text-gray-500">
              Manage worker overtime and transportation costs
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>

        <Card className="p-4 bg-white shadow-sm">
          <nav className="flex space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/add-worker")}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Worker
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/monthly-summary")}
            >
              <Calendar className="mr-2 h-4 w-4" /> Monthly Summary
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/worker-details")}
            >
              <Users className="mr-2 h-4 w-4" /> Worker Details
            </Button>
          </nav>
        </Card>

        <div className="grid grid-cols-1 gap-8">
          <OvertimeEntryComponent workers={workers} onSubmit={handleAddEntry} />
        </div>

        <div className="mt-8">
          <Card className="p-6 animate-slideIn">
            <h3 className="text-lg font-medium mb-4">Monthly Summary</h3>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
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
                          {summaryData.map((summary) => (
                            <tr key={summary.worker_id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {summary.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {summary.staff_id}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {summary.grade}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {summary.category_a_hours.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {summary.category_c_hours.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {summary.transportation_days}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                ₵{summary.transportation_cost?.toFixed(2) || ''}
                              </td>
                            </tr>
                          ))}
                          {summaryData.length > 0 && (
                            <tr className="bg-gray-50 font-medium">
                              <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                Monthly Totals
                              </td>
                              {(() => {
                                const totals = calculateTotals();
                                return (
                                  <>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {totals.total_category_a.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {totals.total_category_c.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">

                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {totals.total_transport_cost.toFixed(2)}
                                    </td>
                                  </>
                                );
                              })()}
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end space-x-4">
              <Button
                onClick={() => exportData('overtime')}
                variant="outline"
              >
                Export Overtime Data
              </Button>
              <Button
                onClick={() => exportData('transport')}
                variant="outline"
              >
                Export Transport Data
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
