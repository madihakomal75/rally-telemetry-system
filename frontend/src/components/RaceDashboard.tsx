import React, { useCallback, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './RaceDashboard.css';
import { useTelemetryStream, TelemetryData } from '../services/telemetrySocket';
import { Activity, Signal, Gauge, Navigation, WifiOff, Radio, Zap } from 'lucide-react';

const isVehicleActive = (vehicle: TelemetryData, now: number): boolean => {
  const ageMs = now - vehicle.timestamp;
  return ageMs >= 0 && ageMs <= 5000;
};

export const RaceDashboard: React.FC = () => {
  const { vehicles, history, isConnected, totalPackets } = useTelemetryStream();
  const vehicleList = Object.values(vehicles) as TelemetryData[];
  const [currentTime, setCurrentTime] = useState(Date.now());
  const activeVehicles = vehicleList.filter((vehicle) => isVehicleActive(vehicle, currentTime));
  const averageSpeed = activeVehicles.length
    ? activeVehicles.reduce((total, vehicle) => total + vehicle.speedKmh, 0) / activeVehicles.length
    : 0;
  const averageRssi = activeVehicles.length
    ? activeVehicles.reduce((total, vehicle) => total + vehicle.rssi, 0) / activeVehicles.length
    : null;
  const signalHealth = averageRssi === null
    ? 'NO DATA'
    : averageRssi > -95
      ? 'EXCELLENT'
      : averageRssi >= -105
        ? 'GOOD'
        : 'DEGRADED';
  const signalHealthClass = signalHealth.toLowerCase().replace(' ', '-');

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});
  const isUserInteractingRef = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const fitVehicles = useCallback(() => {
    const map = mapRef.current;
    if (!map || vehicleList.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    vehicleList.forEach(({ longitude, latitude }) => {
      bounds.extend([longitude, latitude]);
    });

    map.fitBounds(bounds, {
      padding: { top: 60, bottom: 60, left: 60, right: 60 },
      maxZoom: 16,
      duration: 1000,
    });
  }, [vehicleList]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const darkStyle: mapboxgl.Style = {
      version: 8,
      sources: {
        'carto-dark': {
          type: 'raster',
          tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'],
          tileSize: 256,
          attribution: '? OpenStreetMap ? CARTO',
        },
      },
      layers: [
        {
          id: 'carto-dark-layer',
          type: 'raster',
          source: 'carto-dark',
          minzoom: 0,
          maxzoom: 22,
        },
      ],
    };

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: darkStyle,
      center: [67.012, 24.863],
      zoom: 13,
    });
    const markUserInteraction = () => {
      isUserInteractingRef.current = true;
    };
    map.on('dragstart', markUserInteraction);
    map.on('wheel', markUserInteraction);
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.on('load', () => {
      map.resize();
    });
    mapRef.current = map;

    return () => {
      map.off('dragstart', markUserInteraction);
      map.off('wheel', markUserInteraction);
      Object.values(markersRef.current).forEach((marker) => marker.remove());
      markersRef.current = {};
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (vehicleList.length === 0 || isUserInteractingRef.current) return;
    fitVehicles();
  }, [vehicleList, fitVehicles]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const activeVehicleIds = ['CAR_101', 'CAR_102', 'CAR_103'] as const;
    const pathColors: Record<(typeof activeVehicleIds)[number], string> = {
      CAR_101: '#f59e0b',
      CAR_102: '#06b6d4',
      CAR_103: '#10b981',
    };

    const syncPaths = () => {
      if (!map.isStyleLoaded()) return;

      activeVehicleIds.forEach((vehicleId) => {
        const coordinates = history[vehicleId] || [];
        if (coordinates.length < 2) return;

        const sourceId = `path-${vehicleId}`;
        const layerId = `path-layer-${vehicleId}`;
        const pathData = {
          type: 'Feature' as const,
          properties: {},
          geometry: {
            type: 'LineString' as const,
            coordinates,
          },
        };
        const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;

        if (source) {
          source.setData(pathData);
        } else {
          map.addSource(sourceId, {
            type: 'geojson',
            data: pathData,
          });
        }

        if (!map.getLayer(layerId)) {
          map.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': pathColors[vehicleId],
              'line-width': 3,
              'line-opacity': 0.85,
              'line-blur': 0.6,
            },
          });
        }
      });
    };

    if (map.isStyleLoaded()) {
      syncPaths();
    } else {
      map.on('load', syncPaths);
    }

    return () => {
      map.off('load', syncPaths);
    };
  }, [history]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    vehicleList.forEach((vehicle) => {
      const { vehicleId, longitude, latitude, heading } = vehicle;
      let marker = markersRef.current[vehicleId];

      if (!marker) {
        const element = document.createElement('div');
        element.className = 'vehicle-marker';
        element.style.cssText = `
          width: 24px;
          height: 24px;
          background-color: #f59e0b;
          border: 2px solid #ffffff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
          color: #000000;
          box-shadow: 0 0 10px rgba(245, 158, 11, 0.8);
          transition: transform 0.3s ease;
        `;
        element.textContent = vehicleId.replace('CAR_', '');

        const popupContent = document.createElement('div');
        const vehicleLabel = document.createElement('strong');
        vehicleLabel.textContent = vehicleId;
        const speedLabel = document.createElement('div');
        speedLabel.textContent = `Speed: ${vehicle.speedKmh.toFixed(1)} km/h`;
        popupContent.append(vehicleLabel, speedLabel);

        marker = new mapboxgl.Marker(element).setPopup(
          new mapboxgl.Popup({ offset: 15 }).setDOMContent(popupContent),
        );
        marker.setLngLat([longitude, latitude]);
        marker.addTo(map);
        markersRef.current[vehicleId] = marker;
      } else {
        marker.setLngLat([longitude, latitude]);
      }

      const element = marker.getElement();
      const mapPositionTransform = element.style.transform.split(' rotate(')[0];
      element.style.transform = `${mapPositionTransform} rotate(${heading}deg)`;

      const popupContent = document.createElement('div');
      const vehicleLabel = document.createElement('strong');
      vehicleLabel.textContent = vehicleId;
      const speedLabel = document.createElement('div');
      speedLabel.textContent = `Speed: ${vehicle.speedKmh.toFixed(1)} km/h`;
      popupContent.append(vehicleLabel, speedLabel);
      marker.getPopup()?.setDOMContent(popupContent);
    });
  }, [vehicleList]);

  return (
    <main className="race-dashboard">
      <header className="race-dashboard__header">
        <div>
          <p className="race-dashboard__eyebrow">SUPARCO</p>
          <h1>Rally Live Telemetry</h1>
          <p>Real-Time LoRa Gateway Dashboard</p>
        </div>
        <div
          className={`race-dashboard__connection ${isConnected ? 'is-connected' : 'is-disconnected'}`}
          role="status"
          aria-live="polite"
        >
          {isConnected ? <Signal aria-hidden="true" /> : <WifiOff aria-hidden="true" />}
          <span>{isConnected ? 'LIVE GATEWAY' : 'DISCONNECTED'}</span>
        </div>
      </header>

      <section className="race-dashboard__stats" aria-label="Live telemetry statistics">
        <div className="race-dashboard__stat">
          <span className="race-dashboard__stat-label"><Radio aria-hidden="true" /> Active Vehicles</span>
          <strong>{activeVehicles.length}</strong>
        </div>
        <div className="race-dashboard__stat">
          <span className="race-dashboard__stat-label"><Gauge aria-hidden="true" /> Avg Race Speed</span>
          <strong>{averageSpeed.toFixed(1)} <small>km/h</small></strong>
        </div>
        <div className="race-dashboard__stat">
          <span className="race-dashboard__stat-label"><Zap aria-hidden="true" /> Overall Network Health</span>
          <strong className={`race-dashboard__health is-${signalHealthClass}`}>{signalHealth}</strong>
        </div>
        <div className="race-dashboard__stat">
          <span className="race-dashboard__stat-label"><Activity aria-hidden="true" /> Total Packets Received</span>
          <strong>{totalPackets.toLocaleString()}</strong>
        </div>
      </section>

      <section className="race-dashboard__map-section" aria-label="Live vehicle map" style={{ position: 'relative' }}>
        <div className="race-dashboard__map" ref={mapContainerRef} />
        <button
          type="button"
          onClick={() => {
            isUserInteractingRef.current = false;
            fitVehicles();
          }}
          style={{
            position: 'absolute',
            right: '1rem',
            bottom: '1rem',
            zIndex: 2,
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '0.6rem 0.85rem',
            background: '#1e293b',
            color: '#f8fafc',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Recenter Map
        </button>
      </section>

      <section className="race-dashboard__vehicles" aria-label="Vehicle telemetry">
        {vehicleList.map((vehicle) => (
          <article className="race-dashboard__vehicle" key={vehicle.vehicleId}>
            <header className="race-dashboard__vehicle-header">
              <div className="race-dashboard__vehicle-title">
                <h2>{vehicle.vehicleId}</h2>
                <span className={`race-dashboard__vehicle-status ${isVehicleActive(vehicle, currentTime) ? 'is-active' : 'is-inactive'}`}>
                  {isVehicleActive(vehicle, currentTime) ? 'ACTIVE' : 'OFFLINE / LOST SIGNAL'}
                </span>
              </div>
              <time dateTime={new Date(vehicle.timestamp).toISOString()}>
                {new Date(vehicle.timestamp).toLocaleTimeString()}
              </time>
            </header>
            <dl className="race-dashboard__metrics">
              <div>
                <dt><Gauge aria-hidden="true" /> Speed</dt>
                <dd>{vehicle.speedKmh.toFixed(1)} km/h</dd>
              </div>
              <div>
                <dt><Navigation aria-hidden="true" /> Heading</dt>
                <dd>{vehicle.heading.toFixed(1)}&deg;</dd>
              </div>
              <div>
                <dt>
                  <Radio aria-hidden="true" style={{ color: vehicle.rssi > -100 ? '#f59e0b' : vehicle.rssi >= -110 ? '#06b6d4' : '#f43f5e' }} />
                  RSSI
                </dt>
                <dd>{vehicle.rssi.toFixed(1)} dBm</dd>
                <span
                  className="race-dashboard__signal-meter"
                  role="meter"
                  aria-label={`${vehicle.vehicleId} signal strength`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.max(0, Math.min(100, ((vehicle.rssi + 120) / 50) * 100))}
                >
                  <span
                    style={{
                      width: `${Math.max(0, Math.min(100, ((vehicle.rssi + 120) / 50) * 100))}%`,
                      backgroundColor: vehicle.rssi > -100 ? '#f59e0b' : vehicle.rssi >= -110 ? '#06b6d4' : '#f43f5e',
                    }}
                  />
                </span>
              </div>
              <div>
                <dt>SNR</dt>
                <dd>{vehicle.snr.toFixed(1)} dB</dd>
              </div>
            </dl>
            <p className="race-dashboard__coordinates">
              Lat: {vehicle.latitude.toFixed(6)} | Lon: {vehicle.longitude.toFixed(6)}
            </p>
          </article>
        ))}
        {vehicleList.length === 0 && (
          <p className="race-dashboard__empty" role="status">
            Waiting for incoming vehicle telemetry packets...
          </p>
        )}
      </section>
    </main>
  );
};