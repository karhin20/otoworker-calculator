import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Shield, CheckCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { workers, workerAuth } from "@/lib/api";
import { isTokenValid } from "@/utils/auth";
import { notifySuccess, notifyError } from "@/utils/notifications";

interface Worker {
  id: string;
  name: string;
  staff_id: string;
}

const WorkerPinSetup = () => {
  const navigate = useNavigate();
  const [workersList, setWorkersList] = useState<Worker[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingWorkers, setLoadingWorkers] = useState(true);

  useEffect(() => {
    // Check if user is authenticated and has admin rights
    if (!isTokenValid()) {
      navigate("/signin");
      return;
    }

    // Load workers list
    const fetchWorkers = async () => {
      try {
        const data = await workers.getAll();
        setWorkersList(data);
      } catch (error) {
        notifyError("Failed to load workers");
        console.error("Error loading workers:", error);
      } finally {
        setLoadingWorkers(false);
      }
    };

    fetchWorkers();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (!selectedWorkerId) {
      setError("Please select a worker");
      return;
    }
    
    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      setError("PIN must be exactly 6 digits");
      return;
    }
    
    if (pin !== confirmPin) {
      setError("PINs do not match");
      return;
    }
    
    setLoading(true);
    
    try {
      await workerAuth.setPin({
        workerId: selectedWorkerId,
        pin
      });
      
      setSuccess("PIN has been successfully set");
      notifySuccess("Worker PIN has been updated");
      
      // Reset form
      setPin("");
      setConfirmPin("");
      setSelectedWorkerId("");
    } catch (err: any) {
      console.error("Error setting PIN:", err);
      setError(err.message || "Failed to set worker PIN");
      notifyError("Failed to set worker PIN");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Worker PIN Management</h1>
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
          >
            Back to Dashboard
          </Button>
        </div>
        
        <Card className="p-6 shadow-md">
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-blue-600 border-b pb-4">
              <Shield className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Set or Reset Worker PIN</h2>
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="bg-green-50 border-green-200 text-green-800">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="worker">Select Worker</Label>
                <Select
                  disabled={loadingWorkers}
                  value={selectedWorkerId}
                  onValueChange={setSelectedWorkerId}
                >
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Select a worker" />
                  </SelectTrigger>
                  <SelectContent>
                    {workersList.map((worker) => (
                      <SelectItem key={worker.id} value={worker.id}>
                        {worker.name} ({worker.staff_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-gray-500">
                  {loadingWorkers ? "Loading workers..." : `${workersList.length} workers available`}
                </p>
              </div>
              
              <div>
                <Label htmlFor="pin">New 6-Digit PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  pattern="[0-9]{6}"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter 6-digit PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="confirmPin">Confirm PIN</Label>
                <Input
                  id="confirmPin"
                  type="password"
                  pattern="[0-9]{6}"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Confirm 6-digit PIN"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || loadingWorkers}
                >
                  {loading ? "Saving..." : "Set PIN"}
                </Button>
              </div>
            </form>
            
            <div className="text-sm text-gray-500 space-y-1 pt-4 border-t">
              <p>Security notes:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>PINs must be exactly 6 digits</li>
                <li>PINs are securely hashed in the database</li>
                <li>Never share worker PINs via email or messaging</li>
                <li>Instruct workers to change their PIN after initial setup</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default WorkerPinSetup; 