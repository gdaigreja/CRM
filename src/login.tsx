import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import Login from './shared/components/Login';
import './projects/distrato/index.css';

const MainLogin = () => {
  useEffect(() => {
    // Check if already authenticated and redirect
    const token = localStorage.getItem('token');
    const userString = localStorage.getItem('user');
    
    if (token && userString) {
      const userData = JSON.parse(userString);
      if (userData.project === 'resolve') {
        window.location.href = '/resolve';
      } else {
        window.location.href = '/distrato';
      }
    }
  }, []);

  const handleLogin = (token: string, userData: any) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    
    if (userData.project === 'resolve') {
      window.location.href = '/resolve';
    } else {
      window.location.href = '/distrato';
    }
  };

  return <Login onLogin={handleLogin} />;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MainLogin />
  </StrictMode>
);
