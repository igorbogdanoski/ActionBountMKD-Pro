import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useState } from 'react';
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
  onLocationSelect: (coords: Coordinates) => void;
  height?: string;
}

function LocationMarker({ position, setPosition }: { position: L.LatLng | null, setPosition: (pos: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export function MapSelector({ initialCoordinates, onLocationSelect, height = '300px' }: MapSelectorProps) {
  const [position, setPosition] = useState<L.LatLng | null>(
    initialCoordinates ? L.latLng(initialCoordinates.latitude, initialCoordinates.longitude) : null
  );

  const handlePositionChange = (latlng: L.LatLng) => {
    setPosition(latlng);
    onLocationSelect({ latitude: latlng.lat, longitude: latlng.lng });
  };

  const center: L.LatLngTuple = initialCoordinates 
    ? [initialCoordinates.latitude, initialCoordinates.longitude] 
    : [41.9981, 21.4254]; // Default to Skopje

  return (
    <div style={{ height, width: '100%', zIndex: 0 }} className="rounded-xl overflow-hidden border border-slate-200">
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={position} setPosition={handlePositionChange} />
      </MapContainer>
    </div>
  );
}

