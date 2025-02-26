import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Worker, OvertimeEntry, WorkerSummary } from "@/types";
import { OvertimeEntry as OvertimeEntryComponent } from "@/components/OvertimeEntry";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Calendar, Users, LogOut } from "lucide-react";
import { format } from "date-fns";

const Index = () => {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [entries, setEntries] = useState<OvertimeEntry[]>([]);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleAddEntry = (entryData: OvertimeEntry) => {
    setEntries([...entries, entryData]);
  };

  const calculateSummary = (): WorkerSummary[] => {
    return workers.map((worker) => {
      const workerEntries = entries.filter((entry) => entry.workerId === worker.id);
      const overtimeHours = workerEntries.reduce((sum, entry) => {
        const [entryHour, entryMinute] = entry.entryTime.split(":").map(Number);
        const [exitHour, exitMinute] = entry.exitTime.split(":").map(Number);
        
        let hours = exitHour - entryHour;
        let minutes = exitMinute - entryMinute;
        
        if (minutes < 0) {
          hours--;
          minutes += 60;
        }
        
        return sum + (hours + (minutes / 60));
      }, 0);

      const overtimeAmount = overtimeHours * 50; // Example rate
      const transportationDays = workerEntries.filter((entry) => entry.transportation).length;
      const transportationCost = transportationDays * (Number(worker.defaultArea) || 0);
      
      return {
        workerId: worker.id,
        name: worker.name,
        staffId: worker.staffId,
        grade: worker.grade,
        overtimeHours,
        overtimeAmount,
        transportationDays,
        transportationCost,
      };
    });
  };

  const exportData = (type: 'overtime' | 'transport') => {
    const summary = calculateSummary();
    let csvContent = '';

    if (type === 'overtime') {
      csvContent = 'Name,Staff ID,Grade,Overtime Hours,Overtime Amount\n';
      summary.forEach((row) => {
        csvContent += `${row.name},${row.staffId},${row.grade},${row.overtimeHours},${row.overtimeAmount}\n`;
      });
    } else {
      csvContent = 'Name,Staff ID,Transportation Days,Transportation Cost\n';
      summary.forEach((row) => {
        csvContent += `${row.name},${row.staffId},${row.transportationDays},${row.transportationCost}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${type}_summary_${format(new Date(), 'yyyy-MM-dd')}.csv`);
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
              Overtime Calculator
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
                      Overtime Hours
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Overtime Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transport Days
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transport Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {calculateSummary().map((summary) => (
                    <tr key={summary.workerId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {summary.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {summary.staffId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {summary.grade}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {summary.overtimeHours.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ₵{summary.overtimeAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {summary.transportationDays}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ₵{summary.transportationCost.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
