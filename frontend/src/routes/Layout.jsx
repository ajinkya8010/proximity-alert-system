// import Navbar from "../../components/navbar/Navbar";
import { Navigate, Outlet } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

function Layout() {
  return (
    <div
      className="
        min-h-screen 
        max-w-[1366px] 
        mx-auto 
        px-5 
        flex flex-col
        lg:max-w-[1280px]
        md:max-w-[768px]
        sm:max-w-[640px]
      "
    >
      {/* <div className="navbar">
        <Navbar />
      </div> */}
      <div className="content flex-1 h-[calc(100vh-100px)] overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}

function RequireAuth() {
  const { currentUser } = useContext(AuthContext);
  if (!currentUser) return <Navigate to="/login" replace />;

  return (
    <div
      className="
        min-h-screen 
        max-w-[1366px] 
        mx-auto 
        px-5 
        flex flex-col
        lg:max-w-[1280px]
        md:max-w-[768px]
        sm:max-w-[640px]
      "
    >
      {/* <div className="navbar">
        <Navbar />
      </div> */}
      <div className="content flex-1 h-[calc(100vh-100px)] overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}

export { Layout, RequireAuth };
