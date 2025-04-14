/**
 * Performance monitoring utilities
 */

// Store performance metrics
interface PerformanceMetric {
  endpoint: string;
  method: string;
  startTime: number;
  endTime: number;
  duration: number;
  cacheHit: boolean;
  status: 'success' | 'error';
  errorMessage?: string;
}

// Configure monitoring settings
interface MonitoringConfig {
  enabled: boolean;
  logToConsole: boolean;
  sampleRate: number; // 0-1 (percentage of requests to monitor)
  sendToServer: boolean;
  slowThreshold: number; // ms
}

// Default configuration
const config: MonitoringConfig = {
  enabled: true,
  logToConsole: true,
  sampleRate: 1.0, // Monitor all requests by default
  sendToServer: false, // Don't send to a server by default
  slowThreshold: 1000 // Log warnings for operations over 1 second
};

// Storage for performance metrics
const metrics: PerformanceMetric[] = [];
const MAX_METRICS = 500; // Maximum number of metrics to store

/**
 * Start timing an operation
 */
export const startTiming = (_endpoint: string, _method: string): number => {
  // Skip if monitoring is disabled or if this request is not in the sample
  if (!config.enabled || Math.random() > config.sampleRate) {
    return 0;
  }
  
  return performance.now();
};

/**
 * End timing an operation and record metrics
 */
export const endTiming = (
  endpoint: string, 
  method: string, 
  startTime: number,
  cacheHit: boolean = false,
  status: 'success' | 'error' = 'success',
  errorMessage?: string
): number => {
  // Skip if monitoring is disabled or startTime is 0 (monitoring was skipped)
  if (!config.enabled || startTime === 0) {
    return 0;
  }
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  const metric: PerformanceMetric = {
    endpoint,
    method,
    startTime,
    endTime,
    duration,
    cacheHit,
    status,
    errorMessage
  };
  
  // Log slow operations
  if (duration > config.slowThreshold) {
    console.warn(`Slow operation (${duration.toFixed(2)}ms): ${method} ${endpoint}${cacheHit ? ' (cache hit)' : ''}`);
  }
  
  // Log to console if enabled
  if (config.logToConsole) {
    const color = status === 'error' ? 'red' : cacheHit ? 'green' : 'blue';
    const cacheIndicator = cacheHit ? '(cached) ' : '';
    console.log(
      `%c${cacheIndicator}${method} ${endpoint}: ${duration.toFixed(2)}ms`,
      `color: ${color}`
    );
    
    if (status === 'error' && errorMessage) {
      console.error(`Error: ${errorMessage}`);
    }
  }
  
  // Store metric
  metrics.push(metric);
  
  // Keep metrics array under MAX_METRICS
  if (metrics.length > MAX_METRICS) {
    metrics.shift();
  }
  
  // Send metric to server if enabled
  if (config.sendToServer) {
    sendMetricToServer(metric);
  }
  
  return duration;
};

/**
 * Send metrics to a server for logging and analytics
 */
const sendMetricToServer = (metric: PerformanceMetric): void => {
  // This would typically send to a backend analytics endpoint
  // For now, just print that we would be sending
  console.log('Would send metric to server:', metric);
  
  // In a real implementation:
  // fetch('/api/monitoring/metrics', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify(metric),
  // }).catch(e => console.error('Failed to send metric to server:', e));
};

/**
 * Get aggregate performance statistics
 */
export const getPerformanceStats = (): {
  totalRequests: number;
  averageDuration: number;
  cacheHitRate: number;
  errorRate: number;
  slowRequestCount: number;
  endpointStats: Record<string, {
    count: number;
    averageDuration: number;
    maxDuration: number;
    cacheHitRate: number;
    errorRate: number;
  }>;
} => {
  if (metrics.length === 0) {
    return {
      totalRequests: 0,
      averageDuration: 0,
      cacheHitRate: 0,
      errorRate: 0,
      slowRequestCount: 0,
      endpointStats: {}
    };
  }
  
  const totalRequests = metrics.length;
  const cacheHits = metrics.filter(m => m.cacheHit).length;
  const errors = metrics.filter(m => m.status === 'error').length;
  const slowRequests = metrics.filter(m => m.duration > config.slowThreshold).length;
  const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
  
  // Group by endpoint for detailed stats
  const endpointMap: Record<string, PerformanceMetric[]> = {};
  
  metrics.forEach(metric => {
    const key = `${metric.method} ${metric.endpoint}`;
    if (!endpointMap[key]) {
      endpointMap[key] = [];
    }
    endpointMap[key].push(metric);
  });
  
  const endpointStats: Record<string, any> = {};
  
  Object.entries(endpointMap).forEach(([key, endpointMetrics]) => {
    const count = endpointMetrics.length;
    const totalDuration = endpointMetrics.reduce((sum, m) => sum + m.duration, 0);
    const maxDuration = Math.max(...endpointMetrics.map(m => m.duration));
    const cacheHits = endpointMetrics.filter(m => m.cacheHit).length;
    const errors = endpointMetrics.filter(m => m.status === 'error').length;
    
    endpointStats[key] = {
      count,
      averageDuration: totalDuration / count,
      maxDuration,
      cacheHitRate: cacheHits / count,
      errorRate: errors / count
    };
  });
  
  return {
    totalRequests,
    averageDuration: totalDuration / totalRequests,
    cacheHitRate: cacheHits / totalRequests,
    errorRate: errors / totalRequests,
    slowRequestCount: slowRequests,
    endpointStats
  };
};

/**
 * Configure the monitoring system
 */
export const configureMonitoring = (newConfig: Partial<MonitoringConfig>): void => {
  Object.assign(config, newConfig);
  console.log('Monitoring configuration updated:', config);
};

/**
 * Clear collected metrics
 */
export const clearMetrics = (): void => {
  metrics.length = 0;
  console.log('Monitoring metrics cleared');
};

/**
 * Helper function for debugging - show recent metrics in console
 */
export const logRecentMetrics = (count: number = 10): void => {
  const recent = metrics.slice(-count);
  console.table(recent.map(m => ({
    endpoint: m.endpoint,
    method: m.method,
    duration: `${m.duration.toFixed(2)}ms`,
    cacheHit: m.cacheHit,
    status: m.status,
    time: new Date(m.startTime).toISOString()
  })));
};

// Log request metrics
export const logRequestMetrics = (
  _endpoint: string,
  _method: string,
  duration: number,
  responseSize: number,
  wasError: boolean,
  fromCache: boolean,
  statusCode?: number
): void => {
  if (!config.enabled) return;
  
  // Just log basic metrics for now
  console.log(`Request metrics: ${duration}ms, ${responseSize}b, error: ${wasError}, cache: ${fromCache}, status: ${statusCode || 'unknown'}`);
} 