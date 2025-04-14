import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, UserCog, Clock, HardHat, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { workerAuth } from "@/lib/api";

const WorkerSignIn = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    staffId: "",
    pin: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Call the worker sign-in API
      const data = await workerAuth.signIn(formData);
      
      // Store worker info upon successful authentication
      localStorage.setItem("workerToken", data.token);
      
      // Set token expiry (12 hours from now)
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 12);
      localStorage.setItem("workerTokenExpiry", expiryDate.toISOString());

      localStorage.setItem("worker", JSON.stringify({
        id: data.worker.id,
        staffId: data.worker.staffId,
        name: data.worker.name,
        grade: data.worker.grade,
        role: "Worker"
      }));
      
      // Redirect to worker dashboard
      navigate("/worker-dashboard");
    } catch (err: any) {
      console.error("Worker sign-in error:", err);
      setError(err.message || "Failed to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md p-8 border-t-4 border-green-600">
        <Tabs defaultValue="worker" className="w-full mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger 
              value="worker" 
              className="data-[state=active]:bg-green-100"
            >
              <HardHat className="h-4 w-4 mr-2" />
              Staff
            </TabsTrigger>
            <TabsTrigger 
              value="admin" 
              onClick={() => navigate("/signin")}
              className="data-[state=active]:bg-indigo-100"
            >
              <UserCog className="h-4 w-4 mr-2" />
              Admin
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="text-center mb-6">
          <HardHat className="h-12 w-12 mx-auto text-green-600" />
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
            Staff Sign In
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Clock in/out, submit overtime and track your work hours
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="staffId">Staff ID Number</Label>
            <Input
              id="staffId"
              name="staffId"
              type="text"
              required
              placeholder="Enter your staff ID"
              value={formData.staffId}
              onChange={handleChange}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="pin">PIN</Label>
            <Input
              id="pin"
              name="pin"
              type="password"
              required
              placeholder="Enter your 6-digit PIN"
              pattern="[0-9]{6}"
              title="PIN must be 6 digits"
              inputMode="numeric"
              maxLength={6}
              value={formData.pin}
              onChange={handleChange}
              className="mt-1"
            />
            <p className="mt-1 text-xs text-gray-500">
              Your PIN is a 6-digit number assigned to you by your supervisor
            </p>
          </div>

          <div className="space-y-4">
            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <Clock className="mr-2 h-5 w-5" />
                  Sign in to Clock In/Out
                </span>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/")}
              className="w-full"
            >
              Back to Home
            </Button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t text-sm text-center text-gray-500">
          <p>Are you an administrator?</p>
          <Button 
            variant="link" 
            className="text-indigo-600 font-medium" 
            onClick={() => navigate("/signin")}
          >
            Go to Admin Sign In
          </Button>
        </div>
        
        <div className="mt-4 text-center">
          <Button variant="link" size="sm" onClick={() => window.alert("Please contact your supervisor to reset your PIN.")}>
            Forgot PIN?
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default WorkerSignIn; 