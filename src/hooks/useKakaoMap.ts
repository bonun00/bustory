// src/hooks/useKakaoMap.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { BusStop } from '../types';

declare global {
    interface Window { kakao: any; }
}

export function useKakaoMap(
    containerRef: React.RefObject<HTMLDivElement | null>,
    allStops: BusStop[],
    handleStopClick: (stop: BusStop, options?: any) => void,
    toggleFavorite: (stop: BusStop) => void,
    isFavoriteNow: (stop: BusStop) => boolean,
    sheetPct: number
) {
    const mapRef = useRef<any>(null);
    const clustererRef = useRef<any>(null);
    const markersRef = useRef<{ stop: BusStop; marker: any; overlay: any }[]>([]);
    const [mapReady, setMapReady] = useState(false);
    const overlayZCounterRef = useRef(1000);
    const overlayCssInjectedRef = useRef(false);

    const handleStopClickRef = useRef(handleStopClick);
    const toggleFavoriteRef = useRef(toggleFavorite);
    const isFavoriteNowRef = useRef(isFavoriteNow);

    useEffect(() => { handleStopClickRef.current = handleStopClick; }, [handleStopClick]);
    useEffect(() => { toggleFavoriteRef.current = toggleFavorite; }, [toggleFavorite]);
    useEffect(() => { isFavoriteNowRef.current = isFavoriteNow; }, [isFavoriteNow]);

    const ensureOverlayStyles = useCallback(() => {
        if (overlayCssInjectedRef.current) return;
        const css = `
      .bus-overlay { background:#fff;border:1px solid rgba(0,0,0,0.08);border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,0.12);padding:10px 12px;min-width:190px; transform:translateY(-6px); position:relative; padding-bottom: 42px; z-index:1; }
      .bus-overlay .title { display:flex;align-items:center;gap:8px;font-weight:700;color:#064e3b;font-size:14px; }
      .bus-overlay .badge { background:#059669;color:#fff;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:700; }
      .bus-overlay .fav-action{ position:absolute; right:8px; bottom:8px; background:#f59e0b; color:#111827; border:none; border-radius:6px; padding:6px 10px; font-size:12px; font-weight:700; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.20); }
      .bus-overlay .fav-action:hover{ filter:brightness(0.95); }
      .bus-overlay .subtitle { color:#6b7280;font-size:12px;margin-top:4px; }
      .bus-overlay .close { position:absolute;top:6px;right:6px;background:transparent;border:none;color:#9ca3af;cursor:pointer;font-size:14px; }
      .bus-overlay .bus-overlay-arrow { width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:10px solid #fff;filter:drop-shadow(0 -1px 0 rgba(0,0,0,0.08));position:absolute;left:50%;transform:translateX(-50%);bottom:-10px; }
    `;
        const style = document.createElement("style");
        style.innerHTML = css;
        document.head.appendChild(style);
        overlayCssInjectedRef.current = true;
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;
        if (!(window.kakao && window.kakao.maps)) return;

        window.kakao.maps.load(() => {
            if (mapRef.current) return;

            const center = new window.kakao.maps.LatLng(35.227, 128.681);
            mapRef.current = new window.kakao.maps.Map(containerRef.current, { center, level: 5 });

            clustererRef.current = new window.kakao.maps.MarkerClusterer({
                map: mapRef.current,
                averageCenter: true,
                minLevel: 6,
                styles: [{
                    width: "36px",
                    height: "36px",
                    background: "rgba(16,185,129,0.92)",
                    color: "#fff",
                    borderRadius: "18px",
                    textAlign: "center",
                    lineHeight: "36px",
                    fontSize: "13px",
                    fontWeight: "700",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                }],
            });

            setMapReady(true);
        });
    }, [containerRef]);

    useEffect(() => {
        if (!mapReady || !mapRef.current || !clustererRef.current) return;
        const imageSrc = '/bus_marker.png';
        const imageSize = new window.kakao.maps.Size(64, 69);
        const markerImage = new window.kakao.maps.MarkerImage(imageSrc, imageSize);
        ensureOverlayStyles();

        clustererRef.current.clear();
        markersRef.current.forEach(({ marker, overlay }) => {
            marker.setMap && marker.setMap(null);
            overlay && overlay.close && overlay.close();
        });
        markersRef.current = [];

        if (!allStops.length) return;

        const markers: any[] = [];
        const bounds = new window.kakao.maps.LatLngBounds();

        allStops.forEach((stop) => {
            const pos = new window.kakao.maps.LatLng(stop.latitude, stop.longitude);
            const marker = new window.kakao.maps.Marker({ position: pos, zIndex: 1, image: markerImage});

            const root = document.createElement("div");
            root.style.position = "relative";
            const favLabel = () => (isFavoriteNowRef.current(stop) ? "즐겨찾기 해제" : "즐겨찾기 추가");

            root.innerHTML = `
        <div class="bus-overlay">
          <button class="close" aria-label="닫기">✕</button>
          <div class="title"><span class="badge">정류장</span><span>${stop.node_nm}</span></div>
          <div class="subtitle">ID: ${stop.node_id}</div>
          <button class="fav-action">${favLabel()}</button>
          <div class="bus-overlay-arrow"></div>
        </div>
      `;

            const overlay = new window.kakao.maps.CustomOverlay({
                content: root, position: pos, xAnchor: 0.5, yAnchor: 1.15, clickable: true,
                zIndex: overlayZCounterRef.current++,
            });

            (overlay as any).open = (map: any) => {
                overlay.setZIndex(overlayZCounterRef.current++);
                overlay.setMap(map);
            };
            (overlay as any).close = () => overlay.setMap(null);

            root.querySelector(".close")!.addEventListener('click', () => (overlay as any).close());

            const favBtn = root.querySelector(".fav-action") as HTMLButtonElement;
            favBtn.addEventListener('click', () => {
                overlay.setZIndex(overlayZCounterRef.current++);
                toggleFavoriteRef.current(stop);
                favBtn.textContent = favLabel();
            });

            window.kakao.maps.event.addListener(marker, "click", () => {
                (overlay as any).open(mapRef.current);
                handleStopClickRef.current(stop);
            });

            markersRef.current.push({ stop, marker, overlay });
            markers.push(marker);
            bounds.extend(pos);
        });

        clustererRef.current.addMarkers(markers);

        // 초기 1회만 전체 bounds 맞춤
        if (!bounds.isEmpty()) {
            const PAD = 40;
            mapRef.current.relayout();
            mapRef.current.setBounds(bounds, PAD, PAD, PAD, PAD);
        }
    }, [mapReady, allStops, ensureOverlayStyles]);

    // 줌아웃 상한 제한
    useEffect(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;
        const MAX_ZOOM_OUT_LEVEL = 8;
        const onZoomChanged = () => {
            if (map.getLevel() > MAX_ZOOM_OUT_LEVEL) {
                map.setLevel(MAX_ZOOM_OUT_LEVEL, { animate: false });
            }
        };
        window.kakao.maps.event.addListener(map, "zoom_changed", onZoomChanged);
        return () => {
            window.kakao.maps.event.removeListener(map, "zoom_changed", onZoomChanged);
        };
    }, [mapReady]);

    // 시트 높이 변화 시 레이아웃만 갱신
    useEffect(() => {
        if (!mapReady || !mapRef.current) return;
        mapRef.current.relayout();
    }, [mapReady, sheetPct]);

    return { mapRef, mapReady, markersRef };
}