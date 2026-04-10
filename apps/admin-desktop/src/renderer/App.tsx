import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ProjectNewPage } from "./pages/ProjectNewPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { ProjectPackagesPage } from "./pages/ProjectPackagesPage";
import { VendorsPage } from "./pages/VendorsPage";
import { VendorDetailPage } from "./pages/VendorDetailPage";
import { AgentMonitorPage } from "./pages/AgentMonitorPage";
import { FolderSettingsPage } from "./pages/FolderSettingsPage";
import { QuoteReviewPage } from "./pages/QuoteReviewPage";
import { SettlementsPage } from "./pages/SettlementsPage";
import { SettlementDetailPage } from "./pages/SettlementDetailPage";
import { SettlementCalendarPage } from "./pages/SettlementCalendarPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";

export function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/new" element={<ProjectNewPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/projects/:id/packages" element={<ProjectPackagesPage />} />
          <Route path="/vendors" element={<VendorsPage />} />
          <Route path="/vendors/:id" element={<VendorDetailPage />} />
          <Route path="/bid-requests" element={<Navigate to="/" replace />} />
          <Route path="/agent-monitor" element={<AgentMonitorPage />} />
          <Route path="/settings/folder" element={<FolderSettingsPage />} />
          <Route path="/quotes/:id/review" element={<QuoteReviewPage />} />
          <Route path="/settlements" element={<SettlementsPage />} />
          <Route path="/settlements/calendar" element={<SettlementCalendarPage />} />
          <Route path="/settlements/:id" element={<SettlementDetailPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
