import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Pt = { x: number; y: number }; // 0-100 percent
type Loc = {
  id: string; name: string; color: string; x_percent: number; y_percent: number;
  is_hidden: boolean; icon: string | null; icon_type: string;
};
type Area = { id: string; name: string; color: string; fill_opacity: number; points: Pt[]; is_hidden: boolean };
type Draw = { id: string; name: string; color: string; stroke_width: number; points: Pt[]; is_hidden: boolean };

type Props = {
  locations: Loc[];
  areas: Area[];
  drawings: Draw[];
  mode: null | "marker" | "area" | "draw";
  drawingPoints: Pt[];
  color: string;
  canEdit: boolean;
  onMapClick: (p: Pt) => void;
  onMarkerClick: (l: Loc) => void;
  onAreaClick: (a: Area) => void;
  onDrawClick: (d: Draw) => void;
};

// CRS.Simple coordinate system. Tile (0,0) z=0 covers lng [0,256] lat [-256,0].
// Map our 0-100 percent → lng = x/100*256, lat = -y/100*256.
const pctToLatLng = (p: Pt): L.LatLngTuple => [-(p.y / 100) * 256, (p.x / 100) * 256];
const latLngToPct = (ll: L.LatLng): Pt => ({ x: (ll.lng / 256) * 100, y: (-ll.lat / 256) * 100 });

export default function GtaVMap(props: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<L.Map | null>(null);
  const overlayRef = useRef<L.LayerGroup | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  // Init map once
  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;
    const base = "https://cdn.jsdelivr.net/gh/Trusted-Studios/mapStyles@main";
    const satellite = L.tileLayer(`${base}/styleSatelite/{z}/{x}/{y}.jpg`, {
      minZoom: 1, maxZoom: 8, maxNativeZoom: 5, noWrap: true,
    });
    const atlas = L.tileLayer(`${base}/styleAtlas/{z}/{x}/{y}.jpg`, {
      minZoom: 1, maxZoom: 8, maxNativeZoom: 5, noWrap: true,
    });
    const grid = L.tileLayer(`${base}/styleGrid/{z}/{x}/{y}.jpg`, {
      minZoom: 1, maxZoom: 8, maxNativeZoom: 5, noWrap: true,
    });
    const map = L.map(mapRef.current, {
      crs: L.CRS.Simple, minZoom: 1, maxZoom: 8,
      attributionControl: false, zoomSnap: 0.25, wheelPxPerZoomLevel: 80,
      layers: [satellite],
    });
    const bounds: L.LatLngBoundsLiteral = [[-256, 0], [0, 256]];
    map.fitBounds(bounds);
    map.setMaxBounds([[-300, -50], [50, 300]]);
    L.control.layers({ Satellit: satellite, Atlas: atlas, Grid: grid }, {}, { position: "topright", collapsed: false }).addTo(map);

    overlayRef.current = L.layerGroup().addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      const p = propsRef.current;
      if (!p.mode || !p.canEdit) return;
      const pt = latLngToPct(e.latlng);
      p.onMapClick(pt);
    });

    const recenter = () => { map.invalidateSize(); };
    requestAnimationFrame(recenter);
    setTimeout(recenter, 200);
    const ro = new ResizeObserver(recenter);
    ro.observe(mapRef.current);

    leafletRef.current = map;
    return () => { ro.disconnect(); map.remove(); leafletRef.current = null; };
  }, []);

  // Re-render overlay whenever data changes
  useEffect(() => {
    const map = leafletRef.current; const layer = overlayRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    // Areas
    props.areas.forEach(a => {
      const poly = L.polygon(a.points.map(pctToLatLng), {
        color: a.color, weight: 2, fillColor: a.color, fillOpacity: a.fill_opacity,
      }).addTo(layer);
      poly.on("click", (e) => { L.DomEvent.stopPropagation(e); props.onAreaClick(a); });
      if (a.name) poly.bindTooltip(a.name, { permanent: true, direction: "center", className: "gta-area-label" });
    });

    // Drawings (lines)
    props.drawings.forEach(d => {
      const line = L.polyline(d.points.map(pctToLatLng), {
        color: d.color, weight: d.stroke_width, opacity: 0.9,
      }).addTo(layer);
      line.on("click", (e) => { L.DomEvent.stopPropagation(e); props.onDrawClick(d); });
      if (d.name) line.bindTooltip(d.name, { sticky: true });
    });

    // Markers
    props.locations.forEach(l => {
      const html = l.icon_type === "emoji" && l.icon
        ? `<div class="gta-marker"><div class="gta-marker-label" style="border-color:${l.color};color:${l.color}">${l.name}${l.is_hidden ? " 🔒" : ""}</div><div class="gta-marker-icon" style="font-size:24px">${l.icon}</div></div>`
        : `<div class="gta-marker"><div class="gta-marker-label" style="border-color:${l.color};color:${l.color}">${l.name}${l.is_hidden ? " 🔒" : ""}</div><svg width="22" height="22" viewBox="0 0 24 24" fill="${l.color}" stroke="${l.color}" stroke-width="2"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="white"/></svg></div>`;
      const icon = L.divIcon({ html, className: "", iconSize: [0, 0], iconAnchor: [0, 36] });
      const m = L.marker(pctToLatLng({ x: l.x_percent, y: l.y_percent }), { icon }).addTo(layer);
      m.on("click", (e) => { L.DomEvent.stopPropagation(e); props.onMarkerClick(l); });
    });

    // Live drawing preview
    if (props.drawingPoints.length > 0) {
      if (props.mode === "area") {
        L.polygon(props.drawingPoints.map(pctToLatLng), {
          color: props.color, weight: 2, dashArray: "4,4", fillOpacity: 0.2,
        }).addTo(layer);
      } else if (props.mode === "draw") {
        L.polyline(props.drawingPoints.map(pctToLatLng), {
          color: props.color, weight: 3, dashArray: "4,4",
        }).addTo(layer);
      }
    }
  }, [props.locations, props.areas, props.drawings, props.drawingPoints, props.mode, props.color]);

  // Cursor feedback for placing mode
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.style.cursor = props.mode ? "crosshair" : "";
  }, [props.mode]);

  return (
    <>
      <style>{`
        .gta-marker { display:flex; flex-direction:column; align-items:center; transform: translateX(-50%); }
        .gta-marker-label { padding:2px 6px; border-radius:4px; background:hsl(var(--background)/0.95); border:1px solid; font-size:11px; font-weight:600; white-space:nowrap; margin-bottom:2px; box-shadow:0 1px 3px rgba(0,0,0,0.4); }
        .gta-marker-icon { line-height:1; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.6)); }
        .gta-area-label { background:rgba(0,0,0,0.7) !important; color:#fff !important; border:none !important; font-weight:600 !important; box-shadow:none !important; }
        .gta-area-label::before { display:none !important; }
        .leaflet-container { background: hsl(var(--card)); }
      `}</style>
      <div ref={mapRef} className="w-full bg-card border border-border rounded-lg overflow-hidden" style={{ height: "82vh" }} />
    </>
  );
}
