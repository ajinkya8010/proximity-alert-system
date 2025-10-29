import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import AlertCard from "../components/AlertCard";
import apiRequest from "../lib/apiRequest";
import toast from "react-hot-toast";

function AlertsPage() {
  const { currentUser } = useContext(AuthContext);
  const { alerts: socketAlerts } = useSocket();
  
  const [activeTab, setActiveTab] = useState("all"); // "all" or "my"
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Dynamic categories based on user interests and active tab
  const getAvailableCategories = () => {
    if (activeTab === "all") {
      // For nearby alerts, only show user's interests
      const userCategories = currentUser?.interests || [];
      return [
        { value: "", label: "All My Interests" },
        ...userCategories.map(cat => ({
          value: cat,
          label: cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
        }))
      ];
    } else {
      // For created alerts, show all categories
      return [
        { value: "", label: "All Categories" },
        { value: "blood_donation", label: "Blood Donation" },
        { value: "jobs", label: "Jobs" },
        { value: "tutoring", label: "Tutoring" },
        { value: "lost_and_found", label: "Lost & Found" },
        { value: "urgent_help", label: "Urgent Help" },
        { value: "food_giveaway", label: "Food Giveaway" },
        { value: "disaster_alert", label: "Disaster Alert" }
      ];
    }
  };

  // Fetch alerts based on active tab
  const fetchAlerts = async (page = 1, reset = false) => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      let response;
      
      if (activeTab === "all") {
        // Fetch nearby alerts with user's interests
        if (currentUser.interests && currentUser.interests.length > 0) {
          response = await apiRequest.post(`/alerts/near-by-category?page=${page}&limit=${pagination.limit}`, {
            categories: currentUser.interests
          });
        } else {
          // If no interests, show empty state
          setAlerts([]);
          setPagination(prev => ({ ...prev, total: 0, totalPages: 0 }));
          setLoading(false);
          return;
        }
      } else {
        // Fetch user's created alerts
        response = await apiRequest.get(`/alerts/my-alerts?page=${page}&limit=${pagination.limit}`);
      }

      const newAlerts = response.data.alerts || [];
      
      if (reset || page === 1) {
        setAlerts(newAlerts);
      } else {
        setAlerts(prev => [...prev, ...newAlerts]);
      }
      
      setPagination(response.data.pagination || {});
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
      toast.error("Failed to load alerts");
    } finally {
      setLoading(false);
    }
  };

  // Load alerts when tab changes or component mounts
  useEffect(() => {
    fetchAlerts(1, true);
  }, [activeTab, currentUser]);

  // For "all" tab, use socket alerts if available (real-time updates)
  useEffect(() => {
    if (activeTab === "all" && socketAlerts.length > 0) {
      setAlerts(socketAlerts);
    }
  }, [socketAlerts, activeTab]);

  // Filter alerts based on search and category
  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = !searchTerm || 
      alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || alert.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Handle delete alert
  const handleDeleteAlert = async (alertId) => {
    if (!window.confirm("Are you sure you want to delete this alert?")) return;
    
    try {
      await apiRequest.delete(`/alerts/${alertId}`);
      setAlerts(prev => prev.filter(alert => alert._id !== alertId));
      toast.success("Alert deleted successfully");
    } catch (error) {
      console.error("Failed to delete alert:", error);
      toast.error("Failed to delete alert");
    }
  };

  // Load more alerts (pagination)
  const loadMore = () => {
    if (pagination.hasNext && !loading) {
      fetchAlerts(pagination.page + 1, false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Alerts</h1>
          <p className="text-gray-600 mt-1">Stay updated with community alerts</p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("all")}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "all"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Nearby Alerts
                {activeTab === "all" && (
                  <span className="ml-2 bg-blue-100 text-blue-600 py-0.5 px-2 rounded-full text-xs">
                    {filteredAlerts.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("my")}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "my"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Created by Me
                {activeTab === "my" && (
                  <span className="ml-2 bg-blue-100 text-blue-600 py-0.5 px-2 rounded-full text-xs">
                    {filteredAlerts.length}
                  </span>
                )}
              </button>
            </nav>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search Alerts
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by title or description..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Category
              </label>
              <select
                id="category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {getAvailableCategories().map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">
          {loading && alerts.length === 0 ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading alerts...</p>
            </div>
          ) : filteredAlerts.length > 0 ? (
            <>
              {filteredAlerts.map((alert) => (
                <AlertCard
                  key={alert._id}
                  alert={alert}
                  onDelete={activeTab === "my" ? handleDeleteAlert : null}
                />
              ))}
              
              {/* Load More Button */}
              {pagination.hasNext && (
                <div className="text-center py-6">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Loading...
                      </>
                    ) : (
                      <>
                        Load More
                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-12" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {activeTab === "all" ? "No nearby alerts found" : "No alerts created yet"}
              </h3>
              <p className="text-gray-600 mb-4">
                {activeTab === "all" 
                  ? currentUser.interests?.length > 0 
                    ? `No alerts matching your interests within ${(currentUser.alertRadius / 1000).toFixed(1)}km radius`
                    : "Add interests in your profile to see relevant nearby alerts"
                  : "You haven't created any alerts yet"
                }
              </p>
              {activeTab === "my" && (
                <button
                  onClick={() => window.location.href = "/create-alert"}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Your First Alert
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AlertsPage;