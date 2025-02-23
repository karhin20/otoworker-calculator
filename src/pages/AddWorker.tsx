
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Worker, AREAS, Grade } from "@/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

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
  const [formData, setFormData] = useState({
    name: "",
    staffId: "",
    grade: "" as Grade,
    defaultArea: "",
    transportRequired: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.staffId || !formData.grade || !formData.defaultArea) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const newWorker: Omit<Worker, "id"> = {
      ...formData,
      grade: formData.grade as Grade,
    };

    // Here you would typically save the worker data
    console.log("New worker:", newWorker);
    
    toast({
      title: "Success",
      description: "Worker added successfully",
    });

    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <Button 
          onClick={() => navigate("/")}
          variant="outline"
          className="mb-6"
        >
          ← Back to Dashboard
        </Button>

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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staffId">Staff ID *</Label>
              <Input
                id="staffId"
                value={formData.staffId}
                onChange={(e) => setFormData(prev => ({ ...prev, staffId: e.target.value }))}
                placeholder="Enter staff ID"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade">Grade *</Label>
              <Select
                value={formData.grade}
                onValueChange={(value) => setFormData(prev => ({ ...prev, grade: value as Grade }))}
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
                value={formData.defaultArea}
                onValueChange={(value) => setFormData(prev => ({ ...prev, defaultArea: value }))}
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
                value={formData.transportRequired ? "yes" : "no"}
                onValueChange={(value) => setFormData(prev => ({ ...prev, transportRequired: value === "yes" }))}
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
                onClick={() => navigate("/")}
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full">
                Add Worker
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default AddWorker;
