"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, LocateFixed, MapPin, Minus, Plus } from "lucide-react";

type PropertyPhoto = { id: string; photoUrl: string; description: string | null };

interface PropertyPhotoGalleryProps {
  title: string;
  photos: PropertyPhoto[];
}

export function PropertyPhotoGallery({ title, photos }: PropertyPhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activePhoto = photos[activeIndex];

  return (
    <section className="relative min-h-64 overflow-hidden rounded-lg border bg-muted sm:min-h-80" aria-label="Galería de imágenes">
      {activePhoto ? (
        <>
          <img
            key={activePhoto.id}
            src={activePhoto.photoUrl}
            alt={activePhoto.description || title}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
          />
          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 via-black/30 to-transparent px-4 pb-4 pt-16 text-white sm:px-5">
            <div className="flex items-end justify-between gap-4">
              <p className="line-clamp-2 text-sm font-medium">{activePhoto.description || title}</p>
              <span className="shrink-0 rounded bg-black/40 px-2.5 py-1 text-xs font-semibold tabular-nums">
                {activeIndex + 1} / {photos.length}
              </span>
            </div>
          </div>
          {photos.length > 1 && (
            <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between px-3">
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="rounded-full bg-background/90 shadow-md hover:bg-background"
                aria-label="Ver imagen anterior"
                title="Imagen anterior"
                onClick={() => setActiveIndex((index) => (index - 1 + photos.length) % photos.length)}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="rounded-full bg-background/90 shadow-md hover:bg-background"
                aria-label="Ver imagen siguiente"
                title="Imagen siguiente"
                onClick={() => setActiveIndex((index) => (index + 1) % photos.length)}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          )}
          {photos.length > 1 && (
            <div className="absolute left-4 top-4 flex gap-1.5" aria-label="Seleccionar imagen">
              {photos.slice(0, 6).map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  aria-label={`Ver imagen ${index + 1}`}
                  aria-current={index === activeIndex}
                  className={`h-1.5 rounded-full transition-all ${index === activeIndex ? "w-7 bg-white" : "w-3 bg-white/55 hover:bg-white/85"}`}
                  onClick={() => setActiveIndex(index)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-linear-to-br from-primary/10 via-muted to-amber-500/10 text-muted-foreground">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border/70 bg-background/70">
            <MapPin className="h-7 w-7" />
          </div>
          <p className="text-sm font-medium">Sin imágenes en la galería</p>
        </div>
      )}
    </section>
  );
}

interface PropertyLocationMapProps {
  title: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
}

interface WorldPoint {
  x: number;
  y: number;
}

const TILE_SIZE = 256;
const MIN_ZOOM = 3;
const MAX_ZOOM = 19;
const INITIAL_ZOOM = 15;
const MAX_LATITUDE = 85.05112878;

function toWorldPoint(latitude: number, longitude: number, zoom: number): WorldPoint {
  const worldSize = TILE_SIZE * 2 ** zoom;
  const safeLatitude = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, latitude));
  const sinLatitude = Math.sin((safeLatitude * Math.PI) / 180);

  return {
    x: ((longitude + 180) / 360) * worldSize,
    y: (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) * worldSize,
  };
}

function fromWorldPoint(point: WorldPoint, zoom: number) {
  const worldSize = TILE_SIZE * 2 ** zoom;
  const rawLongitude = (point.x / worldSize) * 360 - 180;
  const longitude = ((rawLongitude + 180) % 360 + 360) % 360 - 180;
  const latitude = (Math.atan(Math.sinh(Math.PI * (1 - (2 * point.y) / worldSize))) * 180) / Math.PI;

  return { latitude, longitude };
}

export function PropertyLocationMap({ title, latitude, longitude, address, city }: PropertyLocationMapProps) {
  const [center, setCenter] = useState({ latitude, longitude });
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const mapRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const centerPoint = toWorldPoint(center.latitude, center.longitude, zoom);
  const centerTileX = Math.floor(centerPoint.x / TILE_SIZE);
  const centerTileY = Math.floor(centerPoint.y / TILE_SIZE);
  const offsetX = centerPoint.x - centerTileX * TILE_SIZE;
  const offsetY = centerPoint.y - centerTileY * TILE_SIZE;
  const tileCount = 2 ** zoom;
  const markerPoint = toWorldPoint(latitude, longitude, zoom);

  const tiles = Array.from({ length: 25 }, (_, index) => {
    const column = (index % 5) - 2;
    const row = Math.floor(index / 5) - 2;
    const rawTileX = centerTileX + column;
    const tileX = ((rawTileX % tileCount) + tileCount) % tileCount;
    const tileY = centerTileY + row;

    if (tileY < 0 || tileY >= tileCount) return null;

    return {
      key: `${zoom}-${tileX}-${tileY}-${column}-${row}`,
      url: `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`,
      left: column * TILE_SIZE - offsetX + dragOffset.x,
      top: row * TILE_SIZE - offsetY + dragOffset.y,
    };
  }).filter((tile): tile is NonNullable<typeof tile> => tile !== null);

  const markerX = markerPoint.x - centerPoint.x + dragOffset.x;
  const markerY = markerPoint.y - centerPoint.y + dragOffset.y;

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
    if (!start) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.hypot(deltaX, deltaY) > 4) {
      const nextCenter = fromWorldPoint({ x: centerPoint.x - deltaX, y: centerPoint.y - deltaY }, zoom);
      setCenter(nextCenter);
    }
    setDragOffset({ x: 0, y: 0 });
  };

  const adjustZoom = (direction: -1 | 1) => {
    setZoom((currentZoom) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom + direction)));
  };

  const resetView = () => {
    setCenter({ latitude, longitude });
    setZoom(INITIAL_ZOOM);
    setDragOffset({ x: 0, y: 0 });
  };

  return (
    <section className="flex min-h-72 flex-col overflow-hidden rounded-lg border bg-card sm:min-h-80" aria-label={`Mapa de ${title}`}>
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><MapPin className="h-4 w-4" /></span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Ubicación</h2>
            <p className="truncate text-xs text-muted-foreground">{city}</p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="icon" title="Centrar en el inmueble" aria-label="Centrar en el inmueble" onClick={resetView}>
          <LocateFixed className="h-4 w-4" />
        </Button>
      </div>

      <div
        ref={mapRef}
        className="relative min-h-56 flex-1 cursor-grab touch-none overflow-hidden bg-muted active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { pointerStart.current = null; setDragOffset({ x: 0, y: 0 }); }}
        role="img"
        aria-label={`Mapa interactivo de ${title}; ubicación marcada con un pin`}
      >
        {tiles.map((tile) => (
          <img
            key={tile.key}
            src={tile.url}
            alt=""
            draggable={false}
            className="pointer-events-none absolute h-64 w-64 max-w-none select-none"
            style={{ left: `calc(50% + ${tile.left}px)`, top: `calc(50% + ${tile.top}px)` }}
          />
        ))}
        <MapPin
          aria-label="Ubicación del inmueble"
          className="pointer-events-none absolute z-10 h-9 w-9 -translate-x-1/2 -translate-y-full fill-primary text-primary drop-shadow-md"
          style={{ left: `calc(50% + ${markerX}px)`, top: `calc(50% + ${markerY}px)` }}
        />

        <div className="absolute right-3 top-3 z-20 flex flex-col overflow-hidden rounded-md border bg-background/95 shadow-sm">
          <Button type="button" variant="ghost" size="icon" className="rounded-none" aria-label="Acercar mapa" title="Acercar" onPointerDown={(event) => event.stopPropagation()} onClick={() => adjustZoom(1)}><Plus className="h-4 w-4" /></Button>
          <div className="h-px bg-border" />
          <Button type="button" variant="ghost" size="icon" className="rounded-none" aria-label="Alejar mapa" title="Alejar" onPointerDown={(event) => event.stopPropagation()} onClick={() => adjustZoom(-1)}><Minus className="h-4 w-4" /></Button>
        </div>
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="absolute bottom-1 right-1 z-20 rounded bg-background/90 px-1 text-[10px] text-muted-foreground" onPointerDown={(event) => event.stopPropagation()}>© OpenStreetMap</a>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{address}</p>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{latitude.toFixed(5)}, {longitude.toFixed(5)}</p>
        </div>
        <a href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-semibold text-primary hover:underline">Abrir mapa</a>
      </div>
    </section>
  );
}

