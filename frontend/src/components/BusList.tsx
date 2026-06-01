import React from 'react';
import { BusData, RouteInfo } from '../types';
import { minutesLeftFromNow } from '../hooks/useBusData';
import {useNavigate} from 'react-router-dom';

interface BusListProps {
    loading: boolean;
    filteredData: any[];
    selectedLocation: string;
    setSelectedBusNumber: (busNumbers: string[]) => void;
    setSelectedLocation: (location: string) => void;
    expandedRow: number | null;
    setExpandedRow: (row: number | null) => void;
    favoritesForThisFile: string[];
    toggleFavorite: (busNumberPrefix: string, location: string) => void;
}

export const BusList: React.FC<BusListProps> = ({
    loading,
    filteredData,
    selectedLocation,
    setSelectedBusNumber,
    setSelectedLocation,
    expandedRow,
    setExpandedRow,
    favoritesForThisFile,
    toggleFavorite,
}) => {
    const navigate = useNavigate();
    const handleRowClick = (index: number) => {
        setExpandedRow(expandedRow === index ? null : index);
    };

    const getRegionFromQuery = () => {
        const sp = new URLSearchParams(location.search);
        return (sp.get("json") || "").toLowerCase();
    };

    const routeIdJsonByRegion = (region: string) => {
        if (region.includes("masan")) return "/masan_nodeId.json";
        return "/haman_nodeId.json";
    };

    const findFocusRouteId = async (stopName: string) => {
        const region = getRegionFromQuery();
        const url = routeIdJsonByRegion(region);

        const res = await fetch(url, { cache: "no-store" });
        const list = await res.json();

        const found = Array.isArray(list)
            ? list.find((x: any) => (x?.stop || "").trim() === stopName.trim())
            : null;

        return found?.node_id || null;
    };

    return (
        <main className="max-w-4xl mx-auto px-4 py-6">
            {loading ? (
                <div className="w-full space-y-3">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-14 rounded-xl bg-stone-100 animate-pulse" />
                    ))}
                </div>
            ) : filteredData.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-green-950 font-semibold">조건에 맞는 버스가 없어요.</p>
                    <p className="text-stone-500 text-sm mt-1">정류장이나 노선을 변경해 보세요.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-green-950">
                            {selectedLocation} 버스 시간
                        </h3>
                        <button
                            onClick={async () => {
                                try {
                                    const stopName = (selectedLocation || "").trim();
                                    const focusRouteId = await findFocusRouteId(stopName);
                                    navigate("/map", { state: { focusRouteId } });
                                } catch (e) {
                                }
                            }}
                            className="group flex items-center gap-2 px-4 py-2 rounded-full text-stone-700 text-sm font-medium border border-stone-200 hover:border-green-800/30 hover:bg-stone-50 active:scale-95 transition"
                        >
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"/>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"/>
                            </span>
                            {selectedLocation}의 실시간 버스시간 확인
                        </button>

                        <button
                            onClick={() => {
                                setSelectedBusNumber([]);
                                setSelectedLocation("");
                                setExpandedRow(null);
                            }}
                            className="text-sm text-green-800 underline"
                        >
                            필터 초기화
                        </button>
                    </div>

                    {filteredData.map((row, index) => {
                        const prefix = row.busNumber.split("-")[0];
                        const favKey = `${prefix}-${selectedLocation}`;
                        const isFav = favoritesForThisFile.includes(favKey);
                        const left = minutesLeftFromNow(row.time);
                        const imminent = left >= 0 && left <= 10;

                        return (
                            <div key={index} className="rounded-xl border border-stone-100 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                                <div
                                    role="button"
                                    tabIndex={0}
                                    className={
                                        "flex justify-between items-center cursor-pointer px-4 py-3 transition-colors " +
                                        (imminent ? "bg-amber-50" : "bg-white hover:bg-stone-50")
                                    }
                                    onClick={() => handleRowClick(index)}
                                    onKeyDown={(e) => e.key === "Enter" && handleRowClick(index)}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-green-900 text-white text-base font-bold">
                                            {prefix}
                                        </span>
                                        <div className="text-green-950">
                                            <div className="font-extrabold text-lg md:text-xl">
                                                {row.time}{" "}
                                                <span className="text-stone-400 text-sm font-medium">
                                                    ({row.busNumber})
                                                </span>
                                            </div>
                                            {Number.isFinite(left) && (
                                                <div className="text-sm text-stone-500">
                                                    {left < 0 ? (
                                                        <>지남</>
                                                    ) : (
                                                        <>
                                                            D-{left}분{" "}
                                                            {imminent && (
                                                                <span className="ml-1 px-1.5 py-0.5 bg-amber-300/70 text-amber-900 rounded text-xs">
                                                                    임박
                                                                </span>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        aria-pressed={isFav}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleFavorite(prefix, selectedLocation);
                                        }}
                                        className={
                                            "text-2xl active:scale-95 transition " +
                                            (isFav ? "text-amber-500" : "text-stone-300 hover:text-amber-400")
                                        }
                                        title="즐겨찾기 추가/제거"
                                    >
                                        {isFav ? "★" : "☆"}
                                    </button>
                                </div>

                                {expandedRow === index && (
                                    <div className="p-4 border-t border-stone-100">
                                        <strong className="text-green-900 block mb-2 text-sm">버스 노선</strong>
                                        <div className="text-stone-600 text-sm flex flex-wrap gap-1">
                                            {row.route.map((stop: RouteInfo, i: number) => (
                                                <span key={i}>
                                                    <span className="font-medium text-green-800">{stop.time}</span> ({stop.stop})
                                                    {i !== row.route.length - 1 && " → "}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="mt-3 text-sm text-green-900">
                                            <strong>종점:</strong> {row.terminal}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </main>
    );
};
