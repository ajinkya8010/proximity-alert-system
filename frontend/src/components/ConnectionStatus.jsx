import React from "react";
import { useSocket } from "../context/SocketContext";

function ConnectionStatus() {
  const { isConnected } = useSocket();

  return (
    <div className="flex items-center space-x-2 text-sm">
      <div
        className={`w-2 h-2 rounded-full ${
          isConnected ? "bg-green-500" : "bg-red-500"
        }`}
      />
      <span className={isConnected ? "text-green-600" : "text-red-600"}>
        {isConnected ? "Connected" : "Disconnected"}
      </span>
    </div>
  );
}

export default ConnectionStatus;