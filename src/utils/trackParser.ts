import type { Coordinates } from '../types';

export type TrackFormat = 'gpx' | 'kml';

export interface ParsedTrack {
  points: Coordinates[];
  lengthKm: number;
  format: TrackFormat;
}

const EARTH_RADIUS_KM = 6371;
const MAX_POINTS = 1200;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function trackLengthKm(points: Coordinates[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineKm(points[i - 1], points[i]);
  }
  return total;
}

function isValidCoord(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

// Evenly thin a dense track so the route fits inside a single Firestore document.
function downsample(points: Coordinates[], max = MAX_POINTS): Coordinates[] {
  if (points.length <= max) return points;
  const step = points.length / max;
  const out: Coordinates[] = [];
  for (let i = 0; i < max; i++) out.push(points[Math.floor(i * step)]);
  out.push(points[points.length - 1]);
  return out;
}

function parseGpx(doc: Document): Coordinates[] {
  const points: Coordinates[] = [];
  let nodes = doc.querySelectorAll('trkpt, rtept');
  if (nodes.length === 0) nodes = doc.querySelectorAll('wpt');
  nodes.forEach((node) => {
    const lat = parseFloat(node.getAttribute('lat') ?? '');
    const lon = parseFloat(node.getAttribute('lon') ?? '');
    if (isValidCoord(lat, lon)) points.push({ latitude: lat, longitude: lon });
  });
  return points;
}

function parseKml(doc: Document): Coordinates[] {
  const points: Coordinates[] = [];

  // Standard <coordinates>lon,lat[,ele] lon,lat[,ele] ...</coordinates>
  doc.querySelectorAll('coordinates').forEach((node) => {
    (node.textContent ?? '')
      .trim()
      .split(/\s+/)
      .forEach((tuple) => {
        const [lonS, latS] = tuple.split(',');
        const lon = parseFloat(lonS);
        const lat = parseFloat(latS);
        if (isValidCoord(lat, lon)) points.push({ latitude: lat, longitude: lon });
      });
  });

  // gx:Track variant: <gx:coord>lon lat ele</gx:coord>
  if (points.length === 0) {
    doc.querySelectorAll('*|coord').forEach((node) => {
      const [lonS, latS] = (node.textContent ?? '').trim().split(/\s+/);
      const lon = parseFloat(lonS);
      const lat = parseFloat(latS);
      if (isValidCoord(lat, lon)) points.push({ latitude: lat, longitude: lon });
    });
  }

  return points;
}

export function detectFormat(fileName: string, content: string): TrackFormat | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.gpx')) return 'gpx';
  if (lower.endsWith('.kml')) return 'kml';
  if (/<gpx[\s>]/i.test(content)) return 'gpx';
  if (/<kml[\s>]/i.test(content)) return 'kml';
  return null;
}

export function parseTrack(fileName: string, content: string): ParsedTrack {
  const format = detectFormat(fileName, content);
  if (!format) {
    throw new Error('Непознат формат — поддржани се само .gpx и .kml.');
  }

  const doc = new DOMParser().parseFromString(content, 'application/xml');
  if (doc.querySelector('parsererror')) {
    throw new Error('Невалидна XML структура во датотеката.');
  }

  const points = format === 'gpx' ? parseGpx(doc) : parseKml(doc);
  if (points.length < 2) {
    throw new Error('Рутата мора да има барем 2 валидни точки.');
  }

  const lengthKm = Math.round(trackLengthKm(points) * 100) / 100;
  return { points: downsample(points), lengthKm, format };
}
