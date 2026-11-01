import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { AuthProvider as IdentityAuthProvider } from '@/lib/nexus-auth';

import './index.css';

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <IdentityAuthProvider
    config={{
      issuer: import.meta.env.VITE_IDENTITY_ISSUER ?? 'http://localhost:9000',
      clientId: 'nexus-admissions-dashboard',
      redirectPath: '/admin/login',
      defaultReturnTo: '/admin/login',
    }}
    fallback={
      <div className="flex min-h-screen items-center justify-center">
        Checking your sign-in...
      </div>
    }
  >
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </IdentityAuthProvider>,
);
