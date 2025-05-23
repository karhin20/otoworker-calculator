import { Worker, WorkerSummary, WorkerDetail, RiskEntry } from '@/types';
import { isOnline, queueOfflineRequest, getOfflineData, cacheDataForOffline } from "@/utils/offline";
import { clearAuthData } from "@/utils/auth";
import { startTiming, endTiming } from "@/utils/monitoring";

const API_BASE_URL = "https://overtime-transport-backend.vercel.app/api";

interface ApiOptions {
  method?: string;
  body?: any;
  requiresAuth?: boolean;
}

// Add caching functionality to the API module

// Cache storage
interface CacheData {
  data: any;
  expiry: number;
}

interface ApiCache {
  [key: string]: CacheData;
}

// In-memory cache object
const apiCache: ApiCache = {};

// Helper to generate cache keys
const generateCacheKey = (endpoint: string, params: any = {}): string => {
  return `${endpoint}:${JSON.stringify(params)}`;
};

// Cache durations in milliseconds for different types of data
const CACHE_DURATIONS = {
  DEFAULT: 5 * 60 * 1000, // 5 minutes (default)
  WORKER_LIST: 60 * 60 * 1000, // 1 hour for worker lists
  MONTHLY_SUMMARY: 30 * 60 * 1000, // 30 minutes for monthly summaries
  HOLIDAYS: 24 * 60 * 60 * 1000, // 24 hours for holidays (rarely change)
  STATUS: 1 * 60 * 1000 // 1 minute for status checks
};

// Function to store data in cache
const setCache = (key: string, data: any, durationType: keyof typeof CACHE_DURATIONS = 'DEFAULT'): void => {
  const duration = CACHE_DURATIONS[durationType];
  const expiry = Date.now() + duration;
  apiCache[key] = { data, expiry };
  
  // Also store in localStorage for persistence across sessions if it's not sensitive data
  if (['WORKER_LIST', 'HOLIDAYS'].includes(durationType)) {
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify({ data, expiry }));
    } catch (e) {
      console.warn('Failed to cache data in localStorage:', e);
    }
  }
};

// Function to get data from cache with fallback to localStorage
const getCache = (key: string): any | null => {
  // First try memory cache
  const cachedData = apiCache[key];
  
  if (cachedData && Date.now() <= cachedData.expiry) {
    return cachedData.data;
  }
  
  // If not in memory or expired, try localStorage
  try {
    const localData = localStorage.getItem(`cache_${key}`);
    if (localData) {
      const parsed = JSON.parse(localData);
      if (Date.now() <= parsed.expiry) {
        // Also put back in memory cache
        apiCache[key] = parsed;
        return parsed.data;
      } else {
        // Remove expired item
        localStorage.removeItem(`cache_${key}`);
      }
    }
  } catch (e) {
    console.warn('Failed to retrieve cache from localStorage:', e);
  }
  
  // Not found or expired
  if (cachedData) {
    delete apiCache[key]; // Clean up expired entries
  }
  return null;
};

// More targeted cache clearing
const clearCache = (keyPattern?: string, forceClearPersistent: boolean = false): void => {
  if (keyPattern) {
    // Clear memory cache
    Object.keys(apiCache).forEach(key => {
      if (key.includes(keyPattern)) {
        delete apiCache[key];
      }
    });
    
    // Clear localStorage cache if forced
    if (forceClearPersistent) {
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('cache_') && key.includes(keyPattern)) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.warn('Failed to clear persistent cache:', e);
      }
    }
  } else {
    // Clear all memory cache
    Object.keys(apiCache).forEach(key => {
      delete apiCache[key];
    });
    
    // Clear all localStorage cache if forced
    if (forceClearPersistent) {
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('cache_')) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.warn('Failed to clear persistent cache:', e);
      }
    }
  }
};

// Pre-warm cache on startup for frequently accessed data
const prewarmCache = async (): Promise<void> => {
  try {
    console.log('Pre-warming cache...');
    // Pre-fetch holidays
    const holidaysKey = generateCacheKey('holidays/getAll', {});
    if (!getCache(holidaysKey)) {
      const holidaysData = await apiCall('/holidays');
      setCache(holidaysKey, holidaysData, 'HOLIDAYS');
    }
    
    // Could add more pre-warming here based on user role and common access patterns
    
    console.log('Cache pre-warming complete');
  } catch (e) {
    console.error('Failed to pre-warm cache:', e);
  }
};

