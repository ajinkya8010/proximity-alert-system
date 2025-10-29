import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import apiRequest from "../lib/apiRequest";
import toast from "react-hot-toast";

function CreateAlertPage() {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
    useCurrentLocation: true,
    customLocation: {
      latitude: "",
      longitude: ""
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState("idle"); // idle, loading, success, error

  const categories = [
    { value: "blood_donation", label: "Blood Donation", icon: "🩸", description: "Blood donation drives and requests" },
    { value: "jobs", label: "Jobs", icon: "💼", description: "Job opportunities and hiring" },
    { value: "tutoring", label: "Tutoring", icon: "📚", description: "Educational support and tutoring" },
    { value: "lost_and_found", label: "Lost & Found", icon: "🔍", description: "Lost items and found items" },
    { value: "urgent_help", label: "Urgent Help", icon: "🚨", description: "Emergency assistance needed" },
    { value: "food_giveaway", label: "Food Giveaway", icon: "🍽️", description: "Free food distribution" },
    { value: "disaster_alert", label: "Disaster Alert", icon: "⚠️", description: "Natural disaster warnings" }
  ];

  // Auto-detect current location on component mount
  useEffect(() => {
    if (formData.useCurrentLocation && currentUser?.location?.coordinates) {
      // Use user's profile location as default
      const [lng, lat] = currentUser.location.coordinates;
      setFormData(prev => ({
        ...prev,
        customLocation: {
          latitude: lat.toString(),
          longitude: lng.toString()
        }
      }));
      setLocationStatus("success");
    }
  }, [currentUser, formData.useCurrentLocation]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLocationToggle = (useCurrentLocation) => {
    setFormData(prev => ({
      ...prev,
      useCurrentLocation,
      customLocation: useCurrentLocation ? prev.customLocation : { latitude: "", longitude: "" }
    }));
    
    if (useCurrentLocation) {
      getCurrentLocation();
    } else {
      setLocationStatus("idle");
    }
  };

  const getCurrentLocation = () => {
    setLocationStatus("loading");
    
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by this browser");
      setLocationStatus("error");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({
          ...prev,
          customLocation: {
            latitude: latitude.toString(),
            longitude: longitude.toString()
          }
        }));
        setLocationStatus("success");
        toast.success("Location detected successfully!");
      },
      (error) => {
        console.error("Error getting location:", error);
        toast.error("Failed to get location. Please enter manually.");
        setLocationStatus("error");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const handleCustomLocationChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      customLocation: {
        ...prev.customLocation,
        [name]: value
      }
    }));
  };



  const validateForm = () => {
    if (!formData.title.trim()) {
      toast.error("Please enter a title");
      return false;
    }
    if (!formData.category) {
      toast.error("Please select a category");
      return false;
    }
    if (!formData.description.trim()) {
      toast.error("Please enter a description");
      return false;
    }
    
    const lat = parseFloat(formData.customLocation.latitude);
    const lng = parseFloat(formData.customLocation.longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      toast.error("Please provide valid location coordinates");
      return false;
    }
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error("Please provide valid latitude (-90 to 90) and longitude (-180 to 180)");
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const alertData = {
        title: formData.title.trim(),
        category: formData.category,
        description: formData.description.trim(),
        location: {
          type: "Point",
          coordinates: [
            parseFloat(formData.customLocation.longitude),
            parseFloat(formData.customLocation.latitude)
          ]
        }
      };

      await apiRequest.post("/alerts", alertData);
      
      toast.success("Alert created successfully!");
      
      // Navigate to alerts page to see the created alert
      navigate("/alerts");
      
    } catch (error) {
      console.error("Failed to create alert:", error);
      toast.error(error.response?.data?.message || "Failed to create alert");
    } finally {
      setIsLoading(false);
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Alert</h1>
          <p className="text-gray-600 mt-1">Share important information with your community</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Alert Details</h2>
                
                {/* Title */}
                <div className="mb-6">
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Alert Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    maxLength={100}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter a clear, descriptive title"
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.title.length}/100 characters</p>
                </div>

                {/* Category */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Category *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {categories.map((category) => (
                      <label
                        key={category.value}
                        className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          formData.category === category.value
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="category"
                          value={category.value}
                          checked={formData.category === category.value}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <div className="flex-1">
                          <div className="flex items-center mb-1">
                            <span className="text-lg mr-2">{category.icon}</span>
                            <span className="font-medium text-gray-900">{category.label}</span>
                          </div>
                          <p className="text-xs text-gray-600">{category.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows={4}
                    maxLength={500}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                    placeholder="Provide detailed information about your alert..."
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.description.length}/500 characters</p>
                </div>
              </div>

              {/* Location */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Location</h2>
                
                {/* Location Options */}
                <div className="mb-4">
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={formData.useCurrentLocation}
                        onChange={() => handleLocationToggle(true)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Use current location</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={!formData.useCurrentLocation}
                        onChange={() => handleLocationToggle(false)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Enter custom location</span>
                    </label>
                  </div>
                </div>

                {/* Current Location */}
                {formData.useCurrentLocation && (
                  <div className="mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                        {locationStatus === "success" ? (
                          <div className="text-gray-900">
                            <p className="font-medium">📍 Location Ready</p>
                            <p className="text-sm text-gray-600">
                              Lat: {parseFloat(formData.customLocation.latitude).toFixed(4)}, 
                              Lng: {parseFloat(formData.customLocation.longitude).toFixed(4)}
                            </p>
                          </div>
                        ) : (
                          <p className="text-gray-500">Click to detect your location</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={getCurrentLocation}
                        disabled={locationStatus === "loading"}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
                      >
                        {locationStatus === "loading" ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Detecting...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Detect Location
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Google Maps Coordinates */}
                {!formData.useCurrentLocation && (
                  <div className="space-y-4">
                    {/* Selected Location Display */}
                    {formData.customLocation.latitude && formData.customLocation.longitude && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-green-900">Location Set</p>
                            <p className="text-xs text-green-700">
                              Lat: {parseFloat(formData.customLocation.latitude).toFixed(4)}, 
                              Lng: {parseFloat(formData.customLocation.longitude).toFixed(4)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Manual Coordinates */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-700">Enter coordinates from Google Maps</h4>
                        <button
                          type="button"
                          onClick={() => window.open('https://www.google.com/maps', '_blank')}
                          className="inline-flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Open Google Maps
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="latitude" className="block text-sm font-medium text-gray-700 mb-1">
                            Latitude *
                          </label>
                          <input
                            type="number"
                            id="latitude"
                            name="latitude"
                            value={formData.customLocation.latitude}
                            onChange={handleCustomLocationChange}
                            step="any"
                            min="-90"
                            max="90"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="e.g., 40.7128"
                          />
                        </div>
                        <div>
                          <label htmlFor="longitude" className="block text-sm font-medium text-gray-700 mb-1">
                            Longitude *
                          </label>
                          <input
                            type="number"
                            id="longitude"
                            name="longitude"
                            value={formData.customLocation.longitude}
                            onChange={handleCustomLocationChange}
                            step="any"
                            min="-180"
                            max="180"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="e.g., -74.0060"
                          />
                        </div>
                      </div>
                      <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h5 className="text-sm font-semibold text-blue-900 mb-2">📍 How to get coordinates from Google Maps:</h5>
                        <ol className="text-xs text-blue-800 space-y-1">
                          <li><strong>Method 1:</strong> Right-click on any location → Click coordinates to copy</li>
                          <li><strong>Method 2:</strong> Search for a place → Click on it → Coordinates show at bottom</li>
                          <li><strong>Method 3:</strong> Drop a pin → Click the pin → Coordinates appear in popup</li>
                        </ol>
                        <p className="text-xs text-blue-700 mt-2 font-medium">
                          💡 Tip: Coordinates look like "40.7128, -74.0060" - just copy and paste each number!
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Submit Actions */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Publish Alert</h3>
                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors font-medium"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating Alert...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Create Alert
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/alerts")}
                    className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Preview */}
              {formData.title && formData.category && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {categories.find(c => c.value === formData.category)?.icon} {categories.find(c => c.value === formData.category)?.label}
                      </span>
                      <span className="text-xs text-gray-500">Just now</span>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-1">{formData.title}</h4>
                    {formData.description && (
                      <p className="text-sm text-gray-600">{formData.description}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Tips */}
              <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">💡 Tips</h3>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li>• Use clear, descriptive titles</li>
                  <li>• Choose the most relevant category</li>
                  <li>• Provide specific details in description</li>
                  <li>• Double-check your location</li>
                  <li>• Alerts are sent to nearby users instantly</li>
                </ul>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateAlertPage;