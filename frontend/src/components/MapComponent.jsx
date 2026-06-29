import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { AlertCircle, ArrowRight, ShieldAlert } from 'lucide-react';

// Helper component to center and zoom map dynamically when props change
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
}

// Function to generate custom SVG markers depending on severity
const getCustomMarkerIcon = (severity, status) => {
  let color = '#22c55e'; // Green for Low severity (<= 3)
  let glowColor = 'rgba(34, 197, 94, 0.4)';

  if (severity >= 7) {
    color = '#ef4444'; // Red for Critical (>= 7)
    glowColor = 'rgba(239, 68, 68, 0.4)';
  } else if (severity >= 4) {
    color = '#f59e0b'; // Yellow for Medium (4-6)
    glowColor = 'rgba(245, 158, 11, 0.4)';
  }

  // Active pulsing effect for active sprint tickets
  const showPulse = status !== 'Resolved' && status !== 'Closed';
  const pulseHtml = showPulse
    ? `<span class="absolute inline-flex h-full w-full rounded-full animate-ping opacity-75" style="background-color: ${color};"></span>`
    : '';

  return L.divIcon({
    html: `
      <div class="relative w-8 h-8 flex items-center justify-center">
        ${pulseHtml}
        <div class="relative w-4 h-4 rounded-full border-2 border-slate-950 shadow-lg" style="background-color: ${color};"></div>
      </div>
    `,
    className: 'custom-marker-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -10],
  });
};

export function MapComponent({ issues = [], riskZones = [], center = [37.7749, -122.4194], zoom = 12 }) {
  // Ensure we don't crash if issues list or center is invalid
  const mapCenter = center && center[0] && center[1] ? center : [37.7749, -122.4194];

  return (
    <div className="w-full h-full rounded-xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900 relative">
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full z-10"
      >
        <ChangeView center={mapCenter} zoom={zoom} />
        
        {/* Sleek Dark Mode CartoDB TileLayer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Predictive Failure Risk Zones (Purple Heatmaps) */}
        {riskZones.map((zone, idx) => {
          if (!zone.coordinates || zone.coordinates.length < 2) return null;
          const [lng, lat] = zone.coordinates;
          
          return (
            <Circle
              key={`risk-zone-${idx}`}
              center={[lat, lng]}
              radius={zone.radius || 150}
              pathOptions={{
                color: '#a855f7',
                fillColor: '#a855f7',
                fillOpacity: 0.25,
                weight: 2.5,
                dashArray: '3, 6',
              }}
            >
              <Popup>
                <div className="p-2 min-w-[220px]">
                  <div className="flex items-center space-x-1.5 text-purple-400 font-bold text-xs uppercase tracking-wider mb-1.5">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Predictive Risk Zone</span>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-100 mb-1">{zone.zoneName}</h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed mb-2.5">{zone.narrativeSummary}</p>
                  
                  <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-[10px] text-purple-300 font-medium mb-2.5">
                    <strong>Preventative Action:</strong> {zone.recommendedPreventativeAction}
                  </div>
                  
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    <span>Probability: <strong className="text-purple-400 font-extrabold">{zone.failureProbability}%</strong></span>
                    <span>Incidents: <strong className="text-purple-400 font-extrabold">{zone.affectedIssuesCount}</strong></span>
                  </div>
                </div>
              </Popup>
            </Circle>
          );
        })}

        {/* Dynamic Markers */}
        {issues.map((issue) => {
          // Verify issue coordinates exist
          if (!issue.location || !issue.location.coordinates || issue.location.coordinates.length < 2) {
            return null;
          }
          
          const [lng, lat] = issue.location.coordinates;
          const severityText = issue.severity >= 7 ? 'Critical' : issue.severity >= 4 ? 'Medium' : 'Low';
          const severityColor = issue.severity >= 7 ? 'text-red-400' : issue.severity >= 4 ? 'text-amber-400' : 'text-green-400';

          return (
            <Marker
              key={issue._id}
              position={[lat, lng]}
              icon={getCustomMarkerIcon(issue.severity, issue.status)}
            >
              <Popup>
                <div className="p-1 min-w-[220px]">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {issue.category}
                    </span>
                    <span className={`text-xs font-semibold uppercase ${severityColor}`}>
                      {severityText} ({issue.severity}/10)
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-100 mb-1 line-clamp-1">{issue.summary}</h4>
                  <p className="text-xs text-slate-400 mb-2 line-clamp-2">{issue.description}</p>
                  
                  <div className="flex flex-col gap-1 text-[11px] text-slate-500 mb-3">
                    <div>Department: <span className="text-slate-300">{issue.department}</span></div>
                    <div>Status: <span className="text-slate-300">{issue.status}</span></div>
                    {issue.verificationCount > 1 && (
                      <div className="text-emerald-400 font-medium">
                        Verified by {issue.verificationCount} citizens
                      </div>
                    )}
                  </div>

                  <Link
                    to={`/issues/${issue._id}`}
                    className="flex items-center justify-center space-x-1 w-full py-1.5 px-3 rounded bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all text-center"
                  >
                    <span>View Resolution Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

export default MapComponent;
