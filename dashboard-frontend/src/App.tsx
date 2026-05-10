import { BrowserRouter, Route, Routes } from "react-router-dom";
import PrivateRoute from "./components/PrivateRoute";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import MetricsPage from "./pages/MetricsPage";
import OperationsPage from "./pages/OperationsPage";
import Register from "./pages/Register";
import "./styles/global.css";
import "./styles/layout.css";
import "./styles/components/sidebar.css";
import "./styles/components/header.css";
import "./styles/components/theme-toggle.css";
import "./styles/components/metric-card.css";
import "./styles/components/custom-select.css";
import "./styles/components/device-table.css";
import "./styles/components/operations-table.css";
import "./styles/components/fleet-status-chart.css";
import "./styles/components/operations-workload-chart.css";
import "./styles/components/metric-trend-chart.css";
import "./styles/pages/dashboard.css";
import "./styles/pages/metrics.css";
import "./styles/pages/operations.css";
import "./styles/pages/login.css";


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
          path="/dashboard/metrics"
          element={
            <PrivateRoute>
              <MetricsPage />
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