// Call pre-warm cache when the app starts
setTimeout(prewarmCache, 2000); // Wait 2 seconds after app start to pre-warm

// Update the apiCall function to handle offline mode
export async function apiCall(endpoint: string, options: ApiOptions = {}) {
  const { method = "GET", body, requiresAuth = true } = options;
  
  // Start monitoring the API call
  const startTime = startTiming(endpoint, method);

  // Generate cache key for this request
  const cacheKey = generateCacheKey(endpoint, options);
  
  try {
    // Check if we're offline
    if (!isOnline()) {
      console.log(`Device is offline. Trying to fetch cached data for ${endpoint}`);
      
      // For GET requests, try to retrieve from offline cache
      if (method === "GET") {
        const cachedData = await getOfflineData(cacheKey);
        if (cachedData) {
          // Record cache hit in monitoring
          endTiming(endpoint, method, startTime, true);
          return cachedData;
        }
        throw new Error("You are offline and no cached data is available");
      } else {
        // For non-GET requests (mutations), queue them for later
        await queueOfflineRequest(endpoint, options);
        throw new Error("You are offline. Your changes will be saved when you reconnect.");
      }
    }

    // Check cache for GET requests
    if (method === "GET") {
      const cachedData = getCache(cacheKey);
      if (cachedData) {
        // Record cache hit in monitoring
        endTiming(endpoint, method, startTime, true);
        return cachedData;
      }
    }

    // Online path continues normally
    const token = localStorage.getItem("token");
    
    if (requiresAuth && !token) {
      const error = new Error("Authentication required");
      endTiming(endpoint, method, startTime, false, 'error', error.message);
      throw error;
    }

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (requiresAuth && token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Handle authentication errors
    if (response.status === 401) {
      if (requiresAuth) {
        clearAuthData();
        // No automatic redirect here - letting the ProtectedRoute handle it
        const error = new Error("Your session has expired. Please sign in again.");
        endTiming(endpoint, method, startTime, false, 'error', error.message);
        throw error;
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.error || `API error: ${response.status}`);
      endTiming(endpoint, method, startTime, false, 'error', error.message);
      throw error;
    }

    const data = await response.json();
    
    // Update token expiry if the response includes a new token
    if (data.token) {
      localStorage.setItem("token", data.token);
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 24);
      localStorage.setItem("tokenExpiry", expiryDate.toISOString());
    }
    
    // For GET requests, cache the data for offline use
    if (method === "GET") {
      await cacheDataForOffline(cacheKey, data);
    }
    
    // Record successful API call in monitoring
    endTiming(endpoint, method, startTime, false, 'success');
    return data;
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    // Record error in monitoring if not already recorded
    endTiming(endpoint, method, startTime, false, 'error', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// Auth endpoints
export const auth = {
  signUp: (data: { email: string; password: string; secretCode: string }) =>
    apiCall("/admin/signup", { method: "POST", body: data, requiresAuth: false }),
  
  signIn: (data: { email: string; password: string }) =>
    apiCall("/admin/signin", { method: "POST", body: data, requiresAuth: false }),
};

// Worker auth endpoints
export const workerAuth = {
  signIn: (data: { staffId: string; pin: string }) =>
    apiCall("/worker/signin", { method: "POST", body: data, requiresAuth: false }),
  
  // This endpoint is for admins to set a worker's PIN
  setPin: (data: { workerId: string; pin: string }) =>
    apiCall("/worker/setpin", { method: "POST", body: data }),
};

// Workers endpoints with caching
export const workers = {
  async getAll(): Promise<Worker[]> {
    const cacheKey = generateCacheKey('workers/getAll', {});
    const cachedData = getCache(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    const data = await apiCall("/workers");
    setCache(cacheKey, data, 'WORKER_LIST');
    return data;
  },
  
  // Get a specific worker by ID
  async getById(id: string): Promise<Worker> {
    const cacheKey = generateCacheKey('workers/getById', { id });
    const cachedData = getCache(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    const data = await apiCall(`/workers/${id}`);
    setCache(cacheKey, data);
    return data;
  },
  
  // Get worker by staff ID
  async getByStaffId(staffId: string): Promise<Worker> {
    const cacheKey = generateCacheKey('workers/getByStaffId', { staffId });
    const cachedData = getCache(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    const data = await apiCall(`/workers/staff/${staffId}`);
    setCache(cacheKey, data);
    return data;
  },

  // Get worker summary
  async getWorkerSummary(id: string, month: number, year: number): Promise<any> {
    const cacheKey = generateCacheKey('workers/getWorkerSummary', { id, month, year });
    const cachedData = getCache(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    try {
      console.log(`Fetching worker summary for worker ${id}, month ${month}, year ${year}`);
      const data = await apiCall(`/workers/${id}/summary?month=${month}&year=${year}`);
      
      if (data) {
        // Cache successful responses
        setCache(cacheKey, data);
        return data;
      } else {
        throw new Error('No data returned from worker summary endpoint');
      }
    } catch (error) {
      console.error(`Error fetching worker summary: ${error}`);
      // For empty month/future month, return a default structure instead of failing
      if (month > new Date().getMonth() + 1 && year >= new Date().getFullYear()) {
        const defaultSummary = {
          worker: {
            id: id,
            name: '',
            staff_id: '',
            grade: '',
            default_area: ''
          },
          summary: {
            category_a_hours: 0,
            category_c_hours: 0,
            transportation_days: 0,
            transportation_cost: 0,
            risk_entries: 0,
            avg_work_hours: 0,
            total_entries: 0
          }
        };
        return defaultSummary;
      }
      // For other errors, rethrow to be handled by the caller
      throw error;
    }
  },

  create: (data: {
    name: string;
    staff_id: string;
    grade: string;
    default_area: string;
    transport_required: boolean;
  }) => {
    // Clear cache when creating a new worker
    clearCache('workers/');
    return apiCall("/workers", {
      method: "POST",
      body: data,
    });
  }
};

// Overtime endpoints with caching
export const overtime = {
  async getByWorker(workerId: string, month: number, year: number, options?: { forceRefresh?: boolean }): Promise<WorkerDetail[]> {
    const forceRefresh = options?.forceRefresh || false;
    const timestamp = forceRefresh ? `&_t=${Date.now()}` : '';
    
    const cacheKey = generateCacheKey('overtime/getByWorker', { workerId, month, year });
    const cachedData = forceRefresh ? null : getCache(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    const data = await apiCall(`/overtime/${workerId}?month=${month}&year=${year}${timestamp}`);
    setCache(cacheKey, data);
    return data;
  },
  
  // Get summary for a specific worker
  async getWorkerSummary(workerId: string, month: number, year: number): Promise<WorkerSummary> {
    const cacheKey = generateCacheKey('overtime/getWorkerSummary', { workerId, month, year });
    const cachedData = getCache(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    const data = await apiCall(`/summary/worker/${workerId}?month=${month}&year=${year}`);
    setCache(cacheKey, data);
    return data;
  },
  
  create: (data: {
    worker_id: string;
    date: string;
    entry_time: string;
    exit_time: string;
    category: 'A' | 'C';
    category_a_hours: number;
    category_c_hours: number;
    transportation: boolean;
    transportation_cost?: number;
  }) => {
    // Clear cache when creating a new entry
    clearCache('overtime/');
    return apiCall("/overtime", {
      method: "POST",
      body: data,
    });
  },

  async getMonthlySummary(month: number, year: number, options?: { forceRefresh?: boolean }): Promise<WorkerSummary[]> {
    const forceRefresh = options?.forceRefresh || false;
    const timestamp = forceRefresh ? `&_t=${Date.now()}` : '';
    
    const cacheKey = generateCacheKey('overtime/getMonthlySummary', { month, year });
    const cachedData = forceRefresh ? null : getCache(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    const data = await apiCall(`/summary/monthly?month=${month}&year=${year}${timestamp}`);
    setCache(cacheKey, data, 'MONTHLY_SUMMARY');
    return data;
  },
  
  // Update an entry (times, hours, etc.)
  update: (entryId: string, data: {
    entry_time?: string;
    exit_time?: string;
    category_a_hours?: number;
    category_c_hours?: number;
    transportation?: boolean;
    transportation_cost?: number;
    category_a_amount?: number;
    category_c_amount?: number;
    last_edited_by_name?: string;
  }) => {
    // Clear cache when updating an entry
    clearCache('overtime/');
    return apiCall(`/overtime/${entryId}`, {
      method: "PUT",
      body: data,
    });
  },
  
  // Approve an entry
  approve: (entryId: string, status?: string, userName?: string) => {
    // Clear cache when approving an entry
    clearCache('overtime/');
    return apiCall(`/overtime/${entryId}/approve`, {
      method: "PUT",
      body: { 
        status: status,
        approved_by_name: userName
      },
    });
  },
  
  // Approve all entries by director for a given month/year
  approveAllByDirector: (month: number, year: number, directorName?: string) => {
    // Clear cache when approving entries
    clearCache('overtime/');
    return apiCall(`/overtime/approve-all`, {
      method: "PUT",
      body: { 
        month,
        year,
        approved_by_name: directorName
      },
    });
  },
  
  // Reject an entry
  reject: (entryId: string, reason: string, userName?: string) => {
    // Clear cache when rejecting an entry
    clearCache('overtime/');
    return apiCall(`/overtime/${entryId}/reject`, {
      method: "PUT",
      body: { 
        reason: reason,
        rejected_by_name: userName 
      },
    });
  },

  // Update monthly amounts for a worker
  updateMonthlyAmounts: (workerId: string, month: number, year: number, data: {
    category_a_amount: number;
    category_c_amount: number;
    transportation_cost: number;
  }) => {
    // Clear cache more aggressively - clear all overtime and worker-related caches
    clearCache('overtime/'); // Clear all overtime caches
    clearCache('workers/'); // Clear all worker caches
    clearCache('summary/'); // Clear all summary caches
    clearCache(`getMonthlySummary`); // Clear monthly summary regardless of parameters
    
    return apiCall(`/summary/monthly/${workerId}`, {
      method: "PUT",
      body: {
        month,
        year,
        ...data
      },
    });
  },

  // Approve a monthly summary for a worker
  approveWorker: (workerId: string, month: number, year: number) => {
    // Clear cache when approving a worker
    clearCache('overtime/');
    return apiCall(`/summary/monthly/${workerId}/approve`, {
      method: "PUT",
      body: {
        month,
        year
      },
    });
  },

  // Add function for Director to approve all Accountant-reviewed entries for a month
  approveAllSummariesByDirector: (month: number, year: number) => {
    // Clear cache when performing bulk approval
    clearCache('overtime/'); 
    return apiCall(`/summary/monthly/approve-all-director`, {
      method: "PUT",
      body: {
        month,
        year,
      },
    });
  },

  // Delete an entry
  delete: (entryId: string) => {
    // Clear cache when deleting an entry
    clearCache('overtime/');
    return apiCall(`/overtime/${entryId}`, {
      method: "DELETE",
    });
  },
};

export const holidays = {
  getAll: async () => {
    const cacheKey = generateCacheKey('holidays/getAll', {});
    const cachedData = getCache(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    const data = await apiCall("/holidays");
    setCache(cacheKey, data, 'HOLIDAYS');
    return data;
  }
};

// Add admin object with authentication methods
export const admin = {
  signIn: (data: { email: string; password: string }) => 
    apiCall("/admin/signin", { 
      method: "POST", 
      body: data, 
      requiresAuth: false 
    }),
  
  signUp: (data: { 
    email: string; 
    password: string; 
    name: string; 
    staffId: string; 
    grade: string; 
    secretCode: string;
    role: string;
  }) => 
    apiCall("/admin/signup", { 
      method: "POST", 
      body: data, 
      requiresAuth: false 
    }),
};

// Add risk management endpoints with caching
export const risk = {
  // Get risk entries for a specific worker and period
  async getByWorker(workerId: string, month: number, year: number): Promise<RiskEntry[]> {
    const cacheKey = generateCacheKey('risk/getByWorker', { workerId, month, year });
    const cachedData = getCache(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    const data = await apiCall(`/risk/${workerId}?month=${month}&year=${year}`);
    setCache(cacheKey, data);
    return data;
  },
  
  // Get all risk entries for a specific month/year
  async getMonthly(month: number, year: number): Promise<RiskEntry[]> {
    const cacheKey = generateCacheKey('risk/getMonthly', { month, year });
    const cachedData = getCache(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    const data = await apiCall(`/risk?month=${month}&year=${year}`);
    setCache(cacheKey, data);
    return data;
  },
  
  // Get risk summary aggregated by worker for a specific month/year
  async getSummary(month: number, year: number): Promise<any[]> {
    const cacheKey = generateCacheKey('risk/getSummary', { month, year });
    const cachedData = getCache(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    const data = await apiCall(`/risk/summary?month=${month}&year=${year}`);
    setCache(cacheKey, data);
    return data;
  },
  
  // Create a new risk entry
  create: (data: {
    worker_id: string;
    date: string;
    location: string;
    size_depth: string;
    remarks?: string;
  }) => {
    // Clear cache when creating a new entry
    clearCache('risk/');
    return apiCall("/risk", {
      method: "POST",
      body: data,
    });
  },
  
  // Update a risk entry
  update: (entryId: string, data: {
    location?: string;
    size_depth?: string;
    remarks?: string;
    rate?: number; // Assuming rate might be updatable by certain roles
  }) => {
    // Clear cache when updating an entry
    clearCache('risk/');
    return apiCall(`/risk/${entryId}`, {
      method: "PUT",
      body: data,
    });
  },

  // Delete a risk entry
  delete: (entryId: string) => {
    // Clear cache when deleting an entry
    clearCache('risk/');
    return apiCall(`/risk/${entryId}`, {
      method: "DELETE",
    });
  },
  
  // Approve a risk entry (for supervisors and above)
  approve: (entryId: string) => {
    // Clear cache when approving an entry
    clearCache('risk/');
    return apiCall(`/risk/${entryId}/approve`, {
      method: "PUT",
    });
  },
  
  // Reject a risk entry (for supervisors and above)
  reject: (entryId: string, reason: string) => {
    // Clear cache when rejecting an entry
    clearCache('risk/');
    return apiCall(`/risk/${entryId}/reject`, {
      method: "PUT",
      body: { reason },
    });
  },
  
  // Get summary for a specific worker
  async getWorkerSummary(workerId: string, month: number, year: number): Promise<{ total_entries: number; total_amount: number }> {
    const cacheKey = generateCacheKey('risk/getWorkerSummary', { workerId, month, year });
    const cachedData = getCache(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    const data = await apiCall(`/risk/summary/${workerId}?month=${month}&year=${year}`);
    setCache(cacheKey, data);
    return data;
  }
};

// Clock endpoints with caching
export const Clock = {
  // Clock in with location
  clockIn: (location: { latitude: number; longitude: number }) => {
    // Validate location data
    if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
      console.error('Invalid location data provided for clock in:', location);
      return Promise.reject(new Error('Invalid location data. Location services must be enabled.'));
    }
    
    console.log('Clock in with location:', location);
    
    // Clear cache when clocking in
    clearCache('clock/');
    return apiCall("/clock/in", {
      method: "POST",
      body: location, // Pass latitude and longitude directly
    });
  },

  // Clock out with location
  clockOut: (location: { latitude: number; longitude: number }) => {
    // Validate location data
    if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
      console.error('Invalid location data provided for clock out:', location);
      return Promise.reject(new Error('Invalid location data. Location services must be enabled.'));
    }
    
    console.log('Clock out with location:', location);
    
    // Clear cache when clocking out
    clearCache('clock/');
    return apiCall("/clock/out", {
      method: "POST",
      body: location, // Pass latitude and longitude directly
    });
  },

  // Get current clock status
  async getStatus() {
    const cacheKey = generateCacheKey('clock/status', {});
    const cachedData = getCache(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    const data = await apiCall("/clock/status");
    setCache(cacheKey, data, 'STATUS');
    return data;
  },

  // Get clock history
  async getHistory() {
    const cacheKey = generateCacheKey('clock/history', {});
    const cachedData = getCache(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    const data = await apiCall("/clock/history");
    setCache(cacheKey, data);
    return data;
  }
};