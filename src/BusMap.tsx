import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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

    const [busStops, setBusStops] = useState<BusStop[]>([]);
    const [selectedStop, setSelectedStop] = useState<BusStop | null>(null);
    const [rawSearch, setRawSearch] = useState("");
    const [search, setSearch] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedSuggestion, setSelectedSuggestion] = useState(-1);

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

    // BottomSheet drag state
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

    // ✅ KakaoMap 훅을 먼저 호출(Ref 확보)
    const handleStopClickRef = useRef<((stop?: BusStop, options?: any) => void) | null>(null);

    const { mapRef, mapReady, markersRef } = useKakaoMap(
        containerRef,
        busStops,
        (stop, options) => handleStopClickRef.current?.(stop, options),
        toggleFavorite,
        isFavoriteNow,
        sheetPct
    );

    // 정류장 클릭 실제 처리
    const handleStopClick = useCallback(
        (stop: BusStop, options: any = {}) => {
            if (!stop) return;
            setSelectedStop(stop);

            // kakao / mapRef 가드
            if (typeof window === "undefined" || !("kakao" in window)) return;
            if (!mapRef?.current) return;

            const map = mapRef.current;

            // 오버레이 닫기
            if (markersRef?.current) {
                markersRef.current.forEach(({ overlay }: any) => overlay && overlay.close && overlay.close());
            }

            // 해당 정류장 오버레이 열기 + 즐겨찾기 버튼 텍스트 갱신
            const found = markersRef?.current?.find((m: any) => m.stop.node_id === stop.node_id);
            if (found?.overlay) {
                found.overlay.open && found.overlay.open(map);
                const content = found.overlay.getContent && found.overlay.getContent();
                // getContent가 문자열일 수도 있으니 안전 처리
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

    // ✅ 안전 래퍼: 인자 없으면 무시
    const safeHandleStopClick = useCallback(
        (stop?: BusStop, options?: any) => {
            if (!stop) return;
            handleStopClick(stop, options);
        },
        [handleStopClick]
    );

    // ref에 최신 핸들러 주입
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

    const userMarkerRef = useRef<any>(null);
    const userCircleRef = useRef<any>(null);

    const locateMe = useCallback(() => {
        if (!mapReady) return;
        if (!navigator.geolocation) {
            alert("이 브라우저는 위치 기능을 지원하지 않습니다.");
            return;
        }
        setLocStatus("locating");

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude, accuracy } = pos.coords;
                if (typeof window === "undefined" || !("kakao" in window)) {
                    setLocStatus("error");
                    alert("지도를 초기화하지 못했습니다.");
                    return;
                }
                if (!mapRef?.current) return;

                const { kakao } = window as any;
                const latlng = new kakao.maps.LatLng(latitude, longitude);
                const map = mapRef.current;

                if (!userMarkerRef.current) {
                    const markerEl = document.createElement("div");
                    markerEl.style.width = "14px";
                    markerEl.style.height = "14px";
                    markerEl.style.borderRadius = "50%";
                    markerEl.style.background = "#3b82f6";
                    markerEl.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.25)";
                    userMarkerRef.current = new kakao.maps.CustomOverlay({
                        content: markerEl,
                        position: latlng,
                        xAnchor: 0.5,
                        yAnchor: 0.5,
                        zIndex: 9999,
                        clickable: false,
                    });
                } else {
                    userMarkerRef.current.setPosition(latlng);
                }
                userMarkerRef.current.setMap(map);

                const radius = Math.max(accuracy || 0, 30);
                if (!userCircleRef.current) {
                    userCircleRef.current = new kakao.maps.Circle({
                        center: latlng,
                        radius,
                        strokeWeight: 2,
                        strokeColor: "#3b82f6",
                        strokeOpacity: 0.6,
                        strokeStyle: "shortdash",
                        fillColor: "#3b82f6",
                        fillOpacity: 0.15,
                        zIndex: 9998,
                    });
                } else {
                    userCircleRef.current.setOptions({ center: latlng, radius });
                }
                userCircleRef.current.setMap(map);

                setLocStatus("ok");
                map.panTo(latlng);
                if (map.getLevel() > 3) map.setLevel(3, { animate: true });
            },
            (err) => {
                setLocStatus("error");
                const msg =
                    err.code === err.PERMISSION_DENIED
                        ? "위치 권한이 거부되었습니다."
                        : err.code === err.POSITION_UNAVAILABLE
                            ? "위치 정보를 사용할 수 없습니다."
                            : err.code === err.TIMEOUT
                                ? "위치 요청이 시간 초과되었습니다."
                                : "내 위치를 가져오지 못했습니다.";
                alert(msg);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        );
    }, [mapReady, mapRef]);

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

            <div className="relative z-0 h-[100dvh]">
                <Map containerRef={containerRef} locateMe={locateMe} locStatus={locStatus} />
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