import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BusStop } from "./types";
import { useKakaoMap } from "./hooks/useKakaoMap";
import { useBusArrival } from "./hooks/useBusArrival";
import { Header } from "./components/BusMapHeader";
import { Search } from "./components/BusMapSearch";
import { Map } from "./components/BusMapMap";
import { BottomSheet } from "./components/BusMapBottomSheet";

const BusMap: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const focusRouteId = (location.state as any)?.focusRouteId as string | null | undefined;
    const [busStops, setBusStops] = useState<BusStop[]>([]);
    const [selectedStop, setSelectedStop] = useState<BusStop | null>(null);
    const [rawSearch, setRawSearch] = useState("");
    const [search, setSearch] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
    type GeoPermission = "unknown" | "granted" | "denied";
    const [geoPermission, setGeoPermission] = useState<GeoPermission>("unknown");
    const [showGeoGate, setShowGeoGate] = useState(false);
    const autoLocatedRef = useRef(false);


    useEffect(() => {
        if (!focusRouteId) return;
        setShowGeoGate(false);
        setLocStatus("idle");
    }, [focusRouteId]);

    const [favorites, setFavorites] = useState<BusStop[]>(() => {
        try {
            const byDir = JSON.parse(localStorage.getItem("favoritesByDir") || "null");
            if (byDir && (byDir["마산"] || byDir["칠원"])) {
                const merged = [...(byDir["마산"] || []), ...(byDir["칠원"] || [])];
                localStorage.setItem("favorites", JSON.stringify(merged));
                localStorage.removeItem("favoritesByDir");
                return merged;
            }
            const saved = JSON.parse(localStorage.getItem("favorites") || "null");
            return saved ?? [];
        } catch {
            return [];
        }
    });

    const { arrivalInfo, arrStatus, fetchArrival, getRemainSec } = useBusArrival(selectedStop);


    const [sheetPct, setSheetPct] = useState(0.45);
    const [dragging, setDragging] = useState(false);
    const startRef = useRef({ y: 0, pct: 0 });

    const [locStatus, setLocStatus] = useState<"idle" | "locating" | "ok" | "error">("idle");

    const goBack = () => {
        if (window.history.length > 1) navigate(-1);
        else navigate("/");
    };

    // 정류장 목록 로드
    useEffect(() => {
        let mounted = true;
        fetch("/busLocation.json", { cache: "no-store" })
            .then((res) => res.json())
            .then((data) => mounted && setBusStops(Array.isArray(data) ? data : []))
            .catch(() => mounted && setBusStops([]));
        return () => {
            mounted = false;
        };
    }, []);

    const isFavoriteNow = useCallback(
        (stop: BusStop) => (favorites || []).some((f) => f.node_id === stop.node_id),
        [favorites]
    );

    const toggleFavorite = useCallback((stop: BusStop) => {
        setFavorites((prev) => {
            const exists = prev.some((f) => f.node_id === stop.node_id);
            const next = exists ? prev.filter((f) => f.node_id !== stop.node_id) : [...prev, stop];
            localStorage.setItem("favorites", JSON.stringify(next));
            return next;
        });
    }, []);

    const handleStopClickRef = useRef<((stop?: BusStop, options?: any) => void) | null>(null);

    const { mapRef, mapReady, markersRef } = useKakaoMap(
        containerRef,
        busStops,
        (stop, options) => handleStopClickRef.current?.(stop, options),
        toggleFavorite,
        isFavoriteNow,
        sheetPct
    );

    const handleStopClick = useCallback(
        (stop: BusStop, options: any = {}) => {
            if (!stop) return;
            setSelectedStop(stop);

            if (typeof window === "undefined" || !("kakao" in window)) return;
            if (!mapRef?.current) return;

            const map = mapRef.current;

            if (markersRef?.current) {
                markersRef.current.forEach(({ overlay }: any) => overlay && overlay.close && overlay.close());
            }

            const found = markersRef?.current?.find((m: any) => m.stop.node_id === stop.node_id);
            if (found?.overlay) {
                found.overlay.open && found.overlay.open(map);
                const content = found.overlay.getContent && found.overlay.getContent();
                let favBtn: HTMLElement | null = null;
                if (content instanceof HTMLElement) {
                    favBtn = content.querySelector(".fav-action");
                }
                if (favBtn) {
                    favBtn.textContent = isFavoriteNow(stop) ? "즐겨찾기 해제" : "즐겨찾기 추가";
                }
            }

            const { kakao } = window as any;
            const latlng = new kakao.maps.LatLng(stop.latitude, stop.longitude);

            if (options.zoom) {
                const prev = map.getCenter();
                const same =
                    Math.abs(prev.getLat() - latlng.getLat()) < 1e-7 &&
                    Math.abs(prev.getLng() - latlng.getLng()) < 1e-7;

                if (same) {
                    map.setLevel(3, { animate: true });
                } else {
                    const onIdle = function () {
                        kakao.maps.event.removeListener(map, "idle", onIdle);
                        map.setLevel(3, { animate: true });
                    };
                    kakao.maps.event.addListener(map, "idle", onIdle);
                }
            }

            map.panTo(latlng);
        },
        [isFavoriteNow, mapRef, markersRef]
    );

    const safeHandleStopClick = useCallback(
        (stop?: BusStop, options?: any) => {
            if (!stop) return;
            handleStopClick(stop, options);
        },
        [handleStopClick]
    );

    handleStopClickRef.current = safeHandleStopClick;

    const allStops = useMemo(() => busStops, [busStops]);

    const suggestions = useMemo(() => {
        if (!search.trim()) return [];
        return allStops.filter((s) => s.node_nm.includes(search.trim())).slice(0, 8);
    }, [allStops, search]);

    useEffect(() => {
        const t = setTimeout(() => setSearch(rawSearch), 180);
        return () => clearTimeout(t);
    }, [rawSearch]);


    useEffect(() => {
        if (!mapReady) return;
        if (!busStops.length) return;

        const pick = () => {
            if (focusRouteId) {
                const byRoute =
                    busStops.find((s) => s.node_id=== focusRouteId );
                if (byRoute) {
                    safeHandleStopClick(byRoute, { zoom: true });
                    return;
                }
            }


        };

        const t = setTimeout(pick, 0);
        return () => clearTimeout(t);
    }, [focusRouteId, mapReady, busStops, safeHandleStopClick]);



    const submitSearch = useCallback(() => {
        if (selectedSuggestion >= 0 && suggestions[selectedSuggestion]) {
            safeHandleStopClick(suggestions[selectedSuggestion], { zoom: true });
            setShowSuggestions(false);
            return;
        }
        const q = search.trim();
        if (!q) return;
        const matched = allStops.find((s) => s.node_nm.includes(q));
        if (matched) {
            safeHandleStopClick(matched, { zoom: true });
            setShowSuggestions(false);
        } else {
            alert("일치하는 정류장이 없습니다.");
        }
    }, [allStops, search, selectedSuggestion, suggestions, safeHandleStopClick]);

    const clamp01 = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

    const onHandlePointerDown = (e: any) => {
        setDragging(true);
        const clientY = e.clientY ?? (e.touches ? e.touches[0].clientY : 0);
        startRef.current = { y: clientY, pct: sheetPct };
        e.currentTarget.setPointerCapture?.(e.pointerId ?? 0);
        document.body.style.userSelect = "none";
    };

    const onHandlePointerMove = (e: any) => {
        if (!dragging) return;
        const clientY = e.clientY ?? (e.touches ? e.touches[0].clientY : 0);
        const deltaY = clientY - startRef.current.y;
        const vh = window.innerHeight || 1;
        const next = startRef.current.pct - deltaY / vh;
        setSheetPct(clamp01(next, 0.2, 0.9));
    };

    const onHandlePointerUp = () => {
        if (!dragging) return;
        setDragging(false);
        document.body.style.userSelect = "";
    };

    useEffect(() => {
        let canceled = false;

        (async () => {
            try {
                const perm = await (navigator as any).permissions?.query({ name: "geolocation" });
                if (!perm || canceled) return;

                const mapState = (s: string): GeoPermission =>
                    s === "granted" ? "granted" : s === "denied" ? "denied" : "unknown";

                setGeoPermission(mapState(perm.state));
                perm.onchange = () => setGeoPermission(mapState(perm.state));
            } catch {
            }
        })();

        return () => {
            canceled = true;
        };
    }, []);

    useEffect(() => {
        if (autoLocatedRef.current) return;
        if (!mapReady || !busStops.length) return;
        if (focusRouteId) return;

        if (geoPermission === "granted") {
            autoLocatedRef.current = true;

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    const closest = findClosestStop(latitude, longitude, busStops); // BusStop | null
                    if (closest) safeHandleStopClick(closest, { zoom: true });
                },
                () => {
                    // 실패 시 그냥 패스
                },
                { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 }
            );
            return;
        }

        // 허용이 아니면: 안내 UI 띄우기
        if(!focusRouteId)setShowGeoGate(true);
    }, [geoPermission, mapReady, busStops, focusRouteId, safeHandleStopClick]);


    const toRad = (v: number) => (v * Math.PI) / 180;


    const distanceM = (lat1: number, lng1: number, lat2: number, lng2: number) => {
        const R = 6371000;
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(a));
    };

    const findClosestStop = (lat: number, lng: number, stops: BusStop[]) => {
        let best: BusStop | null = null;
        let bestD = Infinity;

        for (const s of stops) {
            const d = distanceM(lat, lng, s.latitude, s.longitude);
            if (d < bestD) {
                bestD = d;
                best = s;
            }
        }
        return best;
    };

    const requestGeoAndGoNearest = useCallback(() => {
        if (!navigator.geolocation) {
            alert("이 브라우저는 위치 기능을 지원하지 않습니다.");
            return;
        }
        if(focusRouteId) return;

        setLocStatus("locating");

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                const closest = findClosestStop(latitude, longitude, busStops);
                setLocStatus("ok");
                setShowGeoGate(false);

                if (closest) safeHandleStopClick(closest, { zoom: true });
                else alert("가까운 정류장을 찾지 못했습니다.");
            },
            (err) => {
                setLocStatus("error");
                if (err.code === err.PERMISSION_DENIED) {
                    alert("가까운 정류장을 찾으려면 위치 권한을 허용해 주세요.");
                } else {
                    alert("위치 정보를 가져오지 못했습니다.");
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        );
    }, [focusRouteId,busStops, safeHandleStopClick]);



    return (
        <div className="relative min-h-screen bg-gradient-to-b from-green-50 to-green-100">
            <Header goBack={goBack} favorites={favorites} handleStopClick={safeHandleStopClick} />
            <div className="pointer-events-none absolute top-30 left-1/2 -translate-x-1/2 z-40 w-[min(680px,92%)]">
                <div className="pointer-events-auto">
                    <Search
                        rawSearch={rawSearch}
                        setRawSearch={setRawSearch}
                        showSuggestions={showSuggestions}
                        setShowSuggestions={setShowSuggestions}
                        suggestions={suggestions}
                        selectedSuggestion={selectedSuggestion}
                        setSelectedSuggestion={setSelectedSuggestion}
                        submitSearch={submitSearch}
                        handleStopClick={safeHandleStopClick}
                    />
                </div>
            </div>
            {!focusRouteId && showGeoGate && geoPermission !== "granted" && (
                <div className="absolute inset-0 z-50 grid place-items-center bg-black/30">
                    <div className="w-[min(360px,92%)] rounded-2xl bg-white p-4 shadow-xl">
                        <div className="text-base font-semibold">가까운 정류장 찾기</div>
                        <div className="mt-2 text-sm text-gray-600">
                            현재 위치 기준으로 가장 가까운 버스정류장으로 이동하려면 위치 권한이 필요해요.
                        </div>

                        <div className="mt-4 flex gap-2">
                            <button
                                className="flex-1 rounded-xl bg-emerald-600 py-2 text-white"
                                onClick={requestGeoAndGoNearest}
                            >
                                위치 권한 허용하기
                            </button>
                            <button
                                className="flex-1 rounded-xl bg-gray-100 py-2 text-gray-700"
                                onClick={() => setShowGeoGate(false)}
                            >
                                나중에
                            </button>
                        </div>

                        {geoPermission === "denied" && (
                            <div className="mt-3 text-xs text-gray-500">
                                이미 거부한 경우, 브라우저/OS 설정에서 위치 권한을
                                “허용”으로 바꿔야 해요.
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="relative z-0 h-[100dvh]">
                <Map containerRef={containerRef} locateMe={requestGeoAndGoNearest} locStatus={locStatus} />
            </div>

            <div className="relative z-30">
                <BottomSheet
                    sheetPct={sheetPct}
                    setSheetPct={setSheetPct}
                    selectedStop={selectedStop}
                    arrStatus={arrStatus}
                    sortedArrival={arrivalInfo}
                    fetchArrival={fetchArrival}
                    getRemainSec={getRemainSec}
                    onHandlePointerDown={onHandlePointerDown}
                    onHandlePointerMove={onHandlePointerMove}
                    onHandlePointerUp={onHandlePointerUp}
                />
            </div>
        </div>
    );

};

export default BusMap;