
import { useState } from "react";
import { Worker, OvertimeEntry, WorkerSummary } from "@/types";
import { WorkerForm } from "@/components/WorkerForm";
import { OvertimeEntry as OvertimeEntryComponent } from "@/components/OvertimeEntry";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const Index = () => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [entries, setEntries] = useState<OvertimeEntry[]>([]);

  const handleAddWorker = (workerData: Omit<Worker, "id">) => {
    const newWorker: Worker = {
      ...workerData,
      id: crypto.randomUUID(),
    };
    setWorkers([...workers, newWorker]);
  };

  const handleAddEntry = (entryData: Omit<OvertimeEntry, "id">) => {
    setEntries([...entries, entryData]);
  };

  const calculateSummary = (): WorkerSummary[] => {
    return workers.map((worker) => {
      const workerEntries = entries.filter((entry) => entry.workerId === worker.id);
      const totalCategoryA = workerEntries.reduce((sum, entry) => sum + entry.categoryA, 0);
      const totalCategoryC = workerEntries.reduce((sum, entry) => sum + entry.categoryC, 0);
      const transportationDays = workerEntries.filter((entry) => entry.transportation).length;
      // Placeholder rate of 10 per day - this would come from area configuration
      const transportationCost = transportationDays * 10;
      
      return {
        workerId: worker.id,
        name: worker.name,
        totalCategoryA,
        totalCategoryC,
        transportationDays,
        transportationCost,
        totalAmount: (totalCategoryA * 1.5 + totalCategoryC * 2) * 100 + transportationCost, // Example calculation
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <WorkerForm onSubmit={handleAddWorker} />
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
                      Total Amount
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
                        ${summary.totalAmount.toFixed(2)}
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
