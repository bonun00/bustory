import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "./hooks/useQuery";
import { useBusData } from "./hooks/useBusData";
import { Header } from "./components/Header";
import { Filter } from "./components/Filter";
import { BusList } from "./components/BusList";

const BusTime: React.FC = () => {
    const query = useQuery();
    const navigate = useNavigate();
    const jsonFile = query.get("json") || "tomasan_V2.json";

    const {
        loading,
        refreshing,
        busNumbers,
        locations,
        selectedBusNumber,
        setSelectedBusNumber,
        selectedLocation,
        setSelectedLocation,
        onlyUpcoming,
        setOnlyUpcoming,
        favoritesForThisFile,
        filteredData,
        toggleFavorite,
        handleRefresh,
    } = useBusData(jsonFile);

    const [isCompact, setIsCompact] = useState(false);
    const [expandedRow, setExpandedRow] = useState<number | null>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);

    const goBack = () => {
        if (window.history.length > 1) navigate(-1);
        else navigate("/");
    };

    const getTitleByJson = (fileName: string): string => {
        if (fileName.includes("tomasan")) return "칠원/함안 ▶ 창원/마산";
        if (fileName.includes("tohaman")) return "창원/마산 ▶ 칠원/함안";
        return "정류장 버스 시간표";
    };
    const title = getTitleByJson(jsonFile);

    useEffect(() => {
        const target = sentinelRef.current;
        if (!target) return;

        const obs = new IntersectionObserver(
            (entries) => {
                const e = entries[0];
                const topPassed = e.boundingClientRect.top < -24 || e.intersectionRatio < 1;
                setIsCompact(topPassed);
            },
            {
                root: null,
                threshold: 0.001,
                rootMargin: "-24px 0px 0px 0px",
            }
        );
        obs.observe(target);
        return () => obs.disconnect();
    }, []);

    const selectAllRoutes = () => setSelectedBusNumber(busNumbers);
    const clearAllRoutes = () => setSelectedBusNumber([]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100">
            <Header
                isCompact={isCompact}
                title={title}
                refreshing={refreshing}
                goBack={goBack}
                handleRefresh={handleRefresh}
            />
            <div ref={sentinelRef} aria-hidden="true" className="h-0.5 w-full" />
            <Filter
                isCompact={isCompact}
                selectedLocation={selectedLocation}
                setSelectedLocation={setSelectedLocation}
                filteredLocations={locations}
                busNumbers={busNumbers}
                selectedBusNumber={selectedBusNumber}
                setSelectedBusNumber={setSelectedBusNumber}
                onlyUpcoming={onlyUpcoming}
                setOnlyUpcoming={setOnlyUpcoming}
                favoritesForThisFile={favoritesForThisFile}
                selectAllRoutes={selectAllRoutes}
                clearAllRoutes={clearAllRoutes}
                toggleFavorite={toggleFavorite}
                setExpandedRow={setExpandedRow}
            />
            <BusList
                loading={loading}
                filteredData={filteredData}
                selectedLocation={selectedLocation}
                setSelectedBusNumber={setSelectedBusNumber}
                setSelectedLocation={setSelectedLocation}
                expandedRow={expandedRow}
                setExpandedRow={setExpandedRow}
                favoritesForThisFile={favoritesForThisFile}
                toggleFavorite={toggleFavorite}
            />
        </div>
    );
};

export default BusTime;
