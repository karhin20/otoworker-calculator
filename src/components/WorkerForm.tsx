
import { useState } from "react";
import { Worker } from "@/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface WorkerFormProps {
  onSubmit: (worker: Omit<Worker, "id">) => void;
}

export function WorkerForm({ onSubmit }: WorkerFormProps) {
  const [name, setName] = useState("");
  const [defaultArea, setDefaultArea] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !defaultArea) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    onSubmit({ name, defaultArea });
    setName("");
    setDefaultArea("");
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
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter worker name"
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="area">Default Area</Label>
          <Input
            id="area"
            value={defaultArea}
            onChange={(e) => setDefaultArea(e.target.value)}
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
