import React from 'react';
import { BusData, RouteInfo } from '../types';
import { minutesLeftFromNow } from '../hooks/useBusData';

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
    const handleRowClick = (index: number) => {
        setExpandedRow(expandedRow === index ? null : index);
    };

    return (
        <main className="max-w-4xl mx-auto px-4 py-6">
            {loading ? (
                <div className="w-full space-y-3">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-14 rounded-md bg-emerald-100/60 animate-pulse" />
                    ))}
                </div>
            ) : filteredData.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-emerald-800 font-semibold">조건에 맞는 버스가 없어요.</p>
                    <p className="text-emerald-700 text-sm mt-1">정류장이나 노선을 변경해 보세요.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-emerald-900">
                            {selectedLocation} 버스 시간
                        </h3>
                        <button
                            onClick={() => {
                                setSelectedBusNumber([]);
                                setSelectedLocation("");
                                setExpandedRow(null);
                            }}
                            className="text-sm text-emerald-700 underline"
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
                            <div key={index} className="rounded-xl border border-emerald-100 overflow-hidden bg-white shadow-sm">
                                <div
                                    role="button"
                                    tabIndex={0}
                                    className={
                                        "flex justify-between items-center cursor-pointer px-4 py-3 transition-colors " +
                                        (imminent ? "bg-amber-50" : "bg-emerald-50 hover:bg-emerald-100")
                                    }
                                    onClick={() => handleRowClick(index)}
                                    onKeyDown={(e) => e.key === "Enter" && handleRowClick(index)}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-emerald-600 text-white text-base font-bold">
                                            {prefix}
                                        </span>
                                        <div className="text-emerald-900">
                                            <div className="font-extrabold text-lg md:text-xl">
                                                {row.time}{" "}
                                                <span className="text-emerald-700 text-sm font-medium">
                                                    ({row.busNumber})
                                                </span>
                                            </div>
                                            {Number.isFinite(left) && (
                                                <div className="text-sm text-emerald-700">
                                                    {left < 0 ? (
                                                        <>지남</>
                                                    ) : (
                                                        <>
                                                            D-{left}분{" "}
                                                            {imminent && (
                                                                <span className="ml-1 px-1.5 py-0.5 bg-amber-300/70 text-amber-900 rounded">
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
                                            (isFav ? "text-yellow-500" : "text-yellow-400 hover:text-yellow-500")
                                        }
                                        title="즐겨찾기 추가/제거"
                                    >
                                        {isFav ? "★" : "☆"}
                                    </button>
                                </div>

                                {expandedRow === index && (
                                    <div className="p-4">
                                        <strong className="text-emerald-800 block mb-2">버스 노선</strong>
                                        <div className="text-gray-700 text-sm flex flex-wrap gap-1">
                                            {row.route.map((stop: RouteInfo, i: number) => (
                                                <span key={i}>
                                                    <span className="font-medium text-emerald-700">{stop.time}</span> ({stop.stop})
                                                    {i !== row.route.length - 1 && " → "}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="mt-3 text-sm text-emerald-800">
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