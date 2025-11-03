import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { AuthContext } from "./AuthContext";
import apiRequest from "../lib/apiRequest";

export const SocketContext = createContext();

export const SocketContextProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [alerts, setAlerts] = useState([]);

  const { currentUser } = useContext(AuthContext);

  useEffect(() => {
    if (currentUser) {
      // Create socket connection when user is logged in
      const newSocket = io(import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || "http://localhost:3001", {
        withCredentials: true,
        transports: ['websocket', 'polling']
      });

      // Connection event handlers
      newSocket.on("connect", async () => {
        console.log("🔌 Connected to server:", newSocket.id);
        setIsConnected(true);
        
        // Register user ID with socket ID on backend
        newSocket.emit("register_user", currentUser._id);
        console.log("👤 Registered user:", currentUser._id);
        
        // Subscribe to user's interest categories
        if (currentUser.interests && currentUser.interests.length > 0) {
          newSocket.emit("subscribe_categories", currentUser.interests);
          console.log("📡 Subscribed to categories:", currentUser.interests);
        }

        // Fetch existing alerts from API (nearby + subscribed categories only)
        if (currentUser.interests && currentUser.interests.length > 0) {
          try {
            const response = await apiRequest.post("/alerts/near-by-category", {
              categories: currentUser.interests
            });
            
            setAlerts(response.data.alerts || []);
            console.log("📋 Loaded exisno no ting alerts (nearby + subscribed):", response.data.alerts?.length || 0);
          } catch (error) {
            console.error("❌ Failed to fetch existing alerts:", error);
          }
        }
      });

      newSocket.on("disconnect", () => {
        console.log("🔌 Disconnected from server");
        setIsConnected(false);
      });

      // Handle incoming alerts
      newSocket.on("new_alert", (alert) => {
        console.log("🚨 New alert received:", alert);
        
        // Add to alerts state
        setAlerts(prev => [alert, ...prev]);
        
        // Show toast notification
        toast.success(
          `New ${alert.category} alert: ${alert.title}`,
          {
            duration: 5000,
            position: 'top-right',
            style: {
              background: '#10B981',
              color: 'white',
            },
            icon: '🚨',
          }
        );

        // Trigger notification bell update
        window.dispatchEvent(new CustomEvent('newNotification'));
      });

      // Handle queued alerts delivered (when user comes back online)
      newSocket.on("queued_alerts_delivered", (data) => {
        console.log("📬 Queued alerts delivered:", data);
        
        // Show ONLY summary notification for queued alerts (no individual toasts)
        toast.success(
          `${data.message} - Check your notifications 🔔`,
          {
            duration: 8000,
            position: 'top-right',
            style: {
              background: '#3B82F6',
              color: 'white',
            },
            icon: '📬',
          }
        );

        // Update notification bell count
        window.dispatchEvent(new CustomEvent('newNotification'));
      });

      // Handle connection errors
      newSocket.on("connect_error", (error) => {
        console.error("❌ Socket connection error:", error);
        toast.error("Connection failed. Retrying...");
      });

      setSocket(newSocket);

      // Cleanup on unmount or user logout
      return () => {
        console.log("🔌 Cleaning up socket connection");
        newSocket.close();
      };
    } else {
      // User logged out, disconnect socket
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
        setAlerts([]);
      }
    }
  }, [currentUser]);

  // Function to manually subscribe to categories (useful for profile updates)
  const subscribeToCategories = (categories) => {
    if (socket && categories.length > 0) {
      socket.emit("subscribe_categories", categories);
      console.log("📡 Updated category subscription:", categories);
    }
  };

  // Function to create an alert (will be used in CreateAlertPage)
  const createAlert = (alertData) => {
    if (socket) {
      socket.emit("create_alert", alertData);
    }
  };

  // Function to mark alert as read
  const markAlertAsRead = (alertId) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert._id === alertId 
          ? { ...alert, isRead: true }
          : alert
      )
    );
  };

  // Function to clear all alerts
  const clearAlerts = () => {
    setAlerts([]);
  };

  const value = {
    socket,
    isConnected,
    onlineUsers,
    alerts,
    subscribeToCategories,
    createAlert,
    markAlertAsRead,
    clearAlerts,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook to use socket context
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketContextProvider");
  }
  return context;
};