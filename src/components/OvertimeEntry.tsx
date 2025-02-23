
import { useState } from "react";
import { Worker, OvertimeEntry as OvertimeEntryType } from "@/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface OvertimeEntryProps {
  workers: Worker[];
  onSubmit: (entry: Omit<OvertimeEntryType, "id">) => void;
}

export function OvertimeEntry({ workers, onSubmit }: OvertimeEntryProps) {
  const [selectedWorker, setSelectedWorker] = useState("");
  const [date, setDate] = useState<Date>();
  const [categoryA, setCategoryA] = useState("");
  const [categoryC, setCategoryC] = useState("");
  const [transportation, setTransportation] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker || !date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    onSubmit({
      workerId: selectedWorker,
      date,
      categoryA: Number(categoryA) || 0,
      categoryC: Number(categoryC) || 0,
      transportation,
    });

    setSelectedWorker("");
    setDate(undefined);
    setCategoryA("");
    setCategoryC("");
    setTransportation(false);

    toast({
      title: "Success",
      description: "Overtime entry added successfully",
    });
  };

  return (
    <Card className="p-6 space-y-4 animate-slideIn">
      <h3 className="text-lg font-medium">Record Overtime</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="worker">Select Worker</Label>
          <select
            id="worker"
            value={selectedWorker}
            onChange={(e) => setSelectedWorker(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            <option value="">Select a worker</option>
            {workers.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label>Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="categoryA">Category A Hours</Label>
            <Input
              id="categoryA"
              type="number"
              value={categoryA}
              onChange={(e) => setCategoryA(e.target.value)}
              placeholder="Weekday hours"
              min="0"
              step="0.5"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="categoryC">Category C Hours</Label>
            <Input
              id="categoryC"
              type="number"
              value={categoryC}
              onChange={(e) => setCategoryC(e.target.value)}
              placeholder="Weekend hours"
              min="0"
              step="0.5"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="transportation"
            checked={transportation}
            onChange={(e) => setTransportation(e.target.checked)}
            className="rounded border-gray-300"
          />
          <Label htmlFor="transportation">Transportation Required</Label>
        </div>

        <Button type="submit" className="w-full">
          Submit Entry
        </Button>
      </form>
    </Card>
  );
}
