import { BrowserRouter, Route, Routes } from "react-router-dom";
import PrivateRoute from "./components/PrivateRoute";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import OperationsPage from "./pages/OperationsPage";
import Register from "./pages/Register";
import "./styles/dashboard.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/alarms"
          element={
            <PrivateRoute>
              <OperationsPage type="alarms" />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/incidents"
          element={
            <PrivateRoute>
              <OperationsPage type="incidents" />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/tickets"
          element={
            <PrivateRoute>
              <OperationsPage type="tickets" />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/problems"
          element={
            <PrivateRoute>
              <OperationsPage type="problems" />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
