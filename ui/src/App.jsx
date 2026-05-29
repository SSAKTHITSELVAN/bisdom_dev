import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import LandingPage from '@/components/auth/LandingPage'
import ConversationalLogin from '@/components/auth/ConversationalLogin'
import PhonePage from '@/components/auth/PhonePage'
import OTPPage from '@/components/auth/OTPPage'
import OnboardingPage from '@/components/onboarding/OnboardingPage'
import WorkspaceLayout from '@/components/workspace/WorkspaceLayout'
import WelcomeScreen from '@/components/workspace/WelcomeScreen'
import NewRequirementChat from '@/components/workspace/NewRequirementChat'
import RequirementOverview from '@/components/workspace/RequirementOverview'
import ConversationView from '@/components/workspace/ConversationView'
import ProfilePanel from '@/components/workspace/ProfileEditorFixed'
import SettingsPanel from '@/components/workspace/SettingsPanel'
import AdminLogin from '@/components/admin/AdminLogin'
import AdminLayout from '@/components/admin/AdminLayout'
import AdminDashboard from '@/components/admin/AdminDashboard'
import AdminRequirements from '@/components/admin/AdminRequirements'
import AdminUsers from '@/components/admin/AdminUsers'
import AdminMap from '@/components/admin/AdminMap'

const Protected = ({ children }) => (
  <ProtectedRoute>{children}</ProtectedRoute>
)

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{
        style:{
          background:'rgba(13,31,60,0.97)', color:'#fff',
          border:'1px solid rgba(255,255,255,0.12)',
          backdropFilter:'blur(16px)',
          fontFamily:'Montserrat,sans-serif', fontSize:'12px', fontWeight:'600', borderRadius:'10px'
        }
      }}/>
      <Routes>
        {/* Landing Page - New Default */}
        <Route path="/" element={<LandingPage/>}/>

        {/* Auth Routes */}
        <Route path="/login" element={<LandingPage/>}/>
        <Route path="/login-chat" element={<ConversationalLogin/>}/> {/* Old chatbot login */}
        <Route path="/login-old" element={<PhonePage/>}/> {/* Legacy form login */}
        <Route path="/verify-otp" element={<OTPPage/>}/>
        <Route path="/onboarding" element={
          <ProtectedRoute requireOnboarding={false}><OnboardingPage/></ProtectedRoute>
        }/>

        {/* Workspace shell wraps all app routes */}
        <Route path="/workspace" element={<Protected><WorkspaceLayout/></Protected>}>
          <Route index            element={<WelcomeScreen/>}/>
          <Route path="new"       element={<NewRequirementChat/>}/>
          <Route path="requirement/:reqId" element={<RequirementOverview/>}/>
          <Route path="chat/:leadId"       element={<ConversationView/>}/>
          <Route path="profile"   element={<ProfilePanel/>}/>
          <Route path="settings"  element={<SettingsPanel/>}/>
        </Route>

        {/* Admin routes */}
        <Route path="/admin/login" element={<AdminLogin/>}/>
        <Route path="/admin" element={<AdminLayout/>}>
          <Route index element={<Navigate to="/admin/dashboard" replace/>}/>
          <Route path="dashboard" element={<AdminDashboard/>}/>
          <Route path="requirements" element={<AdminRequirements/>}/>
          <Route path="users" element={<AdminUsers/>}/>
          <Route path="map" element={<AdminMap/>}/>
        </Route>

        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>
    </BrowserRouter>
  )
}
