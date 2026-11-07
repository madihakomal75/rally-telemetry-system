import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export interface VehicleHistory {
  [vehicleId: string]: [number, number][];
}

export interface TelemetryData {
  vehicleId: string;
  latitude: number;
  longitude: number;
  altitude: number;
  speedKmh: number;
  heading: number;
  rssi: number;
  snr: number;
  timestamp: number;
}

const SOCKET_URL = process.env.REACT_APP_WS_URL || 'http://localhost:3000';

export const useTelemetryStream = () => {
  const [vehicles, setVehicles] = useState<Record<string, TelemetryData>>({});
  const [history, setHistory] = useState<VehicleHistory>({});
  const [totalPackets, setTotalPackets] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket: Socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      socket.emit('telemetry:stream');
      setIsConnected(true);
      console.log('[WS CONNECTED] Subscribed to NestJS telemetry stream');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.warn('[WS DISCONNECTED] Lost connection to gateway');
    });

    // Listen to broadcast channel from NestJS
    socket.on('telemetry:update', (data: TelemetryData) => {
      setTotalPackets((count) => count + 1);
      setVehicles((prev) => ({
        ...prev,
        [data.vehicleId]: data,
      }));
      setHistory((prev) => ({
        ...prev,
        [data.vehicleId]: [
          ...(prev[data.vehicleId] || []),
          [data.longitude, data.latitude] as [number, number],
        ].slice(-100),
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { vehicles, history, isConnected, totalPackets };
};