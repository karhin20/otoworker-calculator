import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Grade } from "@/types";
import { admin } from "@/lib/api"; 

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    secretCode: "",
    name: "",
    staffId: "",
    grade: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const grades: Grade[] = [
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      console.log("Submitting form data"); 

      const data = await admin.signUp({
        email: formData.email,
        password: formData.password,
        secretCode: formData.secretCode,
        name: formData.name,
        staffId: formData.staffId, 
        grade: formData.grade
      });
      


      // Store the token and user info
      localStorage.setItem("token", data.token);

      // Set token expiry (24 hours from now)
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 24);  
      localStorage.setItem("tokenExpiry", expiryDate.toISOString());

      localStorage.setItem("user", JSON.stringify({
        name: data.user.name,
        staffId: data.user.staffId,
        grade: data.user.grade
      }));
      
      // Redirect to dashboard
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Signup error:", err); 
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

  const handleGradeChange = (value: string) => {
    setFormData({
      ...formData,
      grade: value,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md space-y-8 p-8">
        <div>
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{" "}
            <Button
              variant="link"
              className="font-medium text-primary"
              onClick={() => navigate("/signin")}
            >
              sign in to your account
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
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="staffId">Staff ID</Label>
            <Input
              id="staffId"
              name="staffId"
              type="text"
              required
              value={formData.staffId}
              onChange={handleChange}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="grade">Grade</Label>
            <Select
              value={formData.grade}
              onValueChange={handleGradeChange}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select grade" />
              </SelectTrigger>
              <SelectContent>
                {grades.map((grade) => (
                  <SelectItem key={grade} value={grade}>
                    {grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

          <div>
            <Label htmlFor="secretCode">Secret Code</Label>
            <Input
              id="secretCode"
              name="secretCode"
              type="password"
              required
              value={formData.secretCode}
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
              {loading ? "Signing up..." : "Sign up"}
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

export default SignUp;
