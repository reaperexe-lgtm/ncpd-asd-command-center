import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Live GTA V map (Los Santos) using tile layers from
 * github.com/Trusted-Studios/mapStyles via jsDelivr CDN.
 * Stays sharp at high zoom thanks to Leaflet's tile system + maxNativeZoom upscaling.
 */
export default function GtaVMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;

    const base = "https://cdn.jsdelivr.net/gh/Trusted-Studios/mapStyles@main";

    const satellite = L.tileLayer(`${base}/styleSatelite/{z}/{x}/{y}.jpg`, {
      minZoom: 1,
      maxZoom: 8,
      maxNativeZoom: 5,
      noWrap: true,
      attribution: "GTA V Map",
    });
    const atlas = L.tileLayer(`${base}/styleAtlas/{z}/{x}/{y}.jpg`, {
      minZoom: 1, maxZoom: 8, maxNativeZoom: 5, noWrap: true,
    });
    const grid = L.tileLayer(`${base}/styleGrid/{z}/{x}/{y}.jpg`, {
      minZoom: 1, maxZoom: 8, maxNativeZoom: 5, noWrap: true,
    });

    const map = L.map(mapRef.current, {
      crs: L.CRS.Simple,
      minZoom: 1,
      maxZoom: 8,
      zoomControl: true,
      attributionControl: false,
      layers: [satellite],
      zoomSnap: 0.25,
      wheelPxPerZoomLevel: 80,
    });

    // Tiles cover (0,0) to (256,256) at zoom 0 → at zoom 5 the world is 256*32 = 8192px.
    // Use simple coord system where tile (0,0) at z=0 = bounds [[-128,-128],[128,128]].
    const bounds: L.LatLngBoundsLiteral = [[-128, -128], [128, 128]];
    map.fitBounds(bounds);
    map.setMaxBounds([[-200, -200], [200, 200]]);

    L.control.layers(
      { Satellit: satellite, Atlas: atlas, Grid: grid },
      {},
      { position: "topright", collapsed: false }
    ).addTo(map);

    leafletRef.current = map;

    return () => {
      map.remove();
      leafletRef.current = null;
    };
  }, []);

  return (
    <div
      ref={mapRef}
      className="w-full bg-card border border-border rounded-lg overflow-hidden"
      style={{ height: "82vh" }}
    />
  );
}