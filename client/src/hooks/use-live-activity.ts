import { useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface LiveActivityMessage {
  type: string;
  data?: any;
  message?: string;
  timestamp: string;
  id?: string;
}

export interface LiveActivity {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  data?: any;
}

const STORAGE_KEY = 'sagshub_live_activities';

export function useLiveActivity() {
  const [activities, setActivities] = useState<LiveActivity[]>(() => {
    // Indlæs aktiviteter fra localStorage ved start
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const processedMessagesRef = useRef<Set<string>>(new Set());
  const queryClient = useQueryClient();

  // Gem aktiviteter i localStorage når de ændres
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
    } catch (error) {
      console.error('Failed to save activities to localStorage:', error);
    }
  }, [activities]);

  const connect = useCallback(() => {
    // Luk eksisterende forbindelse hvis den findes
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      console.log('Closing existing WebSocket connection');
      wsRef.current.close();
    }

    // Ryd eksisterende reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // WebSocket serveren kører på port 3000, ikke samme port som frontend
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const wsUrl = `${protocol}//${host}:3000`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    
    const websocket = new WebSocket(wsUrl);
    wsRef.current = websocket;
    
    websocket.onopen = () => {
      console.log('WebSocket connected successfully');
      setIsConnected(true);
    };
    
    websocket.onmessage = (event) => {
      try {
        const message: LiveActivityMessage = JSON.parse(event.data);
        console.log('Live activity received:', message);
        
        // Håndter forskellige typer meddelelser
        if (message.type === 'connection') {
          // Forbindelsesbekræftelse - ignorer
          return;
        }
        
        if (message.type === 'historical_activity') {
          // Historisk aktivitet - tilføj til enden (ældste først)
          const activity: LiveActivity = {
            id: message.id || `${Date.now()}-${Math.random()}`,
            type: message.type,
            message: message.message || 'Live opdatering',
            timestamp: message.timestamp,
            data: message.data
          };
          
          setActivities(prev => {
            // Tjek om vi allerede har denne aktivitet
            const exists = prev.some(existing => existing.id === activity.id);
            if (exists) {
              return prev;
            }
            
            // Tilføj historisk aktivitet til enden og sorter efter timestamp
            const newActivities = [...prev, activity];
            newActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            return newActivities.slice(0, 50); // Hold max 50 aktiviteter
          });
          return;
        }
        
        // Normale live opdateringer
        if (message.type !== 'connection') {
          // Opret unik nøgle for meddelelsen
          const messageKey = `${message.type}-${message.message}-${message.timestamp}`;
          
          // Tjek om vi allerede har behandlet denne meddelelse
          if (processedMessagesRef.current.has(messageKey)) {
            console.log('Duplicate message ignored (already processed):', message.message);
            return;
          }
          
          // Tilføj til processede meddelelser
          processedMessagesRef.current.add(messageKey);
          
          // Ryd gamle processede meddelelser (hold kun de sidste 100)
          if (processedMessagesRef.current.size > 100) {
            const entries = Array.from(processedMessagesRef.current);
            processedMessagesRef.current = new Set(entries.slice(-50));
          }
          
          const activity: LiveActivity = {
            id: `${Date.now()}-${Math.random()}`,
            type: message.type,
            message: message.message || 'Live opdatering',
            timestamp: message.timestamp,
            data: message.data
          };
          
          setActivities(prev => {
            // Ekstra tjek for duplicates baseret på message og timestamp
            const now = new Date(activity.timestamp).getTime();
            const isDuplicate = prev.some(existing => {
              const existingTime = new Date(existing.timestamp).getTime();
              const timeDiff = Math.abs(now - existingTime);
              return existing.message === activity.message && timeDiff < 5000; // 5 sekunder tolerance
            });
            
            if (isDuplicate) {
              console.log('Duplicate activity ignored (time-based check):', activity.message);
              return prev;
            }
            
            console.log('Adding new activity:', activity.message);
            const newActivities = [activity, ...prev.slice(0, 49)]; // Hold max 50 aktiviteter
            return newActivities;
          });
        }
        
        // Invalidér relevante queries for at opdatere data
        switch (message.type) {
          case 'case_created':
          case 'case_updated':
          case 'case_status_updated':
          case 'case_deleted':
          case 'historical_activity':
            queryClient.invalidateQueries({ queryKey: ['cases'] });
            queryClient.invalidateQueries({ queryKey: ['case-status-counts'] });
            queryClient.invalidateQueries({ queryKey: ['alarm-count'] });
            break;
          case 'customer_created':
          case 'customer_updated':
          case 'customer_deleted':
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            break;
          case 'order_created':
          case 'order_updated':
          case 'order_deleted':
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      
      // Kun genopret forbindelse hvis det er den aktuelle websocket
      if (wsRef.current === websocket) {
        wsRef.current = null;
        
        // Genopret forbindelse efter 3 sekunder
        console.log('Scheduling reconnect in 3 seconds...');
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      }
    };
    
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
    
    return websocket;
  }, [queryClient]);

  useEffect(() => {
    // Kun opret forbindelse hvis der ikke allerede er en aktiv forbindelse
    if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
      connect();
    }
    
    return () => {
      // Cleanup ved unmount
      console.log('Cleaning up WebSocket connection');
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, []); // Tom dependency array for at kun køre en gang

  const clearActivities = useCallback(() => {
    setActivities([]);
    processedMessagesRef.current.clear();
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    activities,
    isConnected,
    clearActivities
  };
} 