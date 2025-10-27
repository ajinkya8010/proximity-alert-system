import React, { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import { AuthContext } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import "leaflet/dist/leaflet.css";

// Fix for default markers in react-leaflet
import L from "leaflet";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function HomePage() {
  const { currentUser } = useContext(AuthContext);
  const { alerts, isConnected } = useSocket();
  const [mapCenter, setMapCenter] = useState([51.505, -0.09]); // Default to London
  const [mapZoom, setMapZoom] = useState(13);


  // Set map center to user's location with appropriate zoom
  useEffect(() => {
    if (currentUser?.location?.coordinates) {
      const [lng, lat] = currentUser.location.coordinates;
      setMapCenter([lat, lng]);
      // Set zoom based on alert radius - smaller radius = higher zoom
      const radiusKm = currentUser.alertRadius / 1000;
      let zoom = 13; // default
      if (radiusKm <= 1) zoom = 15;
      else if (radiusKm <= 3) zoom = 14;
      else if (radiusKm <= 5) zoom = 13;
      else if (radiusKm <= 10) zoom = 12;
      else zoom = 11;
      setMapZoom(zoom);
    }
  }, [currentUser]);

  // Get recent alerts (last 5)
  const recentAlerts = alerts.slice(0, 5);

  // Show loading if user location not available
  if (!currentUser?.location?.coordinates) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your location...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Map Section */}
      <div className="h-96 relative mx-4 sm:mx-6 lg:mx-8 mt-4 rounded-lg overflow-hidden shadow-lg">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: "100%", width: "100%" }}
          className="z-0"
          key={`${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`} // Force re-render when center/zoom changes
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* User Location Marker */}
          {currentUser?.location?.coordinates && (
            <>
              <Marker position={mapCenter}>
                <Popup>
                  <div className="text-center">
                    <strong>Your Location</strong>
                    <br />
                    {currentUser.name}
                  </div>
                </Popup>
              </Marker>
              
              {/* Alert Radius Circle */}
              <Circle
                center={mapCenter}
                radius={currentUser.alertRadius}
                pathOptions={{
                  color: "blue",
                  fillColor: "blue",
                  fillOpacity: 0.1,
                  weight: 2,
                }}
              />
            </>
          )}

          {/* Alert Markers */}
          {alerts.map((alert, index) => {
            if (alert.location?.coordinates) {
              const [lng, lat] = alert.location.coordinates;
              return (
                <Marker key={alert._id || index} position={[lat, lng]}>
                  <Popup>
                    <div>
                      <strong>{alert.title}</strong>
                      <br />
                      <span className="text-sm text-gray-600">{alert.category}</span>
                      <br />
                      <p className="text-sm mt-1">{alert.description}</p>
                    </div>
                  </Popup>
                </Marker>
              );
            }
            return null;
          })}
        </MapContainer>

        {/* Map Overlay Info */}
        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 z-10 border">
          <h3 className="font-semibold text-gray-900 mb-2">Your Alert Zone</h3>
          <div className="space-y-1 text-sm text-gray-600">
            <p>Radius: {(currentUser?.alertRadius / 1000).toFixed(1)}km</p>
            <p>Active Alerts: {alerts.length}</p>
            <div className="flex items-center space-x-2 mt-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
              <span className={`text-xs font-medium ${isConnected ? "text-green-600" : "text-red-600"}`}>
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {currentUser?.name}!
          </h1>
          <p className="text-gray-600 mt-1">
            Stay connected to alerts in your area
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-12" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Alerts</p>
                <p className="text-2xl font-bold text-gray-900">{alerts.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Alert Radius</p>
                <p className="text-2xl font-bold text-gray-900">{(currentUser?.alertRadius / 1000).toFixed(1)}km</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Interests</p>
                <p className="text-2xl font-bold text-gray-900">{currentUser?.interests?.length || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link
            to="/create-alert"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-6 transition-colors"
          >
            <div className="flex items-center">
              <svg className="w-8 h-8 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold">Create Alert</h3>
                <p className="text-blue-100">Share an alert with your community</p>
              </div>
            </div>
          </Link>

          <Link
            to="/alerts"
            className="bg-green-600 hover:bg-green-700 text-white rounded-lg p-6 transition-colors"
          >
            <div className="flex items-center">
              <svg className="w-8 h-8 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-12" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold">View Alerts</h3>
                <p className="text-green-100">See all alerts in your area</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Alerts */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Recent Alerts</h2>
              {alerts.length > 5 && (
                <Link to="/alerts" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  View all
                </Link>
              )}
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {recentAlerts.length > 0 ? (
              recentAlerts.map((alert, index) => (
                <div key={alert._id || index} className="px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {alert.category?.replace('_', ' ') || 'General'}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(alert.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 mt-1">
                        {alert.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {alert.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-12" />
                </svg>
                <p className="text-gray-500">No alerts yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  {isConnected ? "You'll see alerts here when they arrive" : "Connect to start receiving alerts"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* User Interests */}
        {currentUser?.interests && currentUser.interests.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Interests</h3>
            <div className="flex flex-wrap gap-2">
              {currentUser.interests.map((interest) => (
                <span
                  key={interest}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
                >
                  {interest.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default HomePage;