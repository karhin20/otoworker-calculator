import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogIn, UserPlus } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-7xl text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl md:text-4xl">
          Overtime, Transportation and Risk Management System
        </h2>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          Efficiently manage worker overtime, transportation and risk
        </p>

        <div className="mt-10">
          <Card className="max-w-md mx-auto p-8 space-y-6">
            <div className="space-y-4">
              <Button
                onClick={() => navigate("/signin")}
                className="w-full"
                size="lg"
              >
                <LogIn className="mr-2 h-5 w-5" />
                Sign In
              </Button>
              <Button
                onClick={() => navigate("/signup")}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <UserPlus className="mr-2 h-5 w-5" />
                Sign Up
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              Admin access only. Contact your administrator for signup code.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Landing; 