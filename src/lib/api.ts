import { Grade, WorkerDetail, WorkerSummary } from "@/types";
import { isOnline, queueOfflineRequest, getOfflineData, cacheDataForOffline } from "@/utils/offline";
import { clearAuthData } from "@/utils/auth";

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

// Cache duration in milliseconds (default 5 minutes)
const DEFAULT_CACHE_DURATION = 5 * 60 * 1000;

// Function to store data in cache
const setCache = (key: string, data: any, duration: number = DEFAULT_CACHE_DURATION): void => {
  const expiry = Date.now() + duration;
  apiCache[key] = { data, expiry };
};

// Function to get data from cache
const getCache = (key: string): any | null => {
  const cachedData = apiCache[key];
  
  if (!cachedData) return null;
  
  // Check if cache is expired
  if (Date.now() > cachedData.expiry) {
    delete apiCache[key];
    return null;
  }
  
  return cachedData.data;
};

// Function to clear cache (can be used for specific endpoint or all)
const clearCache = (keyPattern?: string): void => {
  if (keyPattern) {
    Object.keys(apiCache).forEach(key => {
      if (key.includes(keyPattern)) {
        delete apiCache[key];
      }
    });
  } else {
    Object.keys(apiCache).forEach(key => {
      delete apiCache[key];
    });
  }
};

// Update the apiCall function to handle offline mode
export async function apiCall(endpoint: string, options: ApiOptions = {}) {
  const { method = "GET", body, requiresAuth = true } = options;

  // Generate cache key for this request
  const cacheKey = generateCacheKey(endpoint, options);
  
  // Check if we're offline
  if (!isOnline()) {
    console.log(`Device is offline. Trying to fetch cached data for ${endpoint}`);
    
    // For GET requests, try to retrieve from offline cache
    if (method === "GET") {
      const cachedData = await getOfflineData(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      throw new Error("You are offline and no cached data is available");
    } else {
      // For non-GET requests (mutations), queue them for later
      await queueOfflineRequest(endpoint, options);
      throw new Error("You are offline. Your changes will be saved when you reconnect.");
    }
  }

  // Online path continues normally
  const token = localStorage.getItem("token");
  
  if (requiresAuth && !token) {
    throw new Error("Authentication required");
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (requiresAuth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
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
        throw new Error("Your session has expired. Please sign in again.");
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
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
    
    return data;
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
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

// Worker endpoints with caching
export const workers = {
  async getAll() {
    const cacheKey = generateCacheKey('workers/getAll');
    const cachedData = getCache(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    const data = await apiCall("/workers");
    setCache(cacheKey, data);
    return data;
  },
  
  create: (data: {
    name: string;
    staff_id: string;
    grade: Grade;
    default_area: string;
    transport_required: boolean;
  }) => {
    // Clear cache when creating a new worker
    clearCache('workers/');
    return apiCall("/workers", {
      method: "POST",
      body: data,
    });
  },
};

// Overtime endpoints with caching
export const overtime = {
  async getByWorker(workerId: string, month: number, year: number): Promise<WorkerDetail[]> {
    const cacheKey = generateCacheKey('overtime/getByWorker', { workerId, month, year });
    const cachedData = getCache(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    const data = await apiCall(`/overtime/${workerId}?month=${month}&year=${year}`);
    setCache(cacheKey, data);
    return data;
  },
  
  async getMonthlySummary(month: number, year: number): Promise<WorkerSummary[]> {
    const cacheKey = generateCacheKey('overtime/getMonthlySummary', { month, year });
    const cachedData = getCache(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    const data = await apiCall(`/summary/monthly?month=${month}&year=${year}`);
    setCache(cacheKey, data);
    return data;
  },
  
  create: (data: { 
    worker_id: string;
    date: string;
    entry_time: string;
    exit_time: string;
    category: "A" | "C";
    category_a_hours: number;
    category_c_hours: number;
    transportation: boolean;
    transportation_cost?: number;
  }) => {
    // Clear relevant cache entries when creating new overtime entry
    clearCache('overtime/');
    return apiCall("/overtime", {
      method: "POST",
      body: data,
    });
  },
};

export const holidays = {
  getAll: () => apiCall("/holidays"),
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
  }) => 
    apiCall("/admin/signup", { 
      method: "POST", 
      body: data, 
      requiresAuth: false 
    }),
};