import { RouterProvider, createBrowserRouter } from "react-router-dom";

import HomePage from "./routes/HomePage";
import ProfilePage from "./routes/ProfilePage";
import Login from "./routes/Login";
import Register from "./routes/Register";
import ProfileUpdatePage from "./routes/ProfileUpdatePage";
import CreateAlertPage from "./routes/CreateAlertPage";
import AlertsPage from "./routes/AlertsPage";
import { Layout, RequireAuth } from "./routes/Layout";

function App() {
  const router = createBrowserRouter([
    // Public routes
    {
      element: <Layout />,
      children: [
        { path: "/login", element: <Login /> },
        { path: "/register", element: <Register /> },
      ],
    },
    // Protected routes
    {
      element: <RequireAuth />,
      children: [
        { path: "/", element: <HomePage /> },
        { path: "/home", element: <HomePage /> }, // optional duplicate for convenience
        { path: "/profile", element: <ProfilePage /> },
        { path: "/profile/update", element: <ProfileUpdatePage /> },
        { path: "/create-alert", element: <CreateAlertPage /> },
        { path: "/alerts", element: <AlertsPage /> },
      ],
    },
  ]);

  return <RouterProvider router={router} />;
}

export default App;
