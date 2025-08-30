/* global kakao */
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const isProdHost =
    typeof window !== "undefined" &&
    !/^(localhost|127\.0\.0\.1)$/i.test(location.hostname);

let BUS_API_BASE = import.meta.env.VITE_BUS_API_BASE || "/api";
if (isProdHost && /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(BUS_API_BASE)) {
    BUS_API_BASE = "/api";
}

const BusMap = () => {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const clustererRef = useRef(null);
    const markersRef = useRef([]); // [{ stop, marker, overlay }]
    const abortRef = useRef(null);
    const overlayCssInjectedRef = useRef(false);
    const pendingSelectRef = useRef(null); // 다른 방향 즐겨찾기 클릭 시 대기 선택

    // UI
    const [directionFilter, setDirectionFilter] = useState("마산");
    const [rawSearch, setRawSearch] = useState("");
    const [search, setSearch] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedSuggestion, setSelectedSuggestion] = useState(-1);

    // Data
    const [busStops, setBusStops] = useState([]);
    const [selectedStop, setSelectedStop] = useState(null);
    const [arrivalInfo, setArrivalInfo] = useState([]);
    const [arrStatus, setArrStatus] = useState("idle"); // idle | loading | ok | error

    // 뒤로가기
    const navigate = useNavigate();
    const goBack = () => {
        if (window.history.length > 1) navigate(-1);
        else navigate("/");
    };

    // 즐겨찾기 (방향별)
    const [favoritesByDir, setFavoritesByDir] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem("favoritesByDir"));
            return saved ?? { 마산: [], 칠원: [] };
        } catch {
            return { 마산: [], 칠원: [] };
        }
    });
    // ref로 최신 즐겨찾기 유지 → effect 재실행 방지
    const favoritesRef = useRef(favoritesByDir);
    useEffect(() => {
        favoritesRef.current = favoritesByDir;
    }, [favoritesByDir]);

    const dirOf = (stop) => stop.direction || directionFilter;

    const toggleFavorite = useCallback(
        (stop) => {
            const dir = dirOf(stop);
            setFavoritesByDir((prev) => {
                const list = prev[dir] ?? [];
                const exists = list.some((f) => f.node_id === stop.node_id);
                const updatedDirList = exists
                    ? list.filter((f) => f.node_id !== stop.node_id)
                    : [...list, stop];
                const next = { ...prev, [dir]: updatedDirList };
                localStorage.setItem("favoritesByDir", JSON.stringify(next));
                return next;
            });
        },
        [directionFilter]
    );

    const isFavoriteNow = useCallback(
        (stop) => {
            const dir = (stop && stop.direction) || directionFilter;
            const list = favoritesRef.current[dir] ?? [];
            return list.some((f) => f.node_id === stop.node_id);
        },
        [directionFilter]
    );

    // 파생 값
    const filteredStops = useMemo(
        () => busStops.filter((s) => s.direction === directionFilter),
        [busStops, directionFilter]
    );

    const suggestions = useMemo(() => {
        if (!search.trim()) return [];
        return filteredStops
            .filter((s) => s.node_nm.includes(search.trim()))
            .slice(0, 8);
    }, [filteredStops, search]);

    // 검색 디바운스
    useEffect(() => {
        const t = setTimeout(() => setSearch(rawSearch), 180);
        return () => clearTimeout(t);
    }, [rawSearch]);

    // 정류장 로드
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

    // Kakao맵 & 클러스터러 1회 생성
    useEffect(() => {
        if (!containerRef.current) return;
        if (!(window.kakao && window.kakao.maps)) return;

        window.kakao.maps.load(() => {
            if (mapRef.current) return;

            const center = new kakao.maps.LatLng(35.227, 128.681);
            mapRef.current = new kakao.maps.Map(containerRef.current, {
                center,
                level: 5,
            });

            clustererRef.current = new kakao.maps.MarkerClusterer({
                map: mapRef.current,
                averageCenter: true,
                minLevel: 6,
                styles: [
                    {
                        width: "36px",
                        height: "36px",
                        background: "rgba(16,185,129,0.92)", // emerald-500 톤
                        color: "#fff",
                        borderRadius: "18px",
                        textAlign: "center",
                        lineHeight: "36px",
                        fontSize: "13px",
                        fontWeight: "700",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    },
                ],
            });
        });
    }, []);

    // 말풍선 CSS 1회 주입 (컬러 톤 통일)
    const ensureOverlayStyles = useCallback(() => {
        if (overlayCssInjectedRef.current) return;
        const css = `
    .bus-overlay {
      background:#fff;border:1px solid rgba(0,0,0,0.08);border-radius:12px;
      box-shadow:0 8px 24px rgba(0,0,0,0.12);padding:10px 12px;min-width:190px;
      transform:translateY(-6px); position:relative; padding-bottom: 42px;
    }
    .bus-overlay .title {
      display:flex;align-items:center;gap:8px;font-weight:700;color:#064e3b;font-size:14px;
    }
    .bus-overlay .badge {
      background:#059669;color:#fff;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:700;
    }
    .bus-overlay .fav-action{
      position:absolute; right:8px; bottom:8px; background:#f59e0b;
      color:#111827; border:none; border-radius:6px; padding:6px 10px;
      font-size:12px; font-weight:700; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.20);
    }
    .bus-overlay .fav-action:hover{ filter:brightness(0.95); }
    .bus-overlay .subtitle { color:#6b7280;font-size:12px;margin-top:4px; }
    .bus-overlay .close {
      position:absolute;top:6px;right:6px;background:transparent;border:none;
      color:#9ca3af;cursor:pointer;font-size:14px;
    }
    .bus-overlay-arrow {
      width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;
      border-top:10px solid #fff;filter:drop-shadow(0 -1px 0 rgba(0,0,0,0.08));
      position:absolute;left:50%;transform:translateX(-50%);bottom:-10px;
    }`;
        const style = document.createElement("style");
        style.innerHTML = css;
        document.head.appendChild(style);
        overlayCssInjectedRef.current = true;
    }, []);

    // 선택 실행 (줌/말풍선/도착정보)
    const handleStopClick = useCallback(
        async (stop, options = {}) => {
            setSelectedStop(stop);
            setArrivalInfo([]);
            setArrStatus("loading");

            // 모든 오버레이 닫고 대상 오픈
            markersRef.current.forEach(({ overlay }) => overlay && overlay.close());
            const found = markersRef.current.find(
                (m) => m.stop.node_id === stop.node_id
            );
            if (found?.overlay) {
                found.overlay.open(mapRef.current);
                // 버튼 라벨 현재 상태로 동기화
                const favBtn = found.overlay.getContent()?.querySelector?.(
                    ".fav-action"
                );
                if (favBtn)
                    favBtn.textContent = isFavoriteNow(stop)
                        ? "즐겨찾기 해제"
                        : "즐겨찾기 추가";
            }

            const map = mapRef.current;
            const latlng = new kakao.maps.LatLng(stop.latitude, stop.longitude);

            if (map) {
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
            }

            // fetch with abort
            if (abortRef.current) abortRef.current.abort();
            const controller = new AbortController();
            abortRef.current = controller;

            try {
                const res = await fetch(
                    `${BUS_API_BASE}/bus?nodeId=${encodeURIComponent(stop.node_id)}`,
                    { signal: controller.signal }
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                setArrivalInfo(Array.isArray(data) ? data : []);
                setArrStatus("ok");
            } catch (e) {
                if (e.name === "AbortError") {
                    setArrStatus("idle");
                    return;
                }
                setArrStatus("error");
            } finally {
                abortRef.current = null;
            }
        },
        [isFavoriteNow]
    );

    // 방향 변경 시 마커/클러스터 갱신 + bounds (CustomOverlay 포함)
    useEffect(() => {
        if (!mapRef.current || !clustererRef.current) return;

        ensureOverlayStyles();

        clustererRef.current.clear();
        markersRef.current.forEach(({ marker, overlay }) => {
            marker.setMap && marker.setMap(null);
            overlay && overlay.close();
        });
        markersRef.current = [];

        if (!filteredStops.length) return;

        const markers = [];
        const bounds = new kakao.maps.LatLngBounds();

        filteredStops.forEach((stop) => {
            const pos = new kakao.maps.LatLng(stop.latitude, stop.longitude);
            const marker = new kakao.maps.Marker({ position: pos });

            // 오버레이(즐겨찾기 버튼만)
            const root = document.createElement("div");
            root.style.position = "relative";
            root.innerHTML = `
        <div class="bus-overlay">
          <button class="close" aria-label="닫기">✕</button>
          <div class="title">
            <span class="badge">정류장</span>
            <span>${stop.node_nm}</span>
          </div>
          <div class="subtitle">ID: ${stop.node_id}</div>
          <button class="fav-action">${
                isFavoriteNow(stop) ? "즐겨찾기 해제" : "즐겨찾기 추가"
            }</button>
          <div class="bus-overlay-arrow"></div>
        </div>
      `;

            const overlay = new kakao.maps.CustomOverlay({
                content: root,
                position: pos,
                xAnchor: 0.5,
                yAnchor: 1.15,
                clickable: true,
            });
            overlay.open = (map) => overlay.setMap(map);
            overlay.close = () => overlay.setMap(null);

            // 버튼 액션
            root.querySelector(".close").onclick = () => overlay.close();

            const favBtn = root.querySelector(".fav-action");
            favBtn.onclick = () => {
                const nextIsFav = !isFavoriteNow(stop);
                toggleFavorite(stop);
                favBtn.textContent = nextIsFav ? "즐겨찾기 해제" : "즐겨찾기 추가";
            };

            kakao.maps.event.addListener(marker, "click", () => {
                handleStopClick(stop); // 확대 없이 선택
            });

            markersRef.current.push({ stop, marker, overlay });
            markers.push(marker);
            bounds.extend(pos);
        });

        clustererRef.current.addMarkers(markers);
        if (!bounds.isEmpty()) mapRef.current.setBounds(bounds, 30, 30, 30, 140);
    }, [filteredStops, ensureOverlayStyles]); // eslint-disable-line react-hooks/exhaustive-deps

    // 다른 방향 즐겨찾기 점프: 방향 전환 → 선택
    const jumpToStop = useCallback(
        (stop) => {
            if (stop.direction && stop.direction !== directionFilter) {
                pendingSelectRef.current = stop;
                setDirectionFilter(stop.direction);
                return;
            }
            handleStopClick(stop, { zoom: true });
        },
        [directionFilter, handleStopClick]
    );

    // 방향 변경 후 마커가 갱신되면 대기 중인 선택 실행
    useEffect(() => {
        if (!pendingSelectRef.current) return;
        if (!filteredStops.length) return;
        const target = pendingSelectRef.current;
        const inList = filteredStops.find((s) => s.node_id === target.node_id);
        if (inList) {
            pendingSelectRef.current = null;
            handleStopClick(inList, { zoom: true });
        }
    }, [filteredStops, handleStopClick]);

    // 검색 제출
    const submitSearch = useCallback(() => {
        if (!mapRef.current || !filteredStops.length) return;

        if (selectedSuggestion >= 0 && suggestions[selectedSuggestion]) {
            handleStopClick(suggestions[selectedSuggestion], { zoom: true });
            setShowSuggestions(false);
            return;
        }

        const q = search.trim();
        if (!q) return;

        const matched = filteredStops.find((s) => s.node_nm.includes(q));
        if (matched) {
            handleStopClick(matched, { zoom: true });
            setShowSuggestions(false);
        } else {
            alert("일치하는 정류장이 없습니다.");
        }
    }, [filteredStops, search, selectedSuggestion, suggestions, handleStopClick]);

    const onSearchKeyDown = (e) => {
        if (!showSuggestions || suggestions.length === 0) {
            if (e.key === "Enter") submitSearch();
            return;
        }
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedSuggestion((p) => (p + 1) % suggestions.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedSuggestion((p) => (p - 1 + suggestions.length) % suggestions.length);
        } else if (e.key === "Enter") {
            e.preventDefault();
            submitSearch();
        } else if (e.key === "Escape") {
            setShowSuggestions(false);
        }
    };

    // minimalist SVG (이모지 대체)
    const TargetIcon = ({ className }) => (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
            <circle cx="12" cy="12" r="3" fill="currentColor"/>
        </svg>
    );
    const RefreshIcon = ({ className }) => (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            {/* 반원 + 화살촉 */}
            <path d="M20 12a8 8 0 10-3.3 6.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M20 8v4h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );

    // ===== 바텀시트: 자유 스크롤 + 드래그 리사이즈 =====
    const [sheetPct, setSheetPct] = useState(0.45); // 0~1 (기본 45%)
    const [dragging, setDragging] = useState(false);
    const startRef = useRef({ y: 0, pct: 0 });
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    const onHandlePointerDown = (e) => {
        setDragging(true);
        const clientY = e.clientY ?? (e.touches ? e.touches[0].clientY : 0);
        startRef.current = { y: clientY, pct: sheetPct };
        e.currentTarget.setPointerCapture?.(e.pointerId ?? 0);
        document.body.style.userSelect = "none";
    };
    const onHandlePointerMove = (e) => {
        if (!dragging) return;
        const clientY = e.clientY ?? (e.touches ? e.touches[0].clientY : 0);
        const deltaY = clientY - startRef.current.y; // 아래로 +값
        const vh = window.innerHeight || 1;
        const next = startRef.current.pct - (deltaY / vh);
        setSheetPct(clamp(next, 0.2, 0.9)); // 최소 20%, 최대 90%
    };
    const onHandlePointerUp = () => {
        if (!dragging) return;
        setDragging(false);
        document.body.style.userSelect = "";
    };

    // 선택 정류장 도착 정보만 새로고침
    const refreshArrival = useCallback(async () => {
        if (!selectedStop) return;
        setArrStatus("loading");

        // 이전 요청 중단
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        // 최소 2초 대기 함수
        const wait = (ms) => new Promise((res) => setTimeout(res, ms));

        try {
            const res = await Promise.all([
                fetch(
                    `${BUS_API_BASE}/bus?nodeId=${encodeURIComponent(selectedStop.node_id)}`,
                    { signal: controller.signal }
                ).then((r) => {
                    if (!r.ok) throw new Error(`HTTP ${r.status}`);
                    return r.json();
                }),
                wait(2000), // 최소 2초 로딩
            ]);

            const data = res[0];
            setArrivalInfo(Array.isArray(data) ? data : []);
            setArrStatus("ok");
        } catch (e) {
            if (e.name === "AbortError") {
                setArrStatus("idle");
                return;
            }
            setArrStatus("error");
        } finally {
            abortRef.current = null;
        }
    }, [selectedStop]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100">
            {/* 상단 앱바 */}
            <header className="sticky top-0 z-30 backdrop-blur bg-white/80 border-b border-emerald-100">
                <div className="max-w-screen-md mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={goBack}
                                className="mr-2 px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-800 hover:bg-white hover:shadow-sm active:scale-95 transition inline-flex items-center gap-1"
                                aria-label="뒤로가기"
                                title="뒤로가기"
                            >
                                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden="true">
                                    <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <span className="text-sm font-medium">뒤로</span>
                            </button>
                            {/* 브랜드 배지 + 타이틀 */}
                            <span className="inline-block px-2.5 py-1 text-[11px] font-semibold tracking-wider text-emerald-700 bg-emerald-100 rounded-full">
                Bustory
              </span>
                            <h1 className="text-lg font-bold text-emerald-900 tracking-tight">실시간 버스</h1>
                        </div>
                        {/* 세그먼트 토글 */}
                        <div className="inline-flex rounded-xl border border-emerald-200 bg-emerald-50 p-1">
                            {["마산", "칠원"].map((dir) => (
                                <button
                                    key={dir}
                                    onClick={() => setDirectionFilter(dir)}
                                    className={
                                        "px-3 py-1.5 rounded-lg text-sm font-semibold transition " +
                                        (directionFilter === dir
                                            ? "bg-white text-emerald-900 shadow"
                                            : "text-emerald-700 hover:text-emerald-900")
                                    }
                                >
                                    {dir}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 즐겨찾기 바 (현재 방향만) */}
                    {(favoritesByDir[directionFilter]?.length ?? 0) > 0 && (
                        <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
                            <span className="text-xs text-emerald-700 shrink-0">즐겨찾기:</span>
                            {favoritesByDir[directionFilter].map((fav) => (
                                <button
                                    key={fav.node_id}
                                    onClick={() => jumpToStop(fav)}
                                    className="shrink-0 px-3 py-1.5 rounded-full text-sm bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-white hover:shadow-sm transition"
                                    title={fav.node_nm}
                                >
                                    {fav.node_nm}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </header>

            {/* 지도 영역 */}
            <main className="relative">
                <div ref={containerRef} className="w-full h-[72vh] sm:h-[74vh] bg-emerald-100/40" />

                {/* 지도 위 검색 바 */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[92%] max-w-screen-md px-2 z-20">
                    <div className="relative">
                        <div className="flex items-center gap-2 bg-white border border-emerald-200 rounded-2xl shadow-sm px-3 py-2.5">
                            <input
                                value={rawSearch}
                                onChange={(e) => {
                                    setRawSearch(e.target.value);
                                    setShowSuggestions(true);
                                }}
                                onKeyDown={onSearchKeyDown}
                                placeholder="정류장 이름 검색"
                                className="w-full outline-none text-sm text-emerald-900 placeholder:text-emerald-400"
                            />
                            <button
                                onClick={submitSearch}
                                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-emerald-700 text-white hover:bg-emerald-600 active:scale-95 transition"
                                aria-label="검색"
                            >
                                검색
                            </button>
                        </div>

                        {/* 자동완성 */}
                        {showSuggestions && suggestions.length > 0 && (
                            <ul className="absolute mt-2 w-full bg-white border border-emerald-200 rounded-xl shadow-lg max-h-64 overflow-auto">
                                {suggestions.map((s, idx) => (
                                    <li
                                        key={s.node_id}
                                        onMouseDown={() => {
                                            setShowSuggestions(false);
                                            handleStopClick(s, { zoom: true }); // 검색 선택 시 확대
                                        }}
                                        className={
                                            "px-3 py-2 text-sm cursor-pointer " +
                                            (selectedSuggestion === idx ? "bg-emerald-50" : "hover:bg-emerald-50/60")
                                        }
                                    >
                                        {s.node_nm}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* FAB: 선택 정류장으로 이동 */}
                <div className="absolute right-4 bottom-[28vh] sm:bottom-[26vh] z-20">
                    <button
                        onClick={() => {
                            if (!selectedStop) return;
                            const latlng = new kakao.maps.LatLng(
                                selectedStop.latitude,
                                selectedStop.longitude
                            );
                            mapRef.current && mapRef.current.panTo(latlng);
                        }}
                        className="w-12 h-12 rounded-full bg-white shadow-lg border border-emerald-200 grid place-items-center hover:shadow-xl active:scale-95 transition"
                        title="선택 정류장으로 이동"
                        aria-label="선택 정류장으로 이동"
                    >
                        <TargetIcon className="w-5 h-5 text-emerald-700" />
                    </button>
                </div>

                {/* 바텀 시트: 드래그 높이 + 내부 스크롤 */}
                <section className="fixed bottom-0 left-0 right-0 z-30">
                    <div
                        className="max-w-screen-md mx-auto px-4"
                        style={{ height: `${Math.round(sheetPct * 100)}vh` }} // 시트 높이
                    >
                        <div className="bg-white border border-emerald-200 rounded-t-2xl shadow-lg h-full flex flex-col">
                            {/* 드래그 핸들 */}
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
                                    className="w-12 h-1.5 bg-emerald-300 rounded-full mx-auto cursor-grab active:cursor-grabbing select-none"
                                    style={{ touchAction: "none" }} // 드래그 우선
                                    aria-label="바텀시트 높이 조절"
                                    role="separator"
                                />
                                {/* 빠른 토글 버튼 (25%/75%) */}
                                <button
                                    className="absolute right-3 top-1.5 text-xs text-emerald-700 hover:text-emerald-900 px-2 py-0.5 rounded-md hover:bg-emerald-50 transition"
                                    onClick={() => setSheetPct((p) => (p >= 0.6 ? 0.25 : 0.75))}
                                >
                                    {sheetPct >= 0.6 ? "아래로" : "위로"}
                                </button>
                            </div>

                            {/* 내용: 독립 스크롤 영역 */}
                            <div className="flex-1 min-h-0 overflow-y-auto p-4">
                                {selectedStop ? (
                                    <>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-emerald-100 rounded-full grid place-items-center">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                                                </div>
                                                <div>
                                                    <h2 className="text-base font-bold text-emerald-900">
                                                        {selectedStop.node_nm}
                                                    </h2>
                                                    <p className="text-xs text-emerald-700">정류장 도착 정보</p>
                                                </div>
                                            </div>

                                            {/* 우측 액션: 새로고침 */}
                                            {/* 우측 액션: 새로고침 (아이콘만) */}
                                            <button
                                                onClick={refreshArrival}
                                                disabled={!selectedStop || arrStatus === "loading"}
                                                className={
                                                    "w-8 h-8 rounded-full border grid place-items-center active:scale-95 transition " +
                                                    (arrStatus === "loading"
                                                        ? "border-emerald-200 text-emerald-300 cursor-not-allowed"
                                                        : "border-emerald-300 text-emerald-700 hover:bg-emerald-50")
                                                }
                                                title="도착 정보 새로고침"
                                                aria-label="도착 정보 새로고침"
                                            >
                                                {arrStatus === "loading" ? (
                                                    // 로딩 중엔 아이콘을 회전
                                                    <RefreshIcon className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <RefreshIcon className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>

                                        <div className="border-top border-emerald-100 pt-4">
                                            {arrStatus === "loading" && (
                                                <div className="space-y-2">
                                                    {[...Array(6)].map((_, i) => (
                                                        <div key={i} className="h-14 rounded-lg bg-emerald-100/60 animate-pulse" />
                                                    ))}
                                                </div>
                                            )}

                                            {arrStatus === "error" && (
                                                <div className="text-center py-6">
                                                    <p className="text-red-600 font-medium">정보를 불러올 수 없습니다</p>
                                                    <p className="text-xs text-emerald-700 mt-1">잠시 후 다시 시도해 주세요.</p>
                                                </div>
                                            )}

                                            {arrStatus === "ok" && Array.isArray(arrivalInfo) && arrivalInfo.length === 0 && (
                                                <div className="text-center py-6">
                                                    <p className="text-emerald-700">운행 중인 버스가 없습니다</p>
                                                </div>
                                            )}

                                            {arrStatus === "ok" && Array.isArray(arrivalInfo) && arrivalInfo.length > 0 && (
                                                <div className="space-y-3">
                                                    <h4 className="text-sm font-semibold text-emerald-700">
                                                        도착 예정 버스 ({arrivalInfo.length}개)
                                                    </h4>
                                                    {arrivalInfo.map((bus, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-100"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 bg-emerald-600 text-white rounded-full grid place-items-center text-xs font-bold">
                                                                    {bus.routeNo}
                                                                </div>
                                                                <div>
                                                                    <p className="font-semibold text-emerald-900">
                                                                        {bus.routeNo}번 버스
                                                                    </p>
                                                                    <p className="text-xs text-emerald-700">
                                                                        {bus.arrPrevStationCnt}개 정류장 전
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div
                                                                    className={
                                                                        "text-lg font-bold " +
                                                                        (bus.arrTime <= 1
                                                                            ? "text-red-500"
                                                                            : bus.arrTime <= 3
                                                                                ? "text-orange-500"
                                                                                : "text-emerald-900")
                                                                    }
                                                                >
                                                                    {bus.arrTime}분
                                                                </div>
                                                                <div className="text-xs text-emerald-700">후 도착</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="py-10 text-center">
                                        <p className="text-emerald-900 font-semibold">정류장을 선택하세요</p>
                                        <p className="text-emerald-700 text-sm mt-1">
                                            지도에서 정류장을 누르거나 상단 검색창을 이용해 찾을 수 있습니다.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default BusMap;