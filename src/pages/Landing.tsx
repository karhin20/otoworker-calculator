import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogIn, UserPlus, Clock, Calendar, Shield, Users, Briefcase, PieChart, BarChart, HardHat, UserCog } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl md:text-5xl">
          Overtime, Transportation and Risk Management System
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Complete solution for overtime tracking, transportation management, risk reporting, and attendance
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-16">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
              <Users className="mr-2 h-6 w-6 text-blue-600" />
              For Staff
            </h2>
            <div className="space-y-6">
              <Card className="p-6 border-l-4 border-blue-500">
                <div className="flex">
                  <Clock className="h-6 w-6 text-blue-600 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-gray-900">Clock In/Out System</h3>
                    <p className="mt-1 text-gray-600">Track your work hours with geolocation support and automatic overtime calculation</p>
                  </div>
                </div>
              </Card>
              <Card className="p-6 border-l-4 border-purple-500">
                <div className="flex">
                  <Calendar className="h-6 w-6 text-purple-600 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-gray-900">Overtime & Transportation</h3>
                    <p className="mt-1 text-gray-600">Review your overtime hours and transportation allowances in one place</p>
                  </div>
                </div>
              </Card>
              <Card className="p-6 border-l-4 border-amber-500">
                <div className="flex">
                  <Shield className="h-6 w-6 text-amber-600 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-gray-900">Risk Entry Management</h3>
                    <p className="mt-1 text-gray-600">Submit and track risk activities with location details </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
              <Briefcase className="mr-2 h-6 w-6 text-indigo-600" />
              For Administrators
            </h2>
            <div className="space-y-6">
              <Card className="p-6 border-l-4 border-indigo-500">
                <div className="flex">
                  <PieChart className="h-6 w-6 text-indigo-600 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-gray-900">Hierarchical Approval System</h3>
                    <p className="mt-1 text-gray-600">Multi-stage approval process from standard admin to director level</p>
                  </div>
                </div>
              </Card>
              <Card className="p-6 border-l-4 border-green-500">
                <div className="flex">
                  <BarChart className="h-6 w-6 text-green-600 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-gray-900">Comprehensive Analytics</h3>
                    <p className="mt-1 text-gray-600">Visualize budget allocation, overtime trends and risk management data</p>
                  </div>
                </div>
              </Card>
              <Card className="p-6 border-l-4 border-rose-500">
                <div className="flex">
                  <Calendar className="h-6 w-6 text-rose-600 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-gray-900">Monthly Summary Reports</h3>
                    <p className="mt-1 text-gray-600">Consolidated view of worker hours, costs and approval status</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        <div className="mt-10 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="p-8 space-y-6 border-green-300 border-2 overflow-hidden relative">
              <div className="absolute top-0 right-0 bg-green-500 text-white py-1 px-4 transform rotate-45 translate-x-2 translate-y-3 text-xs font-bold">
                STAFF ACCESS
              </div>
              <div className="flex flex-col items-center">
                <HardHat className="h-16 w-16 text-green-600 mb-4" />
                <h3 className="text-2xl font-bold text-center text-gray-900">For Field Staff</h3>
                <p className="mt-2 text-center text-gray-600 mb-6">
                  Clock in/out, track your overtime, and submit risk entries
                </p>
                
                <div className="bg-green-50 p-4 rounded-lg w-full mb-4">
                  <h4 className="font-medium text-green-800 mb-2 flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    How to sign in:
                  </h4>
                  <p className="text-sm text-green-700">
                    Use your <strong>Staff ID Number</strong> and <strong>6-digit PIN</strong> 
                  </p>
                </div>
                
                <Button
                  onClick={() => navigate("/worker-signin")}
                  className="w-full bg-green-600 hover:bg-green-700 mt-4"
                  size="lg"
                >
                  <Clock className="mr-2 h-4 w-5" />
                  Staff Sign In
                </Button>
              </div>
            </Card>
            
            <Card className="p-8 space-y-6 border-indigo-300 border-2 overflow-hidden relative">
              <div className="absolute top-0 right-0 bg-indigo-500 text-white py-1 px-4 transform rotate-45 translate-x-2 translate-y-3 text-xs font-bold">
                ADMIN ACCESS
              </div>
              <div className="flex flex-col items-center">
                <UserCog className="h-16 w-16 text-indigo-600 mb-4" />
                <h3 className="text-2xl font-bold text-center text-gray-900">For Administrators</h3>
                <p className="mt-2 text-center text-gray-600 mb-6">
                  Manage approvals, generate reports, and analyze data
                </p>
                
                <div className="bg-indigo-50 p-4 rounded-lg w-full mb-4">
                  <h4 className="font-medium text-indigo-800 mb-2 flex items-center">
                    <LogIn className="h-4 w-4 mr-2" />
                    How to sign in:
                  </h4>
                  <p className="text-sm text-indigo-700">
                    Use your <strong>Email</strong> and <strong>Password</strong> to access the admin dashboard
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 w-full">
                  <Button
                    onClick={() => navigate("/signin")}
                    className="bg-indigo-600 hover:bg-indigo-700"
                    size="lg"
                  >
                    <LogIn className="mr-2 h-5 w-5" />
                    Admin Sign In
                  </Button>
                  <Button
                    onClick={() => navigate("/signup")}
                    variant="outline"
                    className="border-indigo-300 hover:bg-indigo-50"
                    size="lg"
                  >
                    <UserPlus className="mr-2 h-5 w-5" />
                    Admin Sign Up
                  </Button>
                </div>
              </div>
            </Card>
          </div>
          
          <div className="text-sm text-gray-500 text-center mt-8">
            <p>Need help? Contact your system administrator or refer to the user manual for assistance.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing; 