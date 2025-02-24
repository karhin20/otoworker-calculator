
import { useState, useEffect } from "react";
import { Worker, OvertimeEntry as OvertimeEntryType } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format, isWeekend } from "date-fns";
import { Calendar as CalendarIcon, Bus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface OvertimeEntryProps {
  workers: Worker[];
  onSubmit: (entry: OvertimeEntryType) => void;
}

export function OvertimeEntry({ workers, onSubmit }: OvertimeEntryProps) {
  const [selectedWorker, setSelectedWorker] = useState("");
  const [date, setDate] = useState<Date>();
  const [entryHour, setEntryHour] = useState("");
  const [exitHour, setExitHour] = useState("");
  const [transportation, setTransportation] = useState(false);
  const [category, setCategory] = useState<"A" | "C">("A");

  const selectedWorkerDetails = workers.find(w => w.id === selectedWorker);

  const hours = Array.from({ length: 24 }, (_, i) => 
    i.toString().padStart(2, '0') + ":00"
  );

  useEffect(() => {
    if (date) {
      setCategory(isWeekend(date) ? "C" : "A");
    }
  }, [date]);

  useEffect(() => {
    if (selectedWorkerDetails) {
      setTransportation(selectedWorkerDetails.transportRequired);
    }
  }, [selectedWorkerDetails]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker || !date || !entryHour || !exitHour) {
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
      entryTime: entryHour,
      exitTime: exitHour,
      transportation,
      category,
    });

    setSelectedWorker("");
    setDate(undefined);
    setEntryHour("");
    setExitHour("");
    setTransportation(false);
    setCategory("A");

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
                {worker.name} - {worker.staffId} ({worker.grade})
              </option>
            ))}
          </select>
        </div>

        {selectedWorkerDetails && (
          <Card className="p-4 bg-gray-50 border-blue-200 space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-500">Staff ID</Label>
                <p className="font-medium">{selectedWorkerDetails.staffId}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-500">Grade</Label>
                <p className="font-medium">{selectedWorkerDetails.grade}</p>
              </div>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Default Area</Label>
              <p className="font-medium">{selectedWorkerDetails.defaultArea}</p>
            </div>
          </Card>
        )}

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
            <Label htmlFor="entryTime">Entry Time</Label>
            <Select value={entryHour} onValueChange={setEntryHour}>
              <SelectTrigger>
                <SelectValue placeholder="Select entry time" />
              </SelectTrigger>
              <SelectContent>
                {hours.map((hour) => (
                  <SelectItem key={hour} value={hour}>
                    {hour}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="exitTime">Exit Time</Label>
            <Select value={exitHour} onValueChange={setExitHour}>
              <SelectTrigger>
                <SelectValue placeholder="Select exit time" />
              </SelectTrigger>
              <SelectContent>
                {hours.map((hour) => (
                  <SelectItem key={hour} value={hour}>
                    {hour}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={category} onValueChange={(value: "A" | "C") => setCategory(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A">Category A</SelectItem>
              <SelectItem value="C">Category C</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bus className="h-5 w-5 text-blue-500" />
              <Label htmlFor="transportation" className="text-blue-800 font-medium">
                Transportation Required
              </Label>
            </div>
            <input
              type="checkbox"
              id="transportation"
              checked={transportation}
              onChange={(e) => setTransportation(e.target.checked)}
              className="h-5 w-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
        </Card>

        <Button type="submit" className="w-full">
          Submit Entry
        </Button>
      </form>
    </Card>
  );
}
