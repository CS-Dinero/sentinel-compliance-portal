import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider, useAuth } from '@/lib/auth'
import { AppShell } from '@/components/AppShell'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { Audits } from '@/pages/Audits'
import { AuditDetail } from '@/pages/AuditDetail'
import { Tickets } from '@/pages/Tickets'
import { Deliverables } from '@/pages/Deliverables'

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    )
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return <AppShell>{children}</AppShell>
}

function AppContent() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/audits" 
        element={
          <ProtectedRoute>
            <Audits />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/audits/:id" 
        element={
          <ProtectedRoute>
            <AuditDetail />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/tickets" 
        element={
          <ProtectedRoute>
            <Tickets />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/deliverables" 
        element={
          <ProtectedRoute>
            <Deliverables />
          </ProtectedRoute>
        } 
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
        <Toaster position="top-right" richColors theme="dark" />
      </Router>
    </AuthProvider>
  )
}

export default App
