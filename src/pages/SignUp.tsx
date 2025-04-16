import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Grade, AdminRole } from "@/types";
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
    role: "",
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
  
  const adminRoles: { value: AdminRole; label: string; description: string }[] = [
    { value: "Standard", label: "Standard Admin", description: "Can add entries only" },
    { value: "District_Head", label: "District Head", description: "Can review and manage district entries" },
    { value: "Supervisor", label: "District Supervisor", description: "Can approve entries (first level)" },
    { value: "RDM", label: "RDM", description: "Can approve entries from multiple districts (first level)" },
    { value: "Accountant", label: "Regional Accountant", description: "Can edit amounts and approve entries (second level)" },
    { value: "RCM", label: "RCM", description: "Can give final approval for financial aspects" },
    { value: "Director", label: "Regional Director", description: "Can give final approval (third level)" }
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
        grade: formData.grade,
        role: formData.role
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
        grade: data.user.grade,
        role: data.user.role
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
  
  const handleRoleChange = (value: string) => {
    setFormData({
      ...formData,
      role: value,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign up as an administrator
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="p-6">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staffId">Staff ID</Label>
              <Input
                id="staffId"
                name="staffId"
                type="text"
                required
                value={formData.staffId}
                onChange={handleChange}
                placeholder="Your staff ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade">Grade</Label>
              <Select
                value={formData.grade}
                onValueChange={handleGradeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a grade" />
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
            
            <div className="space-y-2">
              <Label htmlFor="role">Admin Role</Label>
              <Select
                value={formData.role}
                onValueChange={handleRoleChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an admin role" />
                </SelectTrigger>
                <SelectContent>
                  {adminRoles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.role && (
                <p className="text-xs text-gray-500 mt-1">
                  {adminRoles.find(r => r.value === formData.role)?.description}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="your.email@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
              />
              <p className="text-xs text-gray-500">At least 6 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secretCode">Admin Secret Code</Label>
              <Input
                id="secretCode"
                name="secretCode"
                type="password"
                required
                value={formData.secretCode}
                onChange={handleChange}
                placeholder="Secret code provided by administrator"
              />
            </div>

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate("/")}
              >
                Back to Login
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Signing up..." : "Sign up"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default SignUp;
