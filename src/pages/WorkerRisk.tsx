import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, Shield, LogOut, Plus, X, AlignLeft, MapPin, AlertCircle, Users, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { workers, risk } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { getAndClearNotification } from "@/utils/notifications";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { RiskEntry } from "@/types";

// Size/depth options
const sizeOptions = ['4"', '5"', '6"', '8"'];

const WorkerRisk = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ name: string; staffId: string; role?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [entries, setEntries] = useState<RiskEntry[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: null as string | null,
    date: new Date(),
    location: "",
    size_depth: sizeOptions[0],
    remarks: "",
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Generate month options
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

  // Generate year options
  const years = Array.from(
    { length: 5 },
    (_, i) => selectedYear - 2 + i
  );

  // Load user data on mount
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      setUser(JSON.parse(userStr));
    }

    const notification = getAndClearNotification();
    if (notification) {
      toast({
        title: notification.type.charAt(0).toUpperCase() + notification.type.slice(1),
        description: notification.message,
        variant: notification.type === 'error' ? 'destructive' : 'default',
      });
    }
  }, []);

  // Get worker ID from staff ID when user data is loaded
  useEffect(() => {
    const fetchWorkerId = async () => {
      if (user?.staffId) {
        try {
          const workerData = await workers.getByStaffId(user.staffId);
          // Type assertion for workerData.id
          setWorkerId((workerData as any).id);
          setLoading(false);
        } catch (error) {
          console.error("Failed to fetch worker ID:", error);
          toast({
            title: "Error",
            description: "Failed to load your worker information",
            variant: "destructive",
          });
        }
      }
    };

    fetchWorkerId();
  }, [user]);

  // Fetch risk entries when month/year changes or worker ID is set
  useEffect(() => {
    if (workerId) {
      fetchRiskEntries();
    }
  }, [workerId, selectedMonth, selectedYear]);

  // Fetch risk entries
  const fetchRiskEntries = async () => {
    if (!workerId) return;

    setLoading(true);
    try {
      const data = await risk.getByWorker(
        workerId,
        selectedMonth,
        selectedYear
      );
      // Sort the entries by date in descending order (newest first)
      const sortedData = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setEntries(sortedData);
    } catch (error) {
      console.error("Failed to fetch risk entries:", error);
      toast({
        title: "Error",
        description: "Failed to load your risk entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate total amount for the period
  const totalAmount = useMemo(() => {
    return entries.reduce((total, entry) => total + entry.rate, 0);
  }, [entries]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle date change
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData(prev => ({
        ...prev,
        date
      }));
      setIsCalendarOpen(false);
    }
  };

  // Handle form submission (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerId && !isEditMode) return; // Need workerId for create
    if (!formData.id && isEditMode) return; // Need entry id for update

    setSubmitting(true);
    try {
      if (isEditMode && formData.id) {
        // Update existing entry
        await risk.update(formData.id, {
          location: formData.location,
          size_depth: formData.size_depth,
          remarks: formData.remarks,
          // Potentially add rate update logic based on role if needed
        });
        toast({ title: "Success", description: "Risk entry updated successfully" });
      } else {
        // Create new entry
        await risk.create({
          worker_id: workerId!, // Assert workerId is not null here
          date: format(formData.date, "yyyy-MM-dd"),
          location: formData.location,
          size_depth: formData.size_depth,
          remarks: formData.remarks
        });
        toast({ title: "Success", description: "Risk entry added successfully" });
      }

      // Reset form and refresh data
      resetFormAndCloseDialog();
      fetchRiskEntries();
    } catch (error) {
      console.error("Failed to save risk entry:", error);
      toast({
        title: "Error",
        description: `Failed to ${isEditMode ? 'update' : 'add'} risk entry. Please try again.`, 
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form state and close dialog
  const resetFormAndCloseDialog = () => {
    setFormData({
      id: null,
      date: new Date(),
      location: "",
      size_depth: sizeOptions[0],
      remarks: "",
    });
    setIsEditMode(false);
    setIsDialogOpen(false);
  };

  // Open dialog for editing
  const handleEditEntry = (entry: RiskEntry) => {
    setFormData({
      id: entry.id,
      date: new Date(entry.date), // Ensure date is a Date object
      location: entry.location,
      size_depth: entry.size_depth,
      remarks: entry.remarks || "",
    });
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  // Open delete confirmation
  const handleDeleteEntry = (entryId: string) => {
    setDeletingEntryId(entryId);
    setIsDeleteDialogOpen(true);
  };

  // Confirm deletion
  const confirmDeleteEntry = async () => {
    if (!deletingEntryId) return;
    try {
      await risk.delete(deletingEntryId);
      toast({ title: "Success", description: "Risk entry deleted successfully." });
      setIsDeleteDialogOpen(false);
      setDeletingEntryId(null);
      fetchRiskEntries();
    } catch (error) {
      console.error("Failed to delete risk entry:", error);
      toast({ title: "Error", description: "Failed to delete risk entry.", variant: "destructive" });
    }
  };

  // Check permissions
  const canModify = (entry: RiskEntry): boolean => {
    const isAdmin = user?.role && ["Supervisor", "Accountant", "Director"].includes(user.role);
    // Use assertion for created_by
    const isCreator = (entry as any).created_by === (user as any)?.id;
    return isAdmin || isCreator;
  };

  // Handle sign out
  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              My Risk Entries
            </h1>
            {user && (
              <p className="mt-2 text-lg text-gray-600">
                Hello, {user.name} ({user.staffId})
                {user.role && <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {user.role} Role
                </span>}
              </p>
            )}
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>

        <Card className="p-4 bg-white shadow-sm">
          <nav className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              onClick={() => navigate("/worker-dashboard")}
            >
              <Users className="mr-2 h-4 w-4" /> Dashboard
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/clock-in-out")}
            >
              <Clock className="mr-2 h-4 w-4" /> Clock In/Out
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/worker-reports")}
            >
              <Calendar className="mr-2 h-4 w-4" /> My Reports
            </Button>
          </nav>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Risk Entries</h2>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Entry
                </Button>
              </div>

              <div className="flex flex-wrap gap-4 mb-6">
                <div className="w-40">
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

                <div className="w-32">
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

              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="p-4">
                      <div className="flex flex-col space-y-2">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-4 w-64" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : entries.length > 0 ? (
                <div className="space-y-4">
                  {entries.map((entry) => (
                    <Card key={entry.id} className="p-5 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-wrap justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 px-2 py-0.5 text-xs">
                              {entry.size_depth}
                            </Badge>
                            <h3 className="text-lg font-semibold">
                              {format(new Date(entry.date), "MMMM d, yyyy")}
                            </h3>
                          </div>
                          <div className="mt-2 flex items-start gap-2 text-gray-600">
                            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span>{entry.location}</span>
                          </div>
                          {entry.remarks && (
                            <div className="mt-2 flex items-start gap-2 text-gray-600">
                              <AlignLeft className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>{entry.remarks}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">₵{entry.rate.toFixed(2)}</div>
                          <div className="text-xs text-gray-500">
                            Added on {format(new Date(entry.created_at), "MMM d, yyyy")}
                          </div>
                        </div>
                        {/* Action Buttons */}
                        <div className="flex gap-2 items-center mt-2 sm:mt-0">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditEntry(entry)}
                            disabled={!canModify(entry)} // Disable if user cannot modify
                            className={canModify(entry) ? "text-blue-600 hover:bg-blue-50" : "text-gray-400 cursor-not-allowed"}
                          >
                             <Pencil className="h-4 w-4" />
                           </Button>
                           <Button 
                             variant="ghost" 
                             size="sm" 
                             onClick={() => handleDeleteEntry(entry.id)}
                             disabled={!canModify(entry)} // Disable if user cannot modify
                             className={canModify(entry) ? "text-red-600 hover:bg-red-50" : "text-gray-400 cursor-not-allowed"}
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">No risk entries</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You don't have any risk entries for this period.
                  </p>
                  <div className="mt-6">
                    <Button onClick={() => setIsDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Your First Entry
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>

          <div>
            <Card className="p-6 sticky top-8">
              <h3 className="text-lg font-semibold mb-4">Summary</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Total Entries</p>
                  <p className="text-2xl font-bold">{entries.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="text-2xl font-bold">₵{totalAmount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Period</p>
                  <p className="font-medium">
                    {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                  </p>
                </div>
              </div>
              
              <hr className="my-6" />
              
              <div className="space-y-4">
                <h4 className="font-medium">Quick Actions</h4>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Entry
                </Button>
              </div>
              
              <div className="mt-8 p-4 bg-blue-50 rounded-md">
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-500" />
                  <div>
                    <h4 className="font-semibold text-blue-700">Entry Guide</h4>
                    <p className="text-sm text-blue-600 mt-1">
                      Risk entries should be submitted within 24 hours of completing the task. 
                      Include precise location details for verification.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Add/Edit Entry Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Risk Entry" : "Add New Risk Entry"}</DialogTitle>
            <DialogDescription>
              {isEditMode ? "Update the details of the risk activity." : "Enter the details of your risk activity. Fields marked with * are required."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="date">Date *</Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.date && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {formData.date ? format(formData.date, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={formData.date}
                      onSelect={handleDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Enter precise location"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="size_depth">Size/Depth *</Label>
                <Select
                  name="size_depth"
                  value={formData.size_depth}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, size_depth: value }))}
                >
                  <SelectTrigger id="size_depth">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {sizeOptions.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  placeholder="Add any additional details (optional)"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetFormAndCloseDialog}> 
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (isEditMode ? "Updating..." : "Submitting...") : (isEditMode ? "Update Entry" : "Submit Entry")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this risk entry? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteEntry}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkerRisk; 