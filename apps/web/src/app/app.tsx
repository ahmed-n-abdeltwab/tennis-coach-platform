import ProtectedRoute from '@components/Auth/ProtectedRoute';
import Footer from '@components/Layout/Footer';
import Header from '@components/Layout/Header';
import { AuthProvider } from '@contexts/AuthContext';
import { NotificationProvider } from '@contexts/NotificationContext';
import { Route, Routes } from 'react-router-dom';

import './app.css';
import { isPublicRoute, lazyRoutes } from './routes/lazy-routes.config';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <div className='min-h-screen bg-gray-50 flex flex-col'>
          <Header />
          <main className='flex-1'>
            <Routes>
              {lazyRoutes.map(route => (
                <Route
                  key={route.path}
                  path={route.path}
                  element={
                    isPublicRoute(route) ? (
                      route.element
                    ) : (
                      <ProtectedRoute
                        accessLevel={route.accessLevel as 'authenticated' | 'coach' | 'admin'}
                        redirectTo={route.redirectTo}
                      >
                        {route.element}
                      </ProtectedRoute>
                    )
                  }
                />
              ))}
            </Routes>
          </main>
          <Footer />
        </div>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
