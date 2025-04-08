import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { BlueprintEditor } from './components/BlueprintEditor';
import LandingPage from './components/LandingPage';
import LoginPage from './components/auth/LoginPage';
import SignupPage from './components/auth/SignupPage';
import ProjectDashboard from './components/projects/ProjectDashboard';
import RoadmapPage from './components/RoadmapPage';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen w-full bg-gray-900 text-white">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/roadmap" element={<RoadmapPage />} />
            
            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/projects" element={<ProjectDashboard />} />
              <Route path="/projects/:projectId" element={<BlueprintEditor />} />
            </Route>
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
