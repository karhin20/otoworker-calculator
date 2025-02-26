import { useState } from "react";
import { Worker } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface OvertimeEntryProps {
  workers: Worker[];
  onSubmit: (data: any) => void;
}

export const OvertimeEntry = ({ workers, onSubmit }: OvertimeEntryProps) => {
  const [selectedWorker, setSelectedWorker] = useState("");
  const [date, setDate] = useState<Date>();
  const [totalHours, setTotalHours] = useState("");
  const [transportation, setTransportation] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker || !date || !totalHours) return;

    onSubmit({
      workerId: selectedWorker,
      date: format(date, "yyyy-MM-dd"),
      totalHours: parseInt(totalHours),
      transportation,
    });

    // Reset form
    setSelectedWorker("");
    setDate(undefined);
    setTotalHours("");
    setTransportation(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="worker">Worker</Label>
          <Select
            value={selectedWorker}
            onValueChange={setSelectedWorker}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select worker" />
            </SelectTrigger>
            <SelectContent>
              {workers.map((worker) => (
                <SelectItem key={worker.id} value={worker.id}>
                  {worker.name} ({worker.staffId})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
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
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label htmlFor="totalHours">Total Hours</Label>
          <Input
            id="totalHours"
            type="number"
            min="1"
            max="24"
            value={totalHours}
            onChange={(e) => setTotalHours(e.target.value)}
            required
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="transportation"
            checked={transportation}
            onCheckedChange={setTransportation}
          />
          <Label htmlFor="transportation">Transportation Required</Label>
        </div>
      </div>

      <Button type="submit">Add Entry</Button>
    </form>
  );
};
