
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const SignIn = () => {
  const navigate = useNavigate();

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
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Sign in functionality will be implemented soon
          </p>
        </div>
        <Button
          onClick={() => navigate("/")}
          className="w-full"
        >
          Back to Dashboard
        </Button>
      </Card>
    </div>
  );
};

export default SignIn;
