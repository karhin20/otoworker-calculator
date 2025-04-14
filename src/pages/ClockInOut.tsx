import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, MapPin, Clock, LogIn, LogOut as LogOutIcon, History, Calendar, Shield, Users } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { getAndClearNotification } from "@/utils/notifications";
import { Clock as ClockApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const ClockInOut = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ name: string; staffId: string; role?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<'clocked_in' | 'clocked_out' | null>(null);
  const [lastClockEvent, setLastClockEvent] = useState<{ 
    type: 'in' | 'out', 
    timestamp: string,
    location?: { latitude: number, longitude: number }
  } | null>(null);
  const [location, setLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [clockHistory, setClockHistory] = useState<Array<{
    type: 'in' | 'out',
    timestamp: string,
    location?: { latitude: number, longitude: number }
  }>>([]);

  // Load user data and check notification on mount
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      setUser(JSON.parse(userStr));
    }

    const notification = getAndClearNotification();
    if (notification) {
      toast({
        title: notification.type.charAt(0).toUpperCase() + notification.type.slice(1),
        description: notification.message,
        variant: notification.type === 'error' ? 'destructive' : 'default',
      });
    }
  }, []);

  // Load current status and history on mount
  useEffect(() => {
    fetchCurrentStatus();
    fetchClockHistory();
  }, []);

  // Function to get current location
  const getCurrentLocation = async (): Promise<{ latitude: number, longitude: number } | null> => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      toast({
        title: "Location Required",
        description: "Your browser doesn't support location services. Please use a modern browser.",
        variant: "destructive",
      });
      return null;
    }

    setLocationLoading(true);
    setLocationError(null);

    return new Promise((resolve) => {
      // First check for permission
      navigator.permissions.query({ name: 'geolocation' }).then(permissionStatus => {
        console.log('Location permission status:', permissionStatus.state);
        
        if (permissionStatus.state === 'denied') {
          setLocationError("Location permission denied. Please enable location services in your browser settings.");
          setLocationLoading(false);
          toast({
            title: "Location Access Denied",
            description: "You must allow location access to use the clock in/out system. Please check your browser settings.",
            variant: "destructive",
          });
          resolve(null);
          return;
        }
        
        // Try to get location even if permission is 'prompt', as the browser will show the permission dialog
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            };
            
            console.log('Location obtained:', newLocation);
            setLocation(newLocation);
            setLocationLoading(false);
            resolve(newLocation);
          },
          (error) => {
            console.error("Error getting location:", error);
            let errorMessage = "Failed to get your location.";
            
            // Provide more specific error messages
            if (error.code === 1) {
              errorMessage = "Location access denied. Please enable location services in your device settings.";
            } else if (error.code === 2) {
              errorMessage = "Location unavailable. Please check your device's GPS or try again.";
            } else if (error.code === 3) {
              errorMessage = "Location request timed out. Please try again.";
            }
            
            setLocationError(errorMessage);
            setLocationLoading(false);
            toast({
              title: "Location Error",
              description: errorMessage,
              variant: "destructive",
            });
            resolve(null);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      }).catch(error => {
        console.error("Permission query error:", error);
        setLocationError("Failed to query location permissions.");
        setLocationLoading(false);
        resolve(null);
      });
    });
  };

  // Fetch current clock status
  const fetchCurrentStatus = async () => {
    setLoading(true);
    try {
      const status = await ClockApi.getStatus();
      setCurrentStatus(status.status);
      if (status.lastEvent) {
        setLastClockEvent(status.lastEvent);
      }
    } catch (error) {
      console.error("Failed to fetch clock status:", error);
      toast({
        title: "Error",
        description: "Failed to fetch your current clock status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch clock history
  const fetchClockHistory = async () => {
    try {
      const history = await ClockApi.getHistory();
      setClockHistory(history);
    } catch (error) {
      console.error("Failed to fetch clock history:", error);
    }
  };

  // Handle clock in
  const handleClockIn = async () => {
    try {
      setLoading(true);
      
      // Clear any previous location errors
      setLocationError(null);
      
      // Show toast that we're getting location
      toast({
        title: "Getting Location",
        description: "Please allow location access if prompted",
      });
      
      const locationData = await getCurrentLocation();
      
      if (!locationData) {
        toast({
          title: "Location Required",
          description: "Location access is mandatory. Please enable location services to clock in.",
          variant: "destructive",
        });
        return;
      }
      
      // Log location data before sending to API
      console.log("Attempting to clock in with location:", locationData);
      
      // Show processing toast
      toast({
        title: "Processing",
        description: "Recording your clock in...",
      });
      
      await ClockApi.clockIn(locationData);
      
      toast({
        title: "Success",
        description: "You have successfully clocked in",
      });
      
      await fetchCurrentStatus();
      await fetchClockHistory();
    } catch (error) {
      console.error("Failed to clock in:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to clock in. Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle clock out
  const handleClockOut = async () => {
    try {
      setLoading(true);
      
      // Clear any previous location errors
      setLocationError(null);
      
      // Show toast that we're getting location
      toast({
        title: "Getting Location",
        description: "Please allow location access if prompted",
      });
      
      const locationData = await getCurrentLocation();
      
      if (!locationData) {
        toast({
          title: "Location Required",
          description: "Location access is mandatory. Please enable location services to clock out.",
          variant: "destructive",
        });
        return;
      }
      
      // Log location data before sending to API
      console.log("Attempting to clock out with location:", locationData);
      
      // Show processing toast
      toast({
        title: "Processing",
        description: "Recording your clock out...",
      });
      
      await ClockApi.clockOut(locationData);
      
      toast({
        title: "Success",
        description: "You have successfully clocked out",
      });
      
      await fetchCurrentStatus();
      await fetchClockHistory();
    } catch (error) {
      console.error("Failed to clock out:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to clock out. Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle sign out
  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  // Format time from ISO string
  const formatTime = (isoString: string) => {
    try {
      return format(new Date(isoString), "hh:mm:ss a");
    } catch (error) {
      return "Invalid time";
    }
  };

  // Format date from ISO string
  const formatDate = (isoString: string) => {
    try {
      return format(new Date(isoString), "EEEE, MMMM d, yyyy");
    } catch (error) {
      return "Invalid date";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Clock In/Out System
            </h1>
            {user && (
              <p className="mt-2 text-lg text-gray-600">
                Hello, {user.name} ({user.staffId})
                {user.role && <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {user.role} Role
                </span>}
              </p>
            )}
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>

        <Card className="p-4 bg-white shadow-sm">
          <nav className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              onClick={() => navigate("/worker-dashboard")}
            >
              <Users className="mr-2 h-4 w-4" /> Dashboard
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/worker-reports")}
            >
              <Calendar className="mr-2 h-4 w-4" /> My Reports
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/worker-risk")}
            >
              <Shield className="mr-2 h-4 w-4" /> My Risk Entries
            </Button>
          </nav>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Current Status */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Current Status</h2>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-8 w-56" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center">
                  <Clock className="h-6 w-6 mr-2 text-blue-600" />
                  <p className="text-lg font-medium">
                    {format(new Date(), 'dd/MM/yyyy')} - {new Date().toLocaleTimeString()}
                  </p>
                </div>
                <div className="flex items-center">
                  <div className="mr-4">
                    {currentStatus === 'clocked_in' ? (
                      <Badge className="px-3 py-1.5 bg-green-100 text-green-800 border-green-200 text-sm">
                        <LogIn className="h-4 w-4 mr-1.5" /> Clocked In
                      </Badge>
                    ) : (
                      <Badge className="px-3 py-1.5 bg-gray-100 text-gray-800 border-gray-200 text-sm">
                        <LogOutIcon className="h-4 w-4 mr-1.5" /> Clocked Out
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-600">
                    {lastClockEvent ? 
                      `Last ${lastClockEvent.type === 'in' ? 'clock in' : 'clock out'} at ${formatTime(lastClockEvent.timestamp)}` : 
                      'No recent clock events'}
                  </p>
                </div>
                {lastClockEvent?.location && (
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-red-500" />
                    <p className="text-gray-600">
                      Last location: {lastClockEvent.location.latitude?.toFixed(6) || 'N/A'}, {lastClockEvent.location.longitude?.toFixed(6) || 'N/A'}
                    </p>
                  </div>
                )}
                {/* Location Status */}
                {locationLoading ? (
                  <div className="flex items-center text-blue-600">
                    <div className="mr-2 h-4 w-4 rounded-full bg-blue-600 animate-pulse"></div>
                    <p>Getting your current location...</p>
                  </div>
                ) : location ? (
                  <div className="flex items-center text-green-600 bg-green-50 p-2 rounded-md">
                    <MapPin className="h-5 w-5 mr-2" />
                    <div>
                      <p className="font-medium">Location ready</p>
                      <p className="text-xs text-green-700">
                        {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                      </p>
                    </div>
                  </div>
                ) : null}
                {locationError && (
                  <div className="mt-2 text-red-500 bg-red-50 p-3 rounded-md border border-red-200">
                    <div className="flex items-center mb-1">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="font-bold">Location Error</span>
                    </div>
                    <p>{locationError}</p>
                    <button 
                      onClick={() => getCurrentLocation()}
                      className="mt-2 text-sm text-red-700 underline"
                    >
                      Try again
                    </button>
                  </div>
                )}
              </div>
            )}
            <div className="mt-8 space-x-4 flex">
              <Button
                onClick={handleClockIn}
                disabled={loading || currentStatus === 'clocked_in' || locationLoading}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="lg"
              >
                {locationLoading ? (
                  <>
                    <div className="mr-2 h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                    Getting Location...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-5 w-5" />
                    Clock In
                  </>
                )}
              </Button>
              <Button
                onClick={handleClockOut}
                disabled={loading || currentStatus === 'clocked_out' || currentStatus === null || locationLoading}
                className="bg-amber-600 hover:bg-amber-700 text-white"
                size="lg"
              >
                {locationLoading ? (
                  <>
                    <div className="mr-2 h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                    Getting Location...
                  </>
                ) : (
                  <>
                    <LogOutIcon className="mr-2 h-5 w-5" />
                    Clock Out
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Clock History */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Recent Activity</h2>
              <History className="h-5 w-5 text-gray-500" />
            </div>
            {loading && clockHistory.length === 0 ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="border-b pb-3">
                    <Skeleton className="h-6 w-24 mb-2" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                ))}
              </div>
            ) : clockHistory.length > 0 ? (
              <div className="space-y-6 max-h-96 overflow-y-auto pr-2">
                {clockHistory.map((event, index) => (
                  <div key={index} className="border-b pb-3">
                    <div className="flex items-center mb-1">
                      {event.type === 'in' ? (
                        <Badge className="px-2 py-0.5 bg-green-100 text-green-800 border-green-200 text-xs">
                          <LogIn className="h-3 w-3 mr-1" /> In
                        </Badge>
                      ) : (
                        <Badge className="px-2 py-0.5 bg-amber-100 text-amber-800 border-amber-200 text-xs">
                          <LogOutIcon className="h-3 w-3 mr-1" /> Out
                        </Badge>
                      )}
                      <span className="ml-2 text-sm font-medium">{formatTime(event.timestamp)}</span>
                    </div>
                    <p className="text-xs text-gray-500">{formatDate(event.timestamp)}</p>
                    {event.location && (
                      <div className="flex items-center mt-1 text-xs text-gray-500">
                        <MapPin className="h-3 w-3 mr-1" />
                        <span>
                          {event.location.latitude?.toFixed(6) || 'N/A'}, {event.location.longitude?.toFixed(6) || 'N/A'}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 py-6 text-center">
                No clock history available
              </p>
            )}
          </Card>
        </div>

        {/* Instruction Card */}
        <Card className="p-6 bg-blue-50 border border-blue-100">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">How to use the Clock In/Out system</h3>
          <ul className="space-y-2 text-blue-700">
            <li className="flex items-start">
              <span className="inline-flex items-center justify-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 mr-2">1</span>
              Click the "Clock In" button at the start of your workday
            </li>
            <li className="flex items-start">
              <span className="inline-flex items-center justify-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 mr-2">2</span>
              Allow location access when prompted - this is required by company policy
            </li>
            <li className="flex items-start">
              <span className="inline-flex items-center justify-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 mr-2">3</span>
              Click the "Clock Out" button at the end of your workday
            </li>
            <li className="flex items-start">
              <span className="inline-flex items-center justify-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 mr-2">4</span>
              Your overtime will be automatically calculated if you work more than 9 hours
            </li>
            <li className="flex items-start">
              <span className="inline-flex items-center justify-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 mr-2">5</span>
              Overtime hours are rounded up to the nearest hour (e.g., 9h 20m = 1h overtime)
            </li>
          </ul>
          <div className="mt-4 p-2 bg-yellow-100 rounded-md border border-yellow-300">
            <p className="text-yellow-800 text-sm flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <strong>Important:</strong> Location tracking is mandatory for all clock events by company policy. If you experience problems with location services, please contact IT support.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ClockInOut; 