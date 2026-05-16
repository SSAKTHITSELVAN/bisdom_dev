import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import PhonePage from '@/components/auth/PhonePage'
import OTPPage from '@/components/auth/OTPPage'
import OnboardingPage from '@/components/onboarding/OnboardingPage'
import WorkspaceLayout from '@/components/workspace/WorkspaceLayout'
import WelcomeScreen from '@/components/workspace/WelcomeScreen'
import NewRequirementChat from '@/components/workspace/NewRequirementChat'
import RequirementOverview from '@/components/workspace/RequirementOverview'
import ConversationView from '@/components/workspace/ConversationView'
import ProfilePanel from '@/components/workspace/ProfilePanel'
import SettingsPanel from '@/components/workspace/SettingsPanel'

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
        {/* Auth */}
        <Route path="/login"      element={<PhonePage/>}/>
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

        <Route path="/"   element={<Navigate to="/workspace" replace/>}/>
        <Route path="*"   element={<Navigate to="/workspace" replace/>}/>
      </Routes>
    </BrowserRouter>
  )
}
