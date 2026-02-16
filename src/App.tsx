import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContextNew';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import ProjectList from './pages/projects/ProjectList';
import ProjectCreate from './pages/projects/ProjectCreate';
import ProjectDetail from './pages/projects/ProjectDetail';
import ReportEditor from './pages/projects/reports/ReportEditor';
import SystemSettings from './pages/system/SystemSettings';
import SupplierList from './pages/suppliers/SupplierList';
import TaskList from './pages/tasks/TaskList';
import TaskDetailPage from './pages/tasks/TaskDetailPage';
import TaskCreatePage from './pages/tasks/TaskCreatePage';
import AnalysisDashboard from './pages/analysis/AnalysisDashboard';
import WaterModule from './pages/water/WaterModule';
import ForumPostDetailPage from './pages/water/ForumPostDetailPage';
import FileManager from './pages/files/FileManager';
import StakeholderLayout from './pages/stakeholders/StakeholderLayout';
import ClientList from './pages/stakeholders/ClientList';
import SupplierFormPage from './pages/stakeholders/SupplierFormPage';
import ClientFormPage from './pages/stakeholders/ClientFormPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/projects" element={<ProjectList />} />
              <Route path="/projects/new" element={<ProjectCreate />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/projects/:projectId/reports/new" element={<ReportEditor />} />
              <Route path="/projects/:projectId/reports/:reportId" element={<ReportEditor />} />
              
              <Route path="/tasks" element={<TaskList />} />
              <Route path="/tasks/create" element={<TaskCreatePage />} />
              <Route path="/tasks/:id" element={<TaskDetailPage />} />
              
              {/* 相关方模块 */}
              <Route path="/stakeholders" element={<StakeholderLayout />}>
                <Route index element={<Navigate to="/stakeholders/suppliers" replace />} />
                <Route path="suppliers" element={<SupplierList />} />
                <Route path="clients" element={<ClientList />} />
              </Route>
              
              {/* 供应商新增/编辑页面 */}
              <Route path="/stakeholders/suppliers/new" element={<SupplierFormPage />} />
              <Route path="/stakeholders/suppliers/:id/edit" element={<SupplierFormPage />} />
              
              {/* 客户新增/编辑页面 */}
              <Route path="/stakeholders/clients/new" element={<ClientFormPage />} />
              <Route path="/stakeholders/clients/:id/edit" element={<ClientFormPage />} />
              
              {/* 兼容旧路由 */}
              <Route path="/suppliers" element={<Navigate to="/stakeholders/suppliers" replace />} />
              
              <Route path="/analysis" element={<AnalysisDashboard />} />
              <Route path="/water" element={<WaterModule />} />
              <Route path="/water/forum/:id" element={<ForumPostDetailPage />} />
              <Route path="/files" element={<FileManager />} />
              <Route path="/system" element={<SystemSettings />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
