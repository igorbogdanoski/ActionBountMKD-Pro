import { useEffect, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Coordinates } from 'shared';

// Fix Leaflet's default icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapSelectorProps {
  initialCoordinates?: Coordinates;
  onLocationSelect?: (coords: Coordinates) => void;
  markers?: MapSelectorMarker[];
  onMarkerMove?: (markerId: string, coords: Coordinates) => void;
  onMarkerSelect?: (markerId: string) => void;
  onMapClick?: (coords: Coordinates) => void;
  connectMarkers?: boolean;
  height?: string;
}

export interface MapSelectorMarker {
  id: string;
  coordinates: Coordinates;
  label?: string;
  title?: string;
  draggable?: boolean;
}

function toCoordinates(latlng: L.LatLng): Coordinates {
  return {
    latitude: Number(latlng.lat.toFixed(6)),
    longitude: Number(latlng.lng.toFixed(6)),
  };
}

function AutoFitView({ positions }: { positions: L.LatLngTuple[] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 15);
      return;
    }

    map.fitBounds(L.latLngBounds(positions), { padding: [32, 32] });
  }, [map, positions]);

  return null;
}

function SingleLocationMarker({ position, setPosition }: { position: L.LatLng | null, setPosition: (pos: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker
      position={position}
      draggable
      eventHandlers={{
        dragend(event) {
          setPosition((event.target as L.Marker).getLatLng());
        },
      }}
    />
  );
}

function MultiMarkerLayer({
  markers,
  onMarkerMove,
  onMarkerSelect,
  onMapClick,
  connectMarkers,
}: Required<Pick<MapSelectorProps, 'markers'>> & Pick<MapSelectorProps, 'onMarkerMove' | 'onMarkerSelect' | 'onMapClick' | 'connectMarkers'>) {
  useMapEvents({
    click(event) {
      onMapClick?.(toCoordinates(event.latlng));
    },
  });

  const path = markers.map(marker => [marker.coordinates.latitude, marker.coordinates.longitude] as L.LatLngTuple);

  return (
    <>
      {connectMarkers && path.length > 1 && (
        <Polyline positions={path} color="#4F46E5" weight={3} opacity={0.8} />
      )}
      {markers.map(marker => (
        <Marker
          key={marker.id}
          position={[marker.coordinates.latitude, marker.coordinates.longitude]}
          draggable={marker.draggable ?? true}
          eventHandlers={{
            click() {
              onMarkerSelect?.(marker.id);
            },
            dragend(event) {
              const latlng = (event.target as L.Marker).getLatLng();
              onMarkerMove?.(marker.id, toCoordinates(latlng));
            },
          }}
        >
          {(marker.label || marker.title) && (
            <Tooltip permanent direction="top" offset={[0, -14]}>
              {marker.label ?? marker.title}
            </Tooltip>
          )}
        </Marker>
      ))}
    </>
  );
}

export function MapSelector({
  initialCoordinates,
  onLocationSelect,
  markers,
  onMarkerMove,
  onMarkerSelect,
  onMapClick,
  connectMarkers = false,
  height = '300px',
}: MapSelectorProps) {
  const multiMode = !!markers;
  const [position, setPosition] = useState<L.LatLng | null>(
    initialCoordinates ? L.latLng(initialCoordinates.latitude, initialCoordinates.longitude) : null
  );

  const handlePositionChange = (latlng: L.LatLng) => {
    setPosition(latlng);
    onLocationSelect?.(toCoordinates(latlng));
  };

  const markerPositions = (markers ?? []).map(marker => [marker.coordinates.latitude, marker.coordinates.longitude] as L.LatLngTuple);
  const center: L.LatLngTuple = markerPositions[0]
    ?? (initialCoordinates
      ? [initialCoordinates.latitude, initialCoordinates.longitude]
      : [41.9981, 21.4254]); // Default to Skopje

  return (
    <div style={{ height, width: '100%', zIndex: 0 }} className="rounded-xl overflow-hidden border border-slate-200">
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <AutoFitView positions={multiMode ? markerPositions : (position ? [[position.lat, position.lng]] : [center])} />
        {multiMode ? (
          <MultiMarkerLayer
            markers={markers}
            onMarkerMove={onMarkerMove}
            onMarkerSelect={onMarkerSelect}
            onMapClick={onMapClick}
            connectMarkers={connectMarkers}
          />
        ) : (
          <SingleLocationMarker position={position} setPosition={handlePositionChange} />
        )}
      </MapContainer>
    </div>
  );
}

