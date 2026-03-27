import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { setUserFromToken } = useAuthStore();

  useEffect(() => {
    const token = params.get('token');
    const role = params.get('role');
    const error = params.get('error');

    if (error) {
      navigate('/signin?error=oauth_failed');
      return;
    }

    if (token) {
      setUserFromToken(token).then(() => {
        navigate(role === 'recruiter' ? '/recruiter' : '/candidate');
      });
    } else {
      navigate('/signin');
    }
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24 }}>
      <div className="spinner" style={{ width: 48, height: 48 }} />
      <p style={{ color: 'var(--text-secondary)' }}>Completing sign in...</p>
    </div>
  );
}
