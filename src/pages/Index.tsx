
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Worker, OvertimeEntry, WorkerSummary } from "@/types";
import { OvertimeEntry as OvertimeEntryComponent } from "@/components/OvertimeEntry";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [entries, setEntries] = useState<OvertimeEntry[]>([]);

  const handleAddEntry = (entryData: Omit<OvertimeEntry, "id">) => {
    setEntries([...entries, entryData]);
  };

  const calculateSummary = (): WorkerSummary[] => {
    return workers.map((worker) => {
      const workerEntries = entries.filter((entry) => entry.workerId === worker.id);
      const totalCategoryA = workerEntries.reduce((sum, entry) => sum + entry.categoryA, 0);
      const totalCategoryC = workerEntries.reduce((sum, entry) => sum + entry.categoryC, 0);
      const transportationDays = workerEntries.filter((entry) => entry.transportation).length;
      const area = worker.defaultArea;
      const transportationCost = transportationDays * (Number(area) || 0);
      
      return {
        workerId: worker.id,
        name: worker.name,
        totalCategoryA,
        totalCategoryC,
        transportationDays,
        transportationCost,
      };
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Overtime Calculator
          </h1>
          <p className="mt-4 text-lg text-gray-500">
            Manage worker overtime and transportation costs
          </p>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() => navigate("/add-worker")}
            className="animate-fadeIn"
          >
            <Plus className="mr-2 h-4 w-4" /> Add New Worker
          </Button>
        </div>

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
                      Category A Hours
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category C Hours
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
                        {summary.totalCategoryA}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {summary.totalCategoryC}
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
            <div className="mt-4 flex justify-end">
              <Button
                onClick={() => {
                  // Implement export functionality
                  console.log("Exporting data...");
                }}
              >
                Export Data
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
