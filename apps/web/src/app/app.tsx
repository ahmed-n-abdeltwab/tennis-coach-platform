import ProtectedRoute from '@components/Auth/ProtectedRoute';
import Footer from '@components/Layout/Footer';
import Header from '@components/Layout/Header';
import { AuthProvider } from '@contexts/AuthContext';
import { NotificationProvider } from '@contexts/NotificationContext';
import AdminDashboard from '@pages/AdminDashboard';
import Book from '@pages/Book';
import BookingTypes from '@pages/BookingTypes';
import Chat from '@pages/Chat';
import CoachProfile from '@pages/CoachProfile';
import Dashboard from '@pages/Dashboard';
import Home from '@pages/Home';
import Login from '@pages/Login';
import Register from '@pages/Register';
import { Route, Routes } from 'react-router-dom';
import './app.css';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <div className='min-h-screen bg-gray-50 flex flex-col'>
          <Header />
          <main className='flex-1'>
            <Routes>
              <Route path='/' element={<Home />} />
              <Route path='/coach/:id' element={<CoachProfile />} />
              <Route path='/booking-types' element={<BookingTypes />} />
              <Route path='/login' element={<Login />} />
              <Route path='/register' element={<Register />} />
              <Route
                path='/book'
                element={
                  <ProtectedRoute>
                    <Book />
                  </ProtectedRoute>
                }
              />
              <Route
                path='/dashboard'
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path='/admin'
                element={
                  <ProtectedRoute requireCoach>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path='/chat'
                element={
                  <ProtectedRoute>
                    <Chat />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
          <Footer />
        </div>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
