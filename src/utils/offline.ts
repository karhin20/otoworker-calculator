/**
 * Utility for offline support and caching
 */

// Check if the app is online
export const isOnline = (): boolean => {
  return navigator.onLine;
};

// Listen for online status changes
export const setupOfflineListeners = (
  onOffline: () => void, 
  onOnline: () => void
): () => void => {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
};

// Cache data in IndexedDB for offline use
export const cacheDataForOffline = async <T>(key: string, data: T): Promise<void> => {
  try {
    const request = indexedDB.open('otoworker-db', 1);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('offlineCache')) {
        db.createObjectStore('offlineCache');
      }
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['offlineCache'], 'readwrite');
      const objectStore = transaction.objectStore('offlineCache');
      objectStore.put(data, key);
    };
  } catch (error) {
    console.error('Failed to cache data for offline use:', error);
  }
};

// Retrieve cached data
export const getOfflineData = async <T>(key: string): Promise<T | null> => {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('otoworker-db', 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('offlineCache')) {
          db.createObjectStore('offlineCache');
        }
      };
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['offlineCache'], 'readonly');
        const objectStore = transaction.objectStore('offlineCache');
        const dataRequest = objectStore.get(key);
        
        dataRequest.onsuccess = () => {
          resolve(dataRequest.result as T || null);
        };
        
        dataRequest.onerror = () => {
          resolve(null);
        };
      };
      
      request.onerror = () => {
        resolve(null);
      };
    } catch (error) {
      console.error('Failed to retrieve cached data:', error);
      resolve(null);
    }
  });
};

// Queue up API requests when offline
export const queueOfflineRequest = async (
  endpoint: string, 
  options: Record<string, any>
): Promise<void> => {
  const offlineQueue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
  offlineQueue.push({ endpoint, options, timestamp: Date.now() });
  localStorage.setItem('offlineQueue', JSON.stringify(offlineQueue));
};

// Process queued requests when coming back online
export const processOfflineQueue = async (
  processRequest: (endpoint: string, options: Record<string, any>) => Promise<any>
): Promise<void> => {
  const offlineQueue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
  
  if (offlineQueue.length === 0) return;
  
  // Process each request
  const newQueue = [...offlineQueue];
  
  for (let i = 0; i < offlineQueue.length; i++) {
    const { endpoint, options } = offlineQueue[i];
    
    try {
      await processRequest(endpoint, options);
      // Remove from queue if successful
      newQueue.splice(newQueue.findIndex(item => 
        item.endpoint === endpoint && 
        item.timestamp === offlineQueue[i].timestamp
      ), 1);
    } catch (error) {
      console.error(`Failed to process offline request for ${endpoint}:`, error);
      // Leave in queue for retry
    }
  }
  
  // Update queue with remaining items
  localStorage.setItem('offlineQueue', JSON.stringify(newQueue));
}; 