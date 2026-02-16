import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';

// Lazy-load pages for code splitting
const Home = React.lazy(() => import('./pages/Home'));
const Movies = React.lazy(() => import('./pages/Movies'));
const TVShows = React.lazy(() => import('./pages/TVShows'));
const Books = React.lazy(() => import('./pages/Books'));
const MyLibrary = React.lazy(() => import('./pages/MyLibrary'));
const Details = React.lazy(() => import('./pages/Details'));
const Top100 = React.lazy(() => import('./pages/Top100'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Social = React.lazy(() => import('./pages/Social'));
const Login = React.lazy(() => import('./pages/Login'));

const PageLoader = () => (
  <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-dark-500 border-t-accent rounded-full animate-spin" /></div>
);

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return children;
}

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-dark-500 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="*" element={
        <div className="flex min-h-screen overflow-x-hidden">
          <Navbar />
          <main className="flex-1 ml-0 lg:ml-60 pt-12 p-4 pb-20 sm:pt-12 sm:p-6 sm:pb-24 lg:pt-10 lg:p-10 lg:pb-10 overflow-x-hidden">
            <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/movies" element={<Movies />} />
              <Route path="/tv" element={<TVShows />} />
              <Route path="/books" element={<Books />} />
              <Route path="/top100" element={<Top100 />} />
              <Route path="/library" element={<ProtectedRoute><MyLibrary /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/profile/:userId" element={<Profile />} />
              <Route path="/social" element={<ProtectedRoute><Social /></ProtectedRoute>} />
              <Route path="/details/:mediaType/:id" element={<Details />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
            </Suspense>
          </main>
        </div>
      } />
    </Routes>
  );
}

export default App;
