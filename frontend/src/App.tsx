import React, {JSX, useEffect} from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Home from './Home';
import BusTime from './BusTime';
import BusMap from './BusMap';
import { trackNaverPageview } from "./naverAnalytics";

declare global {
    interface Window {
        __NA_LAST_KEY?: string;
    }
}

function useNaverAnalytics(): void {
    const { pathname, search } = useLocation();
    useEffect(() => {
        const key = pathname + search;
        if (window.__NA_LAST_KEY === key) return;
        window.__NA_LAST_KEY = key;
        trackNaverPageview();
    }, [pathname, search]);
}

function NaverAnalyticsBridge(): null {
    useNaverAnalytics();
    return null;
}

function App(): JSX.Element {
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