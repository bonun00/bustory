import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Home from './Home.jsx';
import BusTime from './BusTime.jsx';
import BusMap from './BusMap.jsx';
import { trackNaverPageview } from "./naverAnalytics";


function useNaverAnalytics() {
    const { pathname, search } = useLocation();
    useEffect(() => {
        const key = pathname + search;
        if (window.__NA_LAST_KEY === key) return;
        window.__NA_LAST_KEY = key;
        trackNaverPageview();
    }, [pathname, search]);
}

function NaverAnalyticsBridge() {
    useNaverAnalytics();
    return null;
}

function App() {
    return (
        <Router>
            <NaverAnalyticsBridge />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/busTime" element={<BusTime />} />
                <Route path="/map" element={<BusMap />} />
            </Routes>
        </Router>
    );
}

export default App;