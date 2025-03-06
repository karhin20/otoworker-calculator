import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { admin } from "@/lib/api"; // Import the API utility

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
    console.log("Starting sign in process..."); // Debug log

    try {
      console.log("Attempting to sign in with:", { email: formData.email }); // Debug log (omit password)
      const data = await admin.signIn(formData);
      console.log("Sign in successful, received data:", data); // Debug log
      
      // Store the token and user info
      localStorage.setItem("token", data.token);
      
      // Set token expiry (24 hours from now)
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 24);  
      localStorage.setItem("tokenExpiry", expiryDate.toISOString());
      console.log("Token stored with expiry:", expiryDate.toISOString()); // Debug log

      localStorage.setItem("user", JSON.stringify({
        name: data.user.name,
        staffId: data.user.staffId,
        grade: data.user.grade
      }));
      
      // Redirect to dashboard
      console.log("Redirecting to dashboard..."); // Debug log
      navigate("/dashboard");
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
      <Card className="w-full max-w-md space-y-8 p-8">
        <div>
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{" "}
            <Button
              variant="link"
              className="font-medium text-primary"
              onClick={() => navigate("/signup")}
            >
              create a new account
            </Button>
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
              className="w-full"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
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
      </Card>
    </div>
  );
};

export default SignIn;
