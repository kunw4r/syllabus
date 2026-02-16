import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Movies from './pages/Movies';
import TVShows from './pages/TVShows';
import Books from './pages/Books';
import MyLibrary from './pages/MyLibrary';
import Details from './pages/Details';
import Login from './pages/Login';

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
        <div className="flex min-h-screen">
          <Navbar />
          <main className="flex-1 ml-0 md:ml-60 p-6 md:p-10">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/movies" element={<Movies />} />
              <Route path="/tv" element={<TVShows />} />
              <Route path="/books" element={<Books />} />
              <Route path="/library" element={<ProtectedRoute><MyLibrary /></ProtectedRoute>} />
              <Route path="/details/:mediaType/:id" element={<Details />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      } />
    </Routes>
  );
}

export default App;
