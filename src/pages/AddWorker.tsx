import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AREAS, Grade } from "@/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { workers } from "@/lib/api";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.staff_id || !formData.grade || !formData.default_area) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await workers.create({
        name: formData.name,
        staff_id: formData.staff_id,
        grade: formData.grade,
        default_area: formData.default_area,
        transport_required: formData.transport_required
      });

      toast({
        title: "Success",
        description: "Worker added successfully",
      });

      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error adding worker:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add worker",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
            Worker Details
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
            <p className="text-gray-500">Enter the worker's details below.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter worker's full name"
                className="w-full"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff_id">Staff ID *</Label>
              <Input
                id="staff_id"
                value={formData.staff_id}
                onChange={(e) => setFormData(prev => ({ ...prev, staff_id: e.target.value }))}
                placeholder="Enter staff ID"
                className="w-full"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade">Grade *</Label>
              <Select
                value={formData.grade}
                onValueChange={(value) => setFormData(prev => ({ ...prev, grade: value as Grade }))}
                required
              >
                <SelectTrigger>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="area">Area *</Label>
              <Select
                value={formData.default_area}
                onValueChange={(value) => setFormData(prev => ({ ...prev, default_area: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select area" />
                </SelectTrigger>
                <SelectContent>
                  {AREAS.map((area) => (
                    <SelectItem key={area.name} value={area.name}>
                      {area.name} - ₵{area.rate.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transport">Transport Required</Label>
              <Select
                value={formData.transport_required ? "yes" : "no"}
                onValueChange={(value) => setFormData(prev => ({ ...prev, transport_required: value === "yes" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
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
