import React, { useState, useEffect } from 'react';
import { getPerformanceStats, clearMetrics, logRecentMetrics, configureMonitoring } from '@/utils/monitoring';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * Performance Monitor Component
 * 
 * Shows real-time performance metrics for API calls, cache efficiency, etc.
 * Only visible to administrators (Director role)
 */
const PerformanceMonitor: React.FC = () => {
  const [stats, setStats] = useState(getPerformanceStats());
  const [isEnabled, setIsEnabled] = useState(true);
  const [_setRefreshInterval] = useState(30000);  // 30 seconds default
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Refresh stats periodically
  useEffect(() => {
    if (!isEnabled) return;
    
    const intervalId = setInterval(() => {
      setStats(getPerformanceStats());
    }, _setRefreshInterval);
    
    return () => clearInterval(intervalId);
  }, [isEnabled, _setRefreshInterval]);
  
  // Toggle monitoring
  const handleToggleMonitoring = () => {
    const newEnabled = !isEnabled;
    setIsEnabled(newEnabled);
    configureMonitoring({ enabled: newEnabled });
  };
  
  // Reset metrics
  const handleResetMetrics = () => {
    clearMetrics();
    setStats(getPerformanceStats());
  };
  
  // Show detailed metrics in console
  const handleShowDetailedMetrics = () => {
    logRecentMetrics(20);
  };
  
  // Format a number with 2 decimal places
  const formatNumber = (num: number) => {
    return num.toFixed(2);
  };
  
  // Format a percentage
  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };
  
  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          variant="outline" 
          onClick={() => setIsExpanded(true)}
          className="bg-white dark:bg-gray-800 shadow-md"
        >
          Show Performance Monitor
        </Button>
      </div>
    );
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <Card className="p-4 bg-white dark:bg-gray-800 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Performance Monitor</h3>
          <div className="flex items-center space-x-2">
            <Switch 
              id="monitoring-toggle" 
              checked={isEnabled}
              onCheckedChange={handleToggleMonitoring}
            />
            <Label htmlFor="monitoring-toggle">
              {isEnabled ? 'Enabled' : 'Disabled'}
            </Label>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsExpanded(false)}
            >
              ✕
            </Button>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 mb-3 italic">
          This monitor is only visible to users with the Developer role.
        </div>
        
        <Tabs defaultValue="overview">
          <TabsList className="mb-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Requests</div>
                  <div className="text-lg font-semibold">{stats.totalRequests}</div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Avg Duration</div>
                  <div className="text-lg font-semibold">{formatNumber(stats.averageDuration)}ms</div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Cache Hit Rate</div>
                  <div className="text-lg font-semibold">{formatPercent(stats.cacheHitRate)}</div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Error Rate</div>
                  <div className="text-lg font-semibold">{formatPercent(stats.errorRate)}</div>
                </div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
                <div className="text-sm text-gray-500 dark:text-gray-400">Slow Requests</div>
                <div className="text-lg font-semibold">{stats.slowRequestCount}</div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="endpoints">
            <div className="max-h-60 overflow-y-auto space-y-2">
              {Object.entries(stats.endpointStats).map(([endpoint, data]) => (
                <div key={endpoint} className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
                  <div className="text-sm font-medium truncate">{endpoint}</div>
                  <div className="grid grid-cols-3 gap-1 mt-1 text-xs">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Count:</span> {data.count}
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Avg:</span> {formatNumber(data.averageDuration)}ms
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Max:</span> {formatNumber(data.maxDuration)}ms
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Cache:</span> {formatPercent(data.cacheHitRate)}
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Errors:</span> {formatPercent(data.errorRate)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-between mt-4">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleResetMetrics}
          >
            Reset Metrics
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleShowDetailedMetrics}
          >
            View Details
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default PerformanceMonitor; 