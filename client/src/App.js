import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Movies from './pages/Movies';
import TVShows from './pages/TVShows';
import Books from './pages/Books';
import MyLibrary from './pages/MyLibrary';
import Details from './pages/Details';

function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/tv" element={<TVShows />} />
          <Route path="/books" element={<Books />} />
          <Route path="/library" element={<MyLibrary />} />
          <Route path="/details/:mediaType/:id" element={<Details />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
