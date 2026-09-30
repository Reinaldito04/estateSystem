"use client";

import { useRef, useState } from "react";
import { MapPin, Minus, Plus } from "lucide-react";

export interface PropertyLocation {
  latitude: number;
  longitude: number;
}

interface LocationPickerProps {
  value: PropertyLocation | null;
  onChange: (location: PropertyLocation) => void;
}

const DEFAULT_CENTER = { latitude: 10.4806, longitude: -66.9036 };
const TILE_SIZE = 256;
const MAX_LATITUDE = 85.05112878;

function toWorldPoint(location: PropertyLocation, zoom: number) {
  const worldSize = TILE_SIZE * 2 ** zoom;
  const latitude = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, location.latitude));
  const sinLatitude = Math.sin((latitude * Math.PI) / 180);

  return {
    x: ((location.longitude + 180) / 360) * worldSize,
    y: (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) * worldSize,
  };
}

function fromWorldPoint(point: { x: number; y: number }, zoom: number): PropertyLocation {
  const worldSize = TILE_SIZE * 2 ** zoom;
  const rawLongitude = (point.x / worldSize) * 360 - 180;
  const longitude = ((rawLongitude + 180) % 360 + 360) % 360 - 180;
  const latitude = (Math.atan(Math.sinh(Math.PI * (1 - (2 * point.y) / worldSize))) * 180) / Math.PI;

  return { latitude, longitude };
}

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [center, setCenter] = useState<PropertyLocation>(value ?? DEFAULT_CENTER);
  const [zoom, setZoom] = useState(15);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const mapRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const centerPoint = toWorldPoint(center, zoom);
  const centerTileX = Math.floor(centerPoint.x / TILE_SIZE);
  const centerTileY = Math.floor(centerPoint.y / TILE_SIZE);
  const offsetX = centerPoint.x - centerTileX * TILE_SIZE;
  const offsetY = centerPoint.y - centerTileY * TILE_SIZE;
  const tileCount = 2 ** zoom;
  const markerOffset = value ? toWorldPoint(value, zoom) : null;

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    pointerStart.current = { x: event.clientX, y: event.clientY };
    setDragOffset({ x: 0, y: 0 });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStart.current) return;
    setDragOffset({
      x: event.clientX - pointerStart.current.x,
      y: event.clientY - pointerStart.current.y,
    });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start || !mapRef.current) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance > 5) {
      const nextCenter = fromWorldPoint(
        { x: centerPoint.x - deltaX, y: centerPoint.y - deltaY },
        zoom
      );
      setCenter(nextCenter);
      setDragOffset({ x: 0, y: 0 });
      return;
    }

    const bounds = mapRef.current.getBoundingClientRect();
    const location = fromWorldPoint(
      {
        x: centerPoint.x + event.clientX - bounds.left - bounds.width / 2,
        y: centerPoint.y + event.clientY - bounds.top - bounds.height / 2,
      },
      zoom
    );
    setCenter(location);
    setDragOffset({ x: 0, y: 0 });
    onChange(location);
  };

  const markerX = markerOffset ? markerOffset.x - centerPoint.x : 0;
  const markerY = markerOffset ? markerOffset.y - centerPoint.y : 0;

  return (
    <div className="space-y-2">
      <div
        ref={mapRef}
        className="relative h-72 overflow-hidden rounded-md border bg-muted touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          pointerStart.current = null;
          setDragOffset({ x: 0, y: 0 });
        }}
        aria-label="Mapa para seleccionar la ubicación del inmueble"
      >
        {Array.from({ length: 25 }, (_, index) => {
          const column = (index % 5) - 2;
          const row = Math.floor(index / 5) - 2;
          const tileX = ((centerTileX + column) % tileCount + tileCount) % tileCount;
          const tileY = centerTileY + row;

          if (tileY < 0 || tileY >= tileCount) return null;

          return (
            <img
              key={`${zoom}-${tileX}-${tileY}-${column}-${row}`}
              src={`https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`}
              alt=""
              draggable={false}
              className="pointer-events-none absolute h-64 w-64 max-w-none select-none"
              style={{
                left: `calc(50% + ${column * TILE_SIZE - offsetX + dragOffset.x}px)`,
                top: `calc(50% + ${row * TILE_SIZE - offsetY + dragOffset.y}px)`,
              }}
            />
          );
        })}

        {value && (
          <MapPin
            aria-label="Ubicación seleccionada"
            className="pointer-events-none absolute z-10 h-8 w-8 -translate-x-1/2 -translate-y-full fill-primary text-primary drop-shadow"
            style={{
              left: `calc(50% + ${markerX + dragOffset.x}px)`,
              top: `calc(50% + ${markerY + dragOffset.y}px)`,
            }}
          />
        )}

        <div className="absolute right-3 top-3 z-20 flex flex-col overflow-hidden rounded-md border bg-background shadow-sm">
          <button
            type="button"
            aria-label="Acercar mapa"
            title="Acercar"
            className="flex h-9 w-9 items-center justify-center hover:bg-muted"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => { event.stopPropagation(); setZoom((current) => Math.min(19, current + 1)); }}
          >
            <Plus className="h-4 w-4" />
          </button>
          <div className="h-px bg-border" />
          <button
            type="button"
            aria-label="Alejar mapa"
            title="Alejar"
            className="flex h-9 w-9 items-center justify-center hover:bg-muted"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => { event.stopPropagation(); setZoom((current) => Math.max(3, current - 1)); }}
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>

        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
          className="absolute bottom-1 right-1 z-20 rounded bg-background/90 px-1 text-[10px] text-muted-foreground"
          onPointerDown={(event) => event.stopPropagation()}
        >
          © OpenStreetMap
        </a>
      </div>
      <p className="text-xs text-muted-foreground">
        {value
          ? `Latitud ${value.latitude.toFixed(6)}, longitud ${value.longitude.toFixed(6)}`
          : "Haz clic en el mapa para marcar la ubicación. Puedes arrastrar el mapa para explorar."}
      </p>
    </div>
  );
}