import { useState, useEffect } from "react";
import { WorkerDetailWithApproval, ApprovalStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Clock, ThumbsDown } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { overtime } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getDisplayApprovalStatus } from "@/utils/displayRoles";

interface WorkerDetailsEditProps {
  entry: WorkerDetailWithApproval;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  userRole: string;
}

const WorkerDetailsEdit = ({ entry, isOpen, onClose, onUpdate, userRole }: WorkerDetailsEditProps) => {
  const [formData, setFormData] = useState({
    entry_time: "",
    exit_time: "",
    category_a_hours: 0,
    category_c_hours: 0,
    transportation: false,
    transportation_cost: 0,
    category_a_amount: 0,
    category_c_amount: 0,
    rejection_reason: ""
  });
  const [loading, setLoading] = useState(false);
  const [isEditable, setIsEditable] = useState(true);
  const [_isAccountantEditMode, _setIsAccountantEditMode] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [entryTime, setEntryTime] = useState(entry.entry_time || "");
  const [exitTime, setExitTime] = useState(entry.exit_time || "");
  const [categoryAHours, setCategoryAHours] = useState(entry.category_a_hours?.toString() || "0");
  const [categoryCHours, setCategoryCHours] = useState(entry.category_c_hours?.toString() || "0");
  const [transportation, setTransportation] = useState(entry.transportation || false);
  const [transportCost, setTransportCost] = useState(entry.transportation_cost?.toString() || "0");
  const [categoryAAmount, setCategoryAAmount] = useState(entry.category_a_amount?.toString() || "0");
  const [categoryCAmount, setCategoryCAmount] = useState(entry.category_c_amount?.toString() || "0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [category, setCategory] = useState(entry.category || (entry.category_a_hours ? "A" : "C"));

  // Set initial form data from entry
  useEffect(() => {
    if (entry) {
      setFormData({
        entry_time: entry.entry_time || "",
        exit_time: entry.exit_time || "",
        category_a_hours: entry.category_a_hours || 0,
        category_c_hours: entry.category_c_hours || 0,
        transportation: entry.transportation || false,
        transportation_cost: entry.transportation_cost || 0,
        category_a_amount: entry.calculated_amount?.category_a || (entry.category_a_hours ?? 0) * 2,
        category_c_amount: entry.calculated_amount?.category_c || (entry.category_c_hours ?? 0) * 3,
        rejection_reason: ""
      });

      // Determine if entry is editable based on approval status and user role
      const isEditable = determineEditability(entry.approval_status, userRole);
      setIsEditable(isEditable);
    }
  }, [entry, userRole]);

  // Determine if the entry is editable based on its approval status and user role
  const determineEditability = (status: ApprovalStatus, role: string): boolean => {
    switch (role) {
      case "Standard":
        return status === "Pending"; // Standard admin can only edit pending entries
      case "Supervisor":
        return status === "Standard"; // Supervisors can only edit Standard-approved entries
      case "Director":
        return false; // Directors can only approve/reject
      default:
        return false;
    }
  };

  // Get appropriate badge for approval status
  const getApprovalBadge = (status: ApprovalStatus) => {
    switch (status) {
      case "Pending":
        return <Badge variant="outline" className="flex items-center gap-1"><Clock className="h-4 w-4 mr-1" /> Pending</Badge>;
      case "Standard":
        return <Badge variant="secondary" className="flex items-center gap-1 bg-green-100 text-green-800 border-green-200"><CheckCircle2 className="h-4 w-4 mr-1" /> {getDisplayApprovalStatus(status)}</Badge>;
      case "Supervisor":
        return <Badge variant="secondary" className="flex items-center gap-1 bg-blue-100 text-blue-800 border-blue-200"><CheckCircle2 className="h-4 w-4 mr-1" /> {getDisplayApprovalStatus(status)}</Badge>;
      case "Accountant":
        return <Badge variant="secondary" className="flex items-center gap-1 bg-purple-100 text-purple-800 border-purple-200"><CheckCircle2 className="h-4 w-4 mr-1" /> {getDisplayApprovalStatus(status)}</Badge>;
      case "Approved":
        return <Badge variant="success" className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 mr-1" /> Approved</Badge>;
      case "Rejected":
        return <Badge variant="destructive" className="flex items-center gap-1"><AlertCircle className="h-4 w-4 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Handle form changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? parseFloat(value) : value
    });
  };

  // Calculate amounts based on hours
  useEffect(() => {
    // Always auto-calculate - no special accountant mode
    setFormData(prev => ({
      ...prev,
      category_a_amount: prev.category_a_hours * 2,
      category_c_amount: prev.category_c_hours * 3
    }));
  }, [formData.category_a_hours, formData.category_c_hours]);

  // Auto-calculate overtime hours when entry/exit time or category changes
  useEffect(() => {
    if (!entryTime || !exitTime) return;
    // Parse times (HH:mm)
    const [entryHour, entryMin] = entryTime.split(":").map(Number);
    const [exitHour, exitMin] = exitTime.split(":").map(Number);
    let totalHours = (exitHour + exitMin / 60) - (entryHour + entryMin / 60);
    if (totalHours < 0) totalHours += 24; // Handle overnight
    // Overtime is hours above 9
    const overtime = Math.max(0, totalHours - 9);
    if (category === "A") {
      setCategoryAHours(overtime.toFixed(2));
      setCategoryAAmount((overtime * 2).toFixed(2));
      setCategoryCHours("0");
      setCategoryCAmount("0");
    } else {
      setCategoryCHours(overtime.toFixed(2));
      setCategoryCAmount((overtime * 3).toFixed(2));
      setCategoryAHours("0");
      setCategoryAAmount("0");
    }
  }, [entryTime, exitTime, category]);

  // Helper function to determine the next approval status based on current status and user role
  // Commented out as it's not used
  /*
  const getNextApprovalStatus = (currentStatus: string, userRole: string): string => {
    if (userRole === "Director") {
      return "Approved";
    } else if (userRole === "Supervisor" && currentStatus === "Pending") {
      return "Supervisor";
    } else {
      // Default fallback - should not reach here in normal flow
      return currentStatus;
    }
  };
  */

  // Check if the current user can approve this entry
  // Commented out as it's not used
  /*
  const canApprove = (): boolean => {
    if (!entry) return false;
    
    // Follow hierarchical approval flow
    if (userRole === "Standard" && entry.approval_status === "Pending") {
      return true; // Standard admin can approve pending entries to start the flow
    }
    
    if (userRole === "Supervisor" && entry.approval_status === "Standard") {
      return true; // Supervisors can only approve entries already approved by Standard admin
    }
    
    if (userRole === "Director" && entry.approval_status === "Supervisor") {
      return true; // Directors can only approve entries already approved by Supervisors
    }
    
    return false; // No other combinations are allowed
  };
  */

  // Handle rejection
  const handleReject = async () => {
    if (confirmReject) {
      try {
        setLoading(true);
        // Get the current user's info from localStorage
        const userInfo = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")!) : null;
        const userName = userInfo?.name || "Unknown User";
        
        await overtime.reject(entry.id, formData.rejection_reason, userName);
        toast({
          title: "Entry Rejected",
          description: "The entry has been successfully rejected"
        });
        onUpdate();
        onClose();
      } catch (error) {
        console.error("Error rejecting entry:", error);
        toast({
          title: "Error",
          description: "Failed to reject entry",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    } else {
      setConfirmReject(true);
    }
  };

  // Generate time options (00:00 to 23:59 in 30 min increments)
  const timeOptions = [];
  for (let hour = 0; hour < 24; hour++) {
    const formattedHour = hour.toString().padStart(2, '0');
    timeOptions.push(`${formattedHour}:00`);
  }

  // Only accountants can edit amounts directly
  const canEditAmounts = userRole === "Accountant";

  // Handle saving changes
  const handleSave = async () => {
    setIsSubmitting(true);
    
    try {
      const updateData: any = {};
      
      // Only include fields that have changed
      if (entryTime !== entry.entry_time) updateData.entry_time = entryTime;
      if (exitTime !== entry.exit_time) updateData.exit_time = exitTime;
      
      // If category changed, update hours accordingly
      if (category !== entry.category) {
        updateData.category = category;
        
        if (category === "A") {
          const aHours = parseFloat(categoryAHours) || 0;
          updateData.category_a_hours = aHours;
          updateData.category_a_amount = aHours * 2;
          updateData.category_c_hours = 0;
          updateData.category_c_amount = 0;
        } else {
          const cHours = parseFloat(categoryCHours) || 0;
          updateData.category_c_hours = cHours;
          updateData.category_c_amount = cHours * 3;
          updateData.category_a_hours = 0;
          updateData.category_a_amount = 0;
        }
      } else {
        // No category change, just update hours if changed
        const parsedCategoryAHours = parseFloat(categoryAHours);
        if (!isNaN(parsedCategoryAHours) && parsedCategoryAHours !== entry.category_a_hours) {
          updateData.category_a_hours = parsedCategoryAHours;
          if (!canEditAmounts) {
            updateData.category_a_amount = parsedCategoryAHours * 2;
          }
        }
        
        const parsedCategoryCHours = parseFloat(categoryCHours);
        if (!isNaN(parsedCategoryCHours) && parsedCategoryCHours !== entry.category_c_hours) {
          updateData.category_c_hours = parsedCategoryCHours;
          if (!canEditAmounts) {
            updateData.category_c_amount = parsedCategoryCHours * 3;
          }
        }
      }
      
      if (transportation !== entry.transportation) updateData.transportation = transportation;
      
      // For accountants, they can edit amounts directly
      if (canEditAmounts) {
        const parsedTransportCost = parseFloat(transportCost);
        if (!isNaN(parsedTransportCost) && parsedTransportCost !== entry.transportation_cost) {
          updateData.transportation_cost = parsedTransportCost;
        }
        
        const parsedCategoryAAmount = parseFloat(categoryAAmount);
        if (!isNaN(parsedCategoryAAmount) && parsedCategoryAAmount !== entry.category_a_amount) {
          updateData.category_a_amount = parsedCategoryAAmount;
        }
        
        const parsedCategoryCAmount = parseFloat(categoryCAmount);
        if (!isNaN(parsedCategoryCAmount) && parsedCategoryCAmount !== entry.category_c_amount) {
          updateData.category_c_amount = parsedCategoryCAmount;
        }
      }
      
      // Store current user's name for the "last edited by" field
      const userData = localStorage.getItem("user");
      let userName = "";
      if (userData) {
        const user = JSON.parse(userData);
        userName = user.name;
      }
      
      updateData.last_edited_by_name = userName;
      
      if (Object.keys(updateData).length === 0) {
        toast({
          title: "No Changes",
          description: "No changes were made to the entry.",
        });
        onClose();
        return;
      }
      
      await overtime.update(entry.id, updateData);
      
      toast({
        title: "Entry Updated",
        description: "The overtime entry has been updated successfully.",
      });
      
      onUpdate();
      onClose();
    } catch (error) {
      console.error("Failed to update entry:", error);
      toast({
        title: "Update Failed",
        description: "There was a problem updating the entry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Edit Worker Entry</span>
            {entry && getApprovalBadge(entry.approval_status)}
          </DialogTitle>
          <DialogDescription>
            Entry for worker {entry.workers.name}
            {entry.automatically_generated && " (automatically generated)"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entryTime">Entry Time</Label>
              <Select
                value={entryTime}
                onValueChange={setEntryTime}
              >
                <SelectTrigger id="entryTime">
                  <SelectValue placeholder="Select entry time" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exitTime">Exit Time</Label>
              <Select
                value={exitTime}
                onValueChange={setExitTime}
              >
                <SelectTrigger id="exitTime">
                  <SelectValue placeholder="Select exit time" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={category}
              onValueChange={(value: "A" | "C") => setCategory(value)}
            >
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Category A (Weekday)</SelectItem>
                <SelectItem value="C">Category C (Weekend/Holiday)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categoryAHours">Category A Hours</Label>
              <Input
                id="categoryAHours"
                type="number"
                step="0.5"
                min="0"
                value={categoryAHours}
                onChange={(e) => setCategoryAHours(e.target.value)}
                disabled={category === "C"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryCHours">Category C Hours</Label>
              <Input
                id="categoryCHours"
                type="number"
                step="0.5"
                min="0"
                value={categoryCHours}
                onChange={(e) => setCategoryCHours(e.target.value)}
                disabled={category === "A"}
              />
            </div>
          </div>
          
          {canEditAmounts && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoryAAmount">Category A Amount (₵)</Label>
                <Input
                  id="categoryAAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={categoryAAmount}
                  onChange={(e) => setCategoryAAmount(e.target.value)}
                  disabled={category === "C"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryCAmount">Category C Amount (₵)</Label>
                <Input
                  id="categoryCAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={categoryCAmount}
                  onChange={(e) => setCategoryCAmount(e.target.value)}
                  disabled={category === "A"}
                />
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="transportation"
              checked={transportation}
              onCheckedChange={setTransportation}
            />
            <Label htmlFor="transportation">Transportation Required</Label>
          </div>
          
          {canEditAmounts && transportation && (
            <div className="space-y-2">
              <Label htmlFor="transportCost">Transportation Cost (₵)</Label>
              <Input
                id="transportCost"
                type="number"
                step="0.01"
                min="0"
                value={transportCost}
                onChange={(e) => setTransportCost(e.target.value)}
              />
            </div>
          )}

          {confirmReject && (
            <div className="space-y-2">
              <Label htmlFor="rejection_reason">Reason for Rejection</Label>
              <Textarea
                id="rejection_reason"
                name="rejection_reason"
                placeholder="Please provide a reason for rejecting this entry"
                value={formData.rejection_reason}
                onChange={handleChange}
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {userRole !== "Standard" && (
              <Button
                type="button"
                variant="reject"
                onClick={handleReject}
                disabled={loading || entry?.approval_status === "Rejected"}
                className="gap-1"
                size="lg"
              >
                <ThumbsDown className="h-5 w-5" /> {confirmReject ? "Confirm Reject" : "Reject"}
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            
            {isEditable && (
              <Button
                type="button"
                onClick={handleSave}
                disabled={loading || isSubmitting}
                className="gap-1"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WorkerDetailsEdit; 