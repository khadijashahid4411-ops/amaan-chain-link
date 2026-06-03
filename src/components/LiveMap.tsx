/// <reference types="google.maps" />
import { useEffect, useRef } from "react";
import { loadMapsLibrary } from "@/lib/maps";

export interface MapMarkerSpec {
  id: string;
  lat: number;
  lng: number;
  title?: string;
  color?: "primary" | "accent" | "success" | "warning" | "muted";
}

interface Props {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarkerSpec[];
  className?: string;
  onMarkerClick?: (id: string) => void;
  /** Optional polyline path drawn in order (e.g. responder → emergency). */
  route?: { lat: number; lng: number }[];
  /** Optional radius circle (km) centered on `circle.center`. */
  circle?: { center: { lat: number; lng: number }; radiusKm: number; color?: string };
}

const COLORS: Record<NonNullable<MapMarkerSpec["color"]>, string> = {
  primary: "#dc2626",
  accent: "#0ea5e9",
  success: "#16a34a",
  warning: "#eab308",
  muted: "#94a3b8",
};

export const LiveMap = ({ center, zoom = 14, markers = [], className, onMarkerClick, route, circle }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRefs = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);

  // Initialize map
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { Map } = await loadMapsLibrary("maps");
        if (cancelled || !ref.current) return;
        mapRef.current = new Map(ref.current, {
          center,
          zoom,
          mapId: "AMAANCHAIN_MAP",
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
        });
      } catch (e) {
        console.error("Map init failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recenter
  useEffect(() => {
    if (mapRef.current) mapRef.current.panTo(center);
  }, [center.lat, center.lng]);

  // Sync markers
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { AdvancedMarkerElement, PinElement } = await loadMapsLibrary("marker");
      if (cancelled || !mapRef.current) return;

      const seen = new Set<string>();
      for (const m of markers) {
        seen.add(m.id);
        const existing = markerRefs.current.get(m.id);
        if (existing) {
          existing.position = { lat: m.lat, lng: m.lng };
          continue;
        }
        const pin = new PinElement({
          background: COLORS[m.color ?? "primary"],
          borderColor: "#ffffff",
          glyphColor: "#ffffff",
          scale: 1.1,
        });
        const marker = new AdvancedMarkerElement({
          map: mapRef.current,
          position: { lat: m.lat, lng: m.lng },
          title: m.title,
          content: pin.element,
        });
        if (onMarkerClick) marker.addListener("click", () => onMarkerClick(m.id));
        markerRefs.current.set(m.id, marker);
      }
      // remove stale
      for (const [id, mk] of markerRefs.current) {
        if (!seen.has(id)) {
          mk.map = null;
          markerRefs.current.delete(id);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [markers, onMarkerClick]);

  // Sync polyline route
  useEffect(() => {
    if (!mapRef.current) return;
    if (!route || route.length < 2) {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      return;
    }
    if (!polylineRef.current) {
      polylineRef.current = new google.maps.Polyline({
        map: mapRef.current,
        path: route,
        geodesic: true,
        strokeColor: "#0ea5e9",
        strokeOpacity: 0.9,
        strokeWeight: 4,
      });
    } else {
      polylineRef.current.setPath(route);
    }
  }, [route]);

  return <div ref={ref} className={className ?? "h-full w-full rounded-xl overflow-hidden"} />;
};
