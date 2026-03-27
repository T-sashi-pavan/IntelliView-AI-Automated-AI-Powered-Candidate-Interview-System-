import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import useAuthStore from './store/authStore';

// Pages
import LandingPage from './pages/LandingPage';
import SignIn from './pages/auth/SignIn';
import SignUp from './pages/auth/SignUp';
import ForgotPassword from './pages/auth/ForgotPassword';
import AuthCallback from './pages/auth/AuthCallback';
import RecruiterDashboard from './pages/recruiter/Dashboard';
import CreateInterview from './pages/recruiter/CreateInterview';
import CandidateManagement from './pages/recruiter/CandidateManagement';
import JobSearch from './pages/recruiter/JobSearch';
import RecruiterAnalytics from './pages/recruiter/Analytics';
import RequestNotifications from './pages/recruiter/RequestNotifications';
import InterviewHistory from './pages/recruiter/InterviewHistory';
import RecruiterSettings from './pages/recruiter/Settings';
import CandidateDashboard from './pages/candidate/Dashboard';
import ExploreInterviews from './pages/candidate/ExploreInterviews';
import MockInterview from './pages/candidate/MockInterview';
import MockRoom from './pages/candidate/MockRoom';
import AttendInterview from './pages/candidate/AttendInterview';
import InterviewRoom from './pages/candidate/InterviewRoom';
import Results from './pages/candidate/Results';
import MyResults from './pages/candidate/MyResults';
import Profile from './pages/shared/Profile';

// Guards
const PrivateRoute = ({ children, role }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/signin" replace />;
  if (role && user?.role !== role && user?.role !== 'admin') return <Navigate to="/" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated) return <Navigate to={user?.role === 'recruiter' ? '/recruiter' : '/candidate'} replace />;
  return children;
};

export default function App() {
  const { token, setUserFromToken, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (token && !isAuthenticated) { setUserFromToken(token); }
  }, []);

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/signin" element={<PublicRoute><SignIn /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Recruiter Routes */}
      <Route path="/recruiter" element={<PrivateRoute role="recruiter"><RecruiterDashboard /></PrivateRoute>} />
      <Route path="/recruiter/create-interview" element={<PrivateRoute role="recruiter"><CreateInterview /></PrivateRoute>} />
      <Route path="/recruiter/history" element={<PrivateRoute role="recruiter"><InterviewHistory /></PrivateRoute>} />
      <Route path="/recruiter/candidates" element={<PrivateRoute role="recruiter"><CandidateManagement /></PrivateRoute>} />
      <Route path="/recruiter/job-search" element={<PrivateRoute role="recruiter"><JobSearch /></PrivateRoute>} />
      <Route path="/recruiter/analytics" element={<PrivateRoute role="recruiter"><RecruiterAnalytics /></PrivateRoute>} />
      <Route path="/recruiter/requests" element={<PrivateRoute role="recruiter"><RequestNotifications /></PrivateRoute>} />
      <Route path="/recruiter/settings" element={<PrivateRoute role="recruiter"><RecruiterSettings /></PrivateRoute>} />

      {/* Candidate Routes */}
      <Route path="/candidate" element={<PrivateRoute role="candidate"><CandidateDashboard /></PrivateRoute>} />
      <Route path="/candidate/explore" element={<PrivateRoute role="candidate"><ExploreInterviews /></PrivateRoute>} />
      <Route path="/candidate/mock-interview" element={<PrivateRoute role="candidate"><MockInterview /></PrivateRoute>} />
      <Route path="/candidate/mock-room/:sessionId" element={<PrivateRoute role="candidate"><MockRoom /></PrivateRoute>} />
      <Route path="/candidate/attend" element={<PrivateRoute role="candidate"><AttendInterview /></PrivateRoute>} />
      <Route path="/candidate/interview/:sessionId" element={<PrivateRoute role="candidate"><InterviewRoom /></PrivateRoute>} />
      <Route path="/candidate/results/:sessionId" element={<PrivateRoute role="candidate"><Results /></PrivateRoute>} />
      <Route path="/candidate/my-results" element={<PrivateRoute role="candidate"><MyResults /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

      {/* Catchall */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
