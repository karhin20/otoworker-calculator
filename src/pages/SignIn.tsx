import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, UserCog, Users, HardHat } from "lucide-react";
import { admin } from "@/lib/api"; // Import the API utility
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SignIn = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await admin.signIn(formData);
      
      // Store the token and user info
      localStorage.setItem("token", data.token);
      
      // Set token expiry (24 hours from now)
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 24);  
      localStorage.setItem("tokenExpiry", expiryDate.toISOString());

      const userData = {
        name: data.user.name,
        staffId: data.user.staffId,
        grade: data.user.grade,
        role: data.user.role
      };
      
      localStorage.setItem("user", JSON.stringify(userData));
      
      // Redirect based on role
      if (userData.role && ['Supervisor', 'Accountant', 'Director'].includes(userData.role)) {
        navigate("/supervisor-dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      console.error("Sign in error:", err); // Enhanced error logging
      setError(err.message);
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
      <Card className="w-full max-w-md p-8 border-t-4 border-indigo-600">
        <Tabs defaultValue="admin" className="w-full mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="admin" className="data-[state=active]:bg-indigo-100">
              <UserCog className="h-4 w-4 mr-2" />
              Admin
            </TabsTrigger>
            <TabsTrigger value="worker" onClick={() => navigate("/worker-signin")} className="data-[state=active]:bg-green-100">
              <HardHat className="h-4 w-4 mr-2" />
              Staff
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="text-center mb-6">
          <UserCog className="h-12 w-12 mx-auto text-indigo-600" />
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
            Administrator Sign In
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Access supervisor, accountant, or director dashboards
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="mt-1"
            />
          </div>

          <div className="space-y-4">
            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in as Administrator"}
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
          <p>Are you staff looking to clock in/out?</p>
          <Button 
            variant="link" 
            className="text-green-600 font-medium" 
            onClick={() => navigate("/worker-signin")}
          >
            Go to Staff Sign In
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default SignIn;
