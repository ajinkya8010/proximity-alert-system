import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { AuthContext } from "./AuthContext";

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
      newSocket.on("connect", () => {
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