export interface PropertyMapPoint {
  id: string;
  code: string;
  title: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
}

interface PropertyPortfolioMapProps {
  properties: PropertyMapPoint[];
  totalPropertyCount: number;
}

function toNormalizedWorldPoint(latitude: number, longitude: number): WorldPoint {
  const safeLatitude = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, latitude));
  const sinLatitude = Math.sin((safeLatitude * Math.PI) / 180);

  return {
    x: (longitude + 180) / 360,
    y: 0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI),
  };
}

export function PropertyPortfolioMap({ properties, totalPropertyCount }: PropertyPortfolioMapProps) {
  const geolocatedProperties = properties.filter(
    (property): property is PropertyMapPoint & { latitude: number; longitude: number } =>
      property.latitude !== null && property.longitude !== null
  );
  const initialPoints = geolocatedProperties.map((property) =>
    toNormalizedWorldPoint(property.latitude, property.longitude)
  );
  const minX = Math.min(...initialPoints.map((point) => point.x));
  const maxX = Math.max(...initialPoints.map((point) => point.x));
  const minY = Math.min(...initialPoints.map((point) => point.y));
  const maxY = Math.max(...initialPoints.map((point) => point.y));
  const initialCenter = geolocatedProperties.length > 0
    ? fromWorldPoint(
        { x: ((minX + maxX) / 2) * TILE_SIZE * 2 ** INITIAL_ZOOM, y: ((minY + maxY) / 2) * TILE_SIZE * 2 ** INITIAL_ZOOM },
        INITIAL_ZOOM
      )
    : { latitude: 0, longitude: 0 };
  const spanX = Math.max(maxX - minX, 0.00001);
  const spanY = Math.max(maxY - minY, 0.00001);
  let fitZoom = 17;
  while (fitZoom > MIN_ZOOM && (spanX * TILE_SIZE * 2 ** fitZoom > 920 || spanY * TILE_SIZE * 2 ** fitZoom > 470)) {
    fitZoom -= 1;
  }

  const [center, setCenter] = useState(initialCenter);
  const [zoom, setZoom] = useState(Math.min(fitZoom, geolocatedProperties.length === 1 ? 15 : fitZoom));
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const mapRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const centerPoint = toWorldPoint(center.latitude, center.longitude, zoom);
  const centerTileX = Math.floor(centerPoint.x / TILE_SIZE);
  const centerTileY = Math.floor(centerPoint.y / TILE_SIZE);
  const offsetX = centerPoint.x - centerTileX * TILE_SIZE;
  const offsetY = centerPoint.y - centerTileY * TILE_SIZE;
  const tileCount = 2 ** zoom;

  const tiles = Array.from({ length: 35 }, (_, index) => {
    const column = (index % 7) - 3;
    const row = Math.floor(index / 7) - 2;
    const rawTileX = centerTileX + column;
    const tileX = ((rawTileX % tileCount) + tileCount) % tileCount;
    const tileY = centerTileY + row;

    if (tileY < 0 || tileY >= tileCount) return null;

    return {
      key: `${zoom}-${tileX}-${tileY}-${column}-${row}`,
      url: `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`,
      left: column * TILE_SIZE - offsetX + dragOffset.x,
      top: row * TILE_SIZE - offsetY + dragOffset.y,
    };
  }).filter((tile): tile is NonNullable<typeof tile> => tile !== null);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    pointerStart.current = { x: event.clientX, y: event.clientY };
    setDragOffset({ x: 0, y: 0 });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStart.current) return;
    setDragOffset({ x: event.clientX - pointerStart.current.x, y: event.clientY - pointerStart.current.y });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.hypot(deltaX, deltaY) > 4) {
      setCenter(fromWorldPoint({ x: centerPoint.x - deltaX, y: centerPoint.y - deltaY }, zoom));
    }
    setDragOffset({ x: 0, y: 0 });
  };

  const adjustZoom = (direction: -1 | 1) => {
    setZoom((currentZoom) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom + direction)));
  };

  const recenter = () => {
    setCenter(initialCenter);
    setZoom(Math.min(fitZoom, geolocatedProperties.length === 1 ? 15 : fitZoom));
    setDragOffset({ x: 0, y: 0 });
  };

  return (
    <section className="overflow-hidden rounded-lg border bg-card" aria-label="Mapa de ubicaciones de inmuebles">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><MapPin className="h-4 w-4" /></span>
          <div className="min-w-0">
            <h2 className="font-semibold">Ubicaciones del portafolio</h2>
            <p className="text-sm text-muted-foreground">{geolocatedProperties.length} de {totalPropertyCount} inmuebles con ubicación</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" title="Centrar todos" aria-label="Centrar todos" onClick={recenter}><LocateFixed className="h-4 w-4" /></Button>
          <div className="flex overflow-hidden rounded-md border bg-background">
            <Button type="button" variant="ghost" size="icon" className="rounded-none" title="Acercar mapa" aria-label="Acercar mapa" onClick={() => adjustZoom(1)}><Plus className="h-4 w-4" /></Button>
            <div className="w-px bg-border" />
            <Button type="button" variant="ghost" size="icon" className="rounded-none" title="Alejar mapa" aria-label="Alejar mapa" onClick={() => adjustZoom(-1)}><Minus className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      {geolocatedProperties.length === 0 ? (
        <div className="flex min-h-80 flex-col items-center justify-center gap-2 bg-muted/40 px-6 text-center">
          <MapPin className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">No hay ubicaciones registradas</p>
          <p className="max-w-md text-sm text-muted-foreground">Marca la ubicación de los inmuebles en el mapa del formulario para visualizarlos aquí.</p>
        </div>
      ) : (
        <div
          ref={mapRef}
          className="relative h-[min(65vh,560px)] min-h-80 cursor-grab touch-none overflow-hidden bg-muted active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => { pointerStart.current = null; setDragOffset({ x: 0, y: 0 }); }}
          aria-label="Mapa interactivo con todos los inmuebles geolocalizados"
        >
          {tiles.map((tile) => (
            <img key={tile.key} src={tile.url} alt="" draggable={false} className="pointer-events-none absolute h-64 w-64 max-w-none select-none" style={{ left: `calc(50% + ${tile.left}px)`, top: `calc(50% + ${tile.top}px)` }} />
          ))}

          {geolocatedProperties.map((property, index) => {
            const markerPoint = toWorldPoint(property.latitude, property.longitude, zoom);
            const markerX = markerPoint.x - centerPoint.x + dragOffset.x;
            const markerY = markerPoint.y - centerPoint.y + dragOffset.y;
            const markerColor = property.status === "available"
              ? "bg-emerald-600"
              : property.status === "occupied"
                ? "bg-sky-600"
                : property.status === "maintenance"
                  ? "bg-amber-600"
                  : "bg-rose-600";
            return (
              <Link
                key={property.id}
                href={`/dashboard/inmuebles/${property.id}`}
                title={`${property.code} · ${property.title}`}
                aria-label={`Abrir inmueble ${property.code}: ${property.title}`}
                className="group absolute z-10 flex -translate-x-1/2 -translate-y-full flex-col items-center drop-shadow-md"
                style={{ left: `calc(50% + ${markerX}px)`, top: `calc(50% + ${markerY}px)` }}
              >
                <span className={`flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-white ${markerColor} px-2 text-xs font-bold text-white transition-transform group-hover:scale-110`}>{index + 1}</span>
                <span className={`h-2.5 w-2.5 -translate-y-1 rotate-45 border-b-2 border-r-2 border-white ${markerColor}`} />
              </Link>
            );
          })}

          <div className="absolute bottom-3 left-3 z-20 max-w-[min(28rem,75%)] rounded-md border bg-background/95 px-3 py-2 shadow-sm">
            <p className="text-xs font-semibold">Inmuebles en el mapa</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Selecciona un marcador para abrir la ficha</p>
          </div>
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="absolute bottom-1 right-1 z-20 rounded bg-background/90 px-1 text-[10px] text-muted-foreground" onPointerDown={(event) => event.stopPropagation()}>© OpenStreetMap</a>
        </div>
      )}

      <div className="flex flex-wrap gap-x-5 gap-y-2 border-t px-4 py-3 text-xs text-muted-foreground sm:px-5">
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" />Disponible</span>
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-sky-500" />Ocupado</span>
          <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500" />Mantenimiento</span>
          <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-rose-500" />No disponible</span>
      </div>
    </section>
  );
}