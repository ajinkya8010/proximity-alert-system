import React, { useContext, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import apiRequest from "../lib/apiRequest";
import toast from "react-hot-toast";

function ProfileUpdatePage() {
  const { currentUser, updateUser } = useContext(AuthContext);
  const { subscribeToCategories } = useSocket();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    alertRadius: 3000,
    interests: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState("idle"); // idle, loading, success, error

  const availableInterests = [
    { value: "blood_donation", label: "Blood Donation" },
    { value: "jobs", label: "Jobs" },
    { value: "tutoring", label: "Tutoring" },
    { value: "lost_and_found", label: "Lost & Found" },
    { value: "urgent_help", label: "Urgent Help" },
    { value: "food_giveaway", label: "Food Giveaway" },
    { value: "disaster_alert", label: "Disaster Alert" }
  ];

  // Initialize form with current user data
  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || "",
        email: currentUser.email || "",
        alertRadius: currentUser.alertRadius || 3000,
        interests: currentUser.interests || []
      });
    }
  }, [currentUser]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleInterestToggle = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
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
          location: {
            type: "Point",
            coordinates: [longitude, latitude]
          }
        }));
        setLocationStatus("success");
        toast.success("Location updated successfully!");
      },
      (error) => {
        console.error("Error getting location:", error);
        toast.error("Failed to get location. Please try again.");
        setLocationStatus("error");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const updateData = {
        name: formData.name,
        alertRadius: parseInt(formData.alertRadius),
        interests: formData.interests
      };

      // Add location if it was updated
      if (formData.location) {
        updateData.location = formData.location;
      }

      const response = await apiRequest.patch("/user/update", updateData);
      
      // Update the context with new user data
      updateUser(response.data.user);
      
      // Update socket subscriptions if interests changed
      if (formData.interests.length > 0) {
        subscribeToCategories(formData.interests);
      }

      toast.success("Profile updated successfully!");
      navigate("/profile");
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <Link
              to="/profile"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Profile
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Update Profile</h1>
          <p className="text-gray-600 mt-1">Update your account information and preferences</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                      placeholder="Email cannot be changed"
                    />
                  </div>

                </div>
              </div>

              {/* Location & Alert Settings */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Location & Alert Settings</h2>
                <div className="space-y-6">
                  {/* Current Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Location</label>
                    <div className="flex items-center space-x-4">
                      <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                        {currentUser.location?.coordinates ? (
                          <div className="text-gray-900">
                            <p className="font-medium">📍 Location Set</p>
                            <p className="text-sm text-gray-600">
                              Lat: {currentUser.location.coordinates[1].toFixed(4)}, 
                              Lng: {currentUser.location.coordinates[0].toFixed(4)}
                            </p>
                          </div>
                        ) : (
                          <p className="text-gray-500">Location not set</p>
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
                            Getting...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Update Location
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Alert Radius */}
                  <div>
                    <label htmlFor="alertRadius" className="block text-sm font-medium text-gray-700 mb-2">
                      Alert Radius: {(formData.alertRadius / 1000).toFixed(1)} km
                    </label>
                    <input
                      type="range"
                      id="alertRadius"
                      name="alertRadius"
                      min="1000"
                      max="10000"
                      step="1000"
                      value={formData.alertRadius}
                      onChange={handleInputChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>1 km</span>
                      <span>5 km</span>
                      <span>10 km</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interests */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Alert Interests</h2>
                <p className="text-gray-600 mb-4">Select the types of alerts you want to receive</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableInterests.map((interest) => (
                    <label
                      key={interest.value}
                      className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={formData.interests.includes(interest.value)}
                        onChange={() => handleInterestToggle(interest.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-3 text-gray-900">{interest.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Save Actions */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Save Changes</h3>
                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Update Profile
                      </>
                    )}
                  </button>
                  <Link
                    to="/profile"
                    className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </Link>
                </div>
              </div>

              {/* Help */}
              <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">💡 Tips</h3>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li>• Update your location to receive nearby alerts</li>
                  <li>• Adjust alert radius based on your mobility</li>
                  <li>• Select interests to filter relevant alerts</li>
                  <li>• Save changes to update your alert preferences</li>
                </ul>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProfileUpdatePage;