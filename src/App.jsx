import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Home.jsx';
import React from 'react';
import BusTime from './BusTime.jsx';
import BusMap from './BusMap.jsx';


function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/busTime" element={<BusTime />} />
                <Route path="/map" element={<BusMap />} />
            </Routes>
        </Router>
    );
}

export default App;