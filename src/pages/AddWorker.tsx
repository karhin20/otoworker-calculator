import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AREAS, Grade } from "@/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { workers } from "@/lib/api";
import { getAndClearNotification, notifySuccess } from "@/utils/notifications";

const GRADES: Grade[] = [
  "Artisan (P/F)",
  "Asst. Dist. Officer",
  "Driver",
  "General Worker - Skilled",
  "General Worker",
  "Jnr Artisan (P/F)",
  "Jnr Driver",
  "Senior Supervisor",
  "Snr Artisan",
  "Snr Driver"
];

interface FormErrors {
  name?: string;
  staff_id?: string;
  grade?: string;
  default_area?: string;
}

const AddWorker = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    staff_id: "",
    grade: "" as Grade,
    default_area: "",
    transport_required: true,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [user, setUser] = useState<{ name: string; staffId: string; grade: string; role?: string } | null>(null);

  // Load user data
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  // Check for notifications on component mount
  useEffect(() => {
    const notification = getAndClearNotification();
    if (notification) {
      toast({
        title: notification.type.charAt(0).toUpperCase() + notification.type.slice(1),
        description: notification.message,
        variant: notification.type === 'error' ? 'destructive' : 'default',
      });
    }
  }, []);

  // Validate form fields
  const validateField = (name: string, value: string) => {
    let errorMessage = "";
    
    switch (name) {
      case "name":
        if (!value.trim()) errorMessage = "Name is required";
        else if (value.length < 3) errorMessage = "Name must be at least 3 characters";
        break;
      case "staff_id":
        if (!value.trim()) errorMessage = "Staff ID is required";
        else if (!/^[A-Za-z0-9]+$/.test(value)) errorMessage = "Staff ID must contain only letters and numbers";
        break;
      case "grade":
        if (!value) errorMessage = "Grade is required";
        break;
      case "default_area":
        if (!value) errorMessage = "Default area is required";
        break;
    }
    
    setErrors(prev => ({ ...prev, [name]: errorMessage }));
    return !errorMessage;
  };

  // Handle field blur to mark as touched
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name, formData[name as keyof typeof formData] as string);
  };

  // Handle input change with validation
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement> | 
    { target: { name: string; value: string } }
  ) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Validate if the field has been touched
    if (touched[name]) {
      validateField(name, value);
    }
  };

  // Handle select change
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Validate if the field has been touched
    if (touched[name]) {
      validateField(name, value);
    }
  };

  // Form submission with validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const nameValid = validateField("name", formData.name);
    const staffIdValid = validateField("staff_id", formData.staff_id);
    const gradeValid = validateField("grade", formData.grade);
    const areaValid = validateField("default_area", formData.default_area);
    
    // Mark all fields as touched
    setTouched({
      name: true,
      staff_id: true,
      grade: true,
      default_area: true,
    });
    
    // Submit if valid
    if (nameValid && staffIdValid && gradeValid && areaValid) {
      setLoading(true);
      try {
        await workers.create(formData);
        
        // Instead of showing toast here, set a notification for the next page
        notifySuccess(`Worker ${formData.name} has been added successfully!`);
        
        navigate("/dashboard");
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to add worker, please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex gap-4 mb-6">
          <Button 
            onClick={() => navigate("/dashboard")}
            variant="outline"
          >
            Back to Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/worker-details")}
          >
            Staff Details
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/monthly-summary")}
          >
            Monthly Summary
          </Button>
        </div>

        <Card className="p-6 space-y-6 animate-slideIn">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Add New Worker</h1>
            {user && (
              <p className="mt-2 text-lg text-gray-600">
                Hello, {user.name} ({user.staffId})
                {user.role && <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {user.role} Role
                </span>}
              </p>
            )}
            <p className="text-gray-500">Enter the worker's details below.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Worker Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={handleBlur}
                className={errors.name ? "border-red-500" : ""}
                placeholder="Enter worker name"
              />
              {touched.name && errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="staff_id">Staff ID</Label>
              <Input
                id="staff_id"
                name="staff_id"
                value={formData.staff_id}
                onChange={handleChange}
                onBlur={handleBlur}
                className={errors.staff_id ? "border-red-500" : ""}
                placeholder="Enter staff ID"
              />
              {touched.staff_id && errors.staff_id && (
                <p className="text-sm text-red-500">{errors.staff_id}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="grade">Grade</Label>
              <Select
                value={formData.grade}
                onValueChange={(value) => handleSelectChange("grade", value)}
                onOpenChange={(open) => {
                  if (!open) {
                    setTouched(prev => ({ ...prev, grade: true }));
                    validateField("grade", formData.grade);
                  }
                }}
              >
                <SelectTrigger className={errors.grade ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {GRADES.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {touched.grade && errors.grade && (
                <p className="text-sm text-red-500">{errors.grade}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="default_area">Default Area</Label>
              <Select
                value={formData.default_area}
                onValueChange={(value) => handleSelectChange("default_area", value)}
                onOpenChange={(open) => {
                  if (!open) {
                    setTouched(prev => ({ ...prev, default_area: true }));
                    validateField("default_area", formData.default_area);
                  }
                }}
              >
                <SelectTrigger className={errors.default_area ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select default area" />
                </SelectTrigger>
                <SelectContent>
                  {AREAS.map((area) => (
                    <SelectItem key={area.name} value={area.name}>
                      {area.name} (₵{area.rate.toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {touched.default_area && errors.default_area && (
                <p className="text-sm text-red-500">{errors.default_area}</p>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="transport_required"
                checked={formData.transport_required}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, transport_required: checked }))
                }
              />
              <Label htmlFor="transport_required">Transport Required</Label>
            </div>
            
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate("/dashboard")}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="w-full"
                disabled={loading}
              >
                {loading ? "Adding Worker..." : "Add Worker"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default AddWorker;
