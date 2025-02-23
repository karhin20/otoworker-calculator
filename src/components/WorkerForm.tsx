
import { useState } from "react";
import { Worker, Grade } from "@/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface WorkerFormProps {
  onSubmit: (worker: Omit<Worker, "id">) => void;
}

export function WorkerForm({ onSubmit }: WorkerFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    staffId: "",
    grade: "General Worker" as Grade,
    defaultArea: "",
    transportRequired: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.staffId || !formData.defaultArea) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    onSubmit(formData);
    setFormData({
      name: "",
      staffId: "",
      grade: "General Worker",
      defaultArea: "",
      transportRequired: true,
    });
    toast({
      title: "Success",
      description: "Worker added successfully",
    });
  };

  return (
    <Card className="p-6 space-y-4 animate-slideIn">
      <h3 className="text-lg font-medium">Add New Worker</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Worker Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter worker name"
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="staffId">Staff ID</Label>
          <Input
            id="staffId"
            value={formData.staffId}
            onChange={(e) => setFormData(prev => ({ ...prev, staffId: e.target.value }))}
            placeholder="Enter staff ID"
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="area">Default Area</Label>
          <Input
            id="area"
            value={formData.defaultArea}
            onChange={(e) => setFormData(prev => ({ ...prev, defaultArea: e.target.value }))}
            placeholder="Enter default area"
            className="w-full"
          />
        </div>
        <Button type="submit" className="w-full">
          Add Worker
        </Button>
      </form>
    </Card>
  );
}
