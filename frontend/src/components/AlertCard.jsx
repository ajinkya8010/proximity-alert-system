import React from "react";

function AlertCard({ alert, showDistance = true, onDelete = null }) {
  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const alertTime = new Date(dateString);
    const diffInMinutes = Math.floor((now - alertTime) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return alertTime.toLocaleDateString();
  };

  const getCategoryColor = (category) => {
    const colors = {
      blood_donation: "bg-red-100 text-red-800",
      jobs: "bg-blue-100 text-blue-800",
      tutoring: "bg-green-100 text-green-800",
      lost_and_found: "bg-yellow-100 text-yellow-800",
      urgent_help: "bg-red-100 text-red-800",
      food_giveaway: "bg-orange-100 text-orange-800",
      disaster_alert: "bg-purple-100 text-purple-800"
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  const getCategoryIcon = (category) => {
    const icons = {
      blood_donation: "🩸",
      jobs: "💼",
      tutoring: "📚",
      lost_and_found: "🔍",
      urgent_help: "🚨",
      food_giveaway: "🍽️",
      disaster_alert: "⚠️"
    };
    return icons[category] || "📢";
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(alert.category)}`}>
            {getCategoryIcon(alert.category)} {alert.category?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </span>
          <span className="text-sm text-gray-500">
            {formatTimeAgo(alert.createdAt)}
          </span>
        </div>
        
        {onDelete && (
          <button
            onClick={() => onDelete(alert._id)}
            className="text-gray-400 hover:text-red-600 transition-colors"
            title="Delete alert"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{alert.title}</h3>
        <p className="text-gray-600 leading-relaxed">{alert.description}</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center space-x-4">
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Nearby
          </span>
          
          {alert.createdBy?.name && (
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {alert.createdBy.name}
            </span>
          )}
        </div>
        
        <span className="text-xs">
          {new Date(alert.createdAt).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

export default AlertCard;