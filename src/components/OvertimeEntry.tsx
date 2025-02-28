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
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { overtime } from "@/lib/api";

interface OvertimeEntryProps {
  workers: Worker[];
  onSubmit: (data: {
    worker_id: string;
    date: string;
    entry_time: string;
    exit_time: string;
    category: 'A' | 'C';
    category_a_hours: number;
    category_c_hours: number;
    transportation: boolean;
    transportation_cost?: number;
  }) => Promise<void>;
}

export const OvertimeEntry = ({ workers, onSubmit }: OvertimeEntryProps) => {
  const [selectedWorker, setSelectedWorker] = useState("");
  const [date, setDate] = useState<Date>();
  const [entryTime, setEntryTime] = useState("");
  const [exitTime, setExitTime] = useState("");
  const [transportation, setTransportation] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [category, setCategory] = useState<"A" | "C">("A");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Generate time options (00:00 to 23:00)
  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return { value: hour, label: `${hour}:00` };
  });

  const calculateTotalHours = () => {
    if (!entryTime || !exitTime) return 0;
    const entry = parseInt(entryTime);
    const exit = parseInt(exitTime);
    return exit > entry ? exit - entry : 0;
  };

  const calculateOvertimeHours = () => {
    const total = calculateTotalHours();
    return Math.max(0, total - 8);
  };

  const getDefaultCategory = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6 ? "C" : "A";
  };

  const handleDateChange = (newDate: Date | undefined) => {
    setDate(newDate);
    if (newDate) {
      setCategory(getDefaultCategory(newDate));
      setIsCalendarOpen(false);
    }
  };

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker || !date || !entryTime || !exitTime) return;

    try {
      const formattedDate = format(date, "yyyy-MM-dd");
      const hasDuplicate = await overtime.checkDuplicateEntry(selectedWorker, formattedDate);

      if (hasDuplicate) {
        toast({
          title: "Duplicate Entry",
          description: "An entry already exists for this worker on the selected date.",
          variant: "destructive",
        });
        return;
      }

      setShowSummary(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "An entry already exists for this worker on the selected date.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async () => {
    if (!selectedWorker || !date || !entryTime || !exitTime) return;

    setIsSubmitting(true);
    const overtimeHours = calculateOvertimeHours();
    const selectedWorkerDetails = workers.find(w => w.id === selectedWorker);
    
    const entryData = {
      worker_id: selectedWorker,
      date: format(date, "yyyy-MM-dd"),
      entry_time: `${entryTime}:00`,
      exit_time: `${exitTime}:00`,
      category,
      category_a_hours: category === 'A' ? overtimeHours : 0,
      category_c_hours: category === 'C' ? overtimeHours : 0,
      transportation,
      transportation_cost: transportation && selectedWorkerDetails 
        ? Number(selectedWorkerDetails.default_area) || 0 
        : 0
    };

    try {
      await onSubmit(entryData);
      toast({
        title: "Success",
        description: "Overtime entry has been added successfully.",
        variant: "success",
      });

      // Reset form
      setSelectedWorker("");
      setDate(undefined);
      setEntryTime("");
      setExitTime("");
      setTransportation(false);
      setShowSummary(false);
      setCategory("A");
    } catch (error) {
      let errorMessage = "An entry already exists for this worker on the selected date";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedWorkerDetails = workers.find(w => w.id === selectedWorker);

  return (
    <Card className="p-6">
      <form onSubmit={handlePreview} className="space-y-6">
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
                    {worker.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedWorkerDetails && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Staff ID:</span> {selectedWorkerDetails.staff_id}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Grade:</span> {selectedWorkerDetails.grade}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Area:</span> {selectedWorkerDetails.default_area}
                </p>
              </div>
            )}
          </div>

          <div>
            <Label>Date</Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                  onClick={() => setIsCalendarOpen(true)}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={handleDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="entryTime">Entry Time</Label>
            <Select
              value={entryTime}
              onValueChange={setEntryTime}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select entry time" />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((time) => (
                  <SelectItem key={time.value} value={time.value}>
                    {time.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="exitTime">Exit Time</Label>
            <Select
              value={exitTime}
              onValueChange={setExitTime}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select exit time" />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((time) => (
                  <SelectItem key={time.value} value={time.value}>
                    {time.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              value={category}
              onValueChange={(value: "A" | "C") => setCategory(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Category A (Weekday)</SelectItem>
                <SelectItem value="C">Category C (Weekend/Holiday)</SelectItem>
              </SelectContent>
            </Select>
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

        <Button type="submit">Preview Entry</Button>
      </form>

      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Overtime Entry Preview</DialogTitle>
            <DialogDescription>
              Please review the overtime entry details before submitting.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Worker</p>
              <p className="text-sm text-gray-500">{selectedWorkerDetails?.name}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Date</p>
              <p className="text-sm text-gray-500">{date ? format(date, "PPP") : ""}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Entry Time</p>
                <p className="text-sm text-gray-500">{entryTime}:00</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Exit Time</p>
                <p className="text-sm text-gray-500">{exitTime}:00</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Total Hours</p>
                <p className="text-sm text-gray-500">{calculateTotalHours()}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Overtime Hours</p>
                <p className="text-sm text-gray-500">{calculateOvertimeHours()}</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Category</p>
              <p className="text-sm text-gray-500">{category}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Transportation</p>
              <p className="text-sm text-gray-500">{transportation ? "Yes" : "No"}</p>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => setShowSummary(false)}
            >
              Edit
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Confirm & Submit"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
