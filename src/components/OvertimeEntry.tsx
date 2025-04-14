import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Worker } from "@/types";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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
  isSubmitting?: boolean;
}

export const OvertimeEntry = ({ workers, onSubmit, isSubmitting: externalIsSubmitting }: OvertimeEntryProps) => {
  const [selectedWorker, setSelectedWorker] = useState("");
  const [date, setDate] = useState<Date>();
  const [entryTime, setEntryTime] = useState("");
  const [exitTime, setExitTime] = useState("");
  const [transportation, setTransportation] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [category, setCategory] = useState<"A" | "C">("A");
  const [localIsSubmitting, setLocalIsSubmitting] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [holidays, setHolidays] = useState<{date: string; name: string}[]>([]);
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);

  // Use external isSubmitting state if provided, otherwise use local state
  const isSubmitting = externalIsSubmitting !== undefined ? externalIsSubmitting : localIsSubmitting;

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
    return Math.max(0, total - 9);
  };

  // Fetch Ghana holidays when component mounts
  useEffect(() => {
    const fetchHolidays = async () => {
      setIsLoadingHolidays(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await fetch('/api/holidays', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch holidays');
        }
        
        const data = await response.json();
        setHolidays(data);
      } catch (error) {
        console.error('Error fetching holidays:', error);
        // Don't show toast for this, just log the error
      } finally {
        setIsLoadingHolidays(false);
      }
    };
    
    fetchHolidays();
  }, []);

  const getDefaultCategory = (date: Date) => {
    // Check if it's a weekend
    const day = date.getDay();
    const isWeekend = day === 0 || day === 6;
    
    // Check if it's a holiday
    const formattedDate = format(date, "yyyy-MM-dd");
    const isHoliday = holidays.some(holiday => holiday.date === formattedDate);
    
    // Category C if it's a weekend or a holiday, otherwise Category A
    return isWeekend || isHoliday ? "C" : "A";
  };

  const handleDateChange = (newDate: Date | undefined) => {
    setDate(newDate);
    if (newDate) {
      setCategory(getDefaultCategory(newDate));
      setIsCalendarOpen(false);
    }
  };

  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker || !date || !entryTime || !exitTime) return;
    setShowSummary(true);
  };

  const handleSubmit = async () => {
    if (!selectedWorker || !date || !entryTime || !exitTime) return;

    setLocalIsSubmitting(true);
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
      // Reset form - these won't be seen due to navigation, but keeping for completeness
      setSelectedWorker("");
      setDate(undefined);
      setEntryTime("");
      setExitTime("");
      setTransportation(false);
      setShowSummary(false);
      setCategory("A");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add overtime entry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLocalIsSubmitting(false);
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
                  {date ? (
                    format(date, "PPP")
                  ) : (
                    <span>Select date</span>
                  )}
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
            
            {date && (
              <>
                {(() => {
                  const formattedDate = format(date, "yyyy-MM-dd");
                  const holiday = holidays.find(h => h.date === formattedDate);
                  const day = date.getDay();
                  const isWeekend = day === 0 || day === 6;
                  
                  if (holiday) {
                    return (
                      <div className="mt-2 p-2 bg-amber-100 text-amber-800 rounded-md text-sm">
                        Holiday: {holiday.name} (Category C)
                      </div>
                    );
                  } else if (isWeekend) {
                    return (
                      <div className="mt-2 p-2 bg-amber-100 text-amber-800 rounded-md text-sm">
                        Weekend (Category C)
                      </div>
                    );
                  } else {
                    return (
                      <div className="mt-2 p-2 bg-blue-100 text-blue-800 rounded-md text-sm">
                        Weekday (Category A)
                      </div>
                    );
                  }
                })()}
              </>
            )}
          </div>

          <div>
            <Label htmlFor="entryTime">Entry Time(24 hour format)</Label>
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
            <Label htmlFor="exitTime">Exit Time(24 hour format)</Label>
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
