import React, {useEffect, useState} from 'react';
import { ArrivalInfo, BusStop } from '../types';

interface BottomSheetProps {
    sheetPct: number;
    setSheetPct: (pct: number) => void;
    selectedStop: BusStop | null;
    arrStatus: string;
    sortedArrival: ArrivalInfo[];
    fetchArrival: () => void;
    getRemainSec: (expireAtMs: number) => number;
    onHandlePointerDown: (e: any) => void;
    onHandlePointerMove: (e: any) => void;
    onHandlePointerUp: (e: any) => void;
}

const RefreshIcon = ({ className }: { className: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M20 12a8 8 0 10-3.3 6.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 8v4h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const formatETA = (remainSec: number) => {
    const remain = Math.max(0, Math.floor(Number(remainSec) || 0));
    if (remain <= 60) return "곧 도착";
    const m = Math.floor(remain / 60);
    const s = remain % 60;
    const s2 = String(s).padStart(2, "0");
    return `${m}분 ${s2}초`;
};

const busKeyOf = (b: ArrivalInfo) => b.routeId || `${b.routeNo}__${b.nodeId}`;

export const BottomSheet: React.FC<BottomSheetProps> = ({
    sheetPct,
    setSheetPct,
    selectedStop,
    arrStatus,
    sortedArrival,
    fetchArrival,
    getRemainSec,
    onHandlePointerDown,
    onHandlePointerMove,
    onHandlePointerUp,
}) => {
    const [, forceTick] = useState(0);

    useEffect(() => {
        if (!selectedStop) return;

        const id = window.setInterval(() => {
            forceTick(t => (t + 1) % 1000000);
        }, 1000);

        return () => window.clearInterval(id);
    }, [selectedStop]);

    return (
        <section className="fixed bottom-0 left-0 right-0 z-30">
            <div className="max-w-screen-md mx-auto px-4" style={{ height: `${Math.round(sheetPct * 100)}vh` }}>
                <div className="bg-white border border-stone-100 rounded-t-2xl shadow-xl shadow-stone-200/50 h-full flex flex-col">
                    <div
                        className="relative pt-2"
                        onPointerDown={onHandlePointerDown}
                        onPointerMove={onHandlePointerMove}
                        onPointerUp={onHandlePointerUp}
                        onPointerCancel={onHandlePointerUp}
                        onTouchStart={onHandlePointerDown}
                        onTouchMove={onHandlePointerMove}
                        onTouchEnd={onHandlePointerUp}
                    >
                        <div
                            className="w-12 h-1.5 bg-stone-200 rounded-full mx-auto cursor-grab active:cursor-grabbing select-none"
                            style={{ touchAction: "none" }}
                            aria-label="바텀시트 높이 조절"
                            role="separator"
                        />
                        <button
                            className="absolute right-3 top-1.5 text-xs text-green-900 hover:text-green-700 px-2 py-0.5 rounded-md hover:bg-stone-50 transition"
                            onClick={() => setSheetPct(sheetPct >= 0.6 ? 0.25 : 0.75)}
                        >
                            {sheetPct >= 0.6 ? "아래로" : "위로"}
                        </button>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto p-4">
                        {selectedStop ? (
                            <>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <h2 className="text-2xl font-bold text-green-950">{selectedStop.node_nm}</h2>
                                            <p className="text-xs text-stone-400">정류장 도착 정보</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={fetchArrival}
                                        disabled={!selectedStop || arrStatus === "loading"}
                                        className={
                                            "w-8 h-8 rounded-full border grid place-items-center active:scale-95 transition " +
                                            (arrStatus === "loading"
                                                ? "border-stone-200 text-stone-300 cursor-not-allowed"
                                                : "border-stone-200 text-green-900 hover:bg-stone-50")
                                        }
                                        title="도착 정보 새로고침"
                                        aria-label="도착 정보 새로고침"
                                    >
                                        {arrStatus === "loading" ? (
                                            <RefreshIcon className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <RefreshIcon className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>

                                <div className="border-t border-stone-100 pt-4">
                                    {arrStatus === "loading" && (
                                        <div className="space-y-2">
                                            {[...Array(6)].map((_, i) => (
                                                <div key={i} className="h-14 rounded-xl bg-stone-100 animate-pulse" />
                                            ))}
                                        </div>
                                    )}

                                    {arrStatus === "error" && (
                                        <div className="text-center py-6">
                                            <p className="text-red-500 font-medium">정보를 불러올 수 없습니다</p>
                                            <p className="text-xs text-stone-400 mt-1">잠시 후 다시 시도해 주세요.</p>
                                        </div>
                                    )}

                                    {arrStatus === "ok" && Array.isArray(sortedArrival) && sortedArrival.length === 0 && (
                                        <div className="text-center py-6">
                                            <p className="text-stone-500">운행 중인 버스가 없습니다</p>
                                        </div>
                                    )}

                                    {arrStatus === "ok" && Array.isArray(sortedArrival) && sortedArrival.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-semibold text-stone-500">
                                                도착 예정 버스 ({sortedArrival.length}개)
                                            </h4>
                                            {sortedArrival.map((bus, idx) => {
                                                const remain = getRemainSec(bus.expireAtMs);
                                                const urgent = remain <= 60;
                                                const soon = remain <= 180;
                                                return (
                                                    <div
                                                        key={busKeyOf(bus) + "_" + idx}
                                                        className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-100"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-green-900 text-white rounded-full grid place-items-center text-xs font-bold">
                                                                {bus.routeNo.split("-")[0]}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-green-950">
                                                                    {bus.routeNo}번 버스
                                                                </p>
                                                                <p className="text-xs text-stone-400">
                                                                    {bus.arrPrevStationCnt}개 정류장 전
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div
                                                                className={
                                                                    "text-lg font-bold " +
                                                                    (urgent ? "text-red-500" : soon ? "text-orange-500" : "text-green-950")
                                                                }
                                                            >
                                                                {formatETA(remain)}
                                                            </div>
                                                            <div className="text-xs text-stone-400">
                                                                {remain <= 60 ? "곧 도착" : "후 도착"}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="py-10 text-center">
                                <p className="text-green-950 font-semibold">정류장을 선택하세요</p>
                                <p className="text-stone-400 text-sm mt-1">
                                    지도에서 정류장을 누르거나 상단 검색창을 이용해 찾을 수 있습니다.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};
