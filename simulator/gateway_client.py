import asyncio
import socketio
import logging
from typing import Dict, Any

logger = logging.getLogger("GatewayClient")

class NestJSGatewayClient:
    def __init__(self, server_url: str = "http://localhost:3000"):
        self.server_url = server_url
        self.sio = socketio.AsyncClient(
            reconnection=True,
            reconnection_attempts=10,
            reconnection_delay=2
        )
        self.is_connected = False
        self._register_events()

    def _register_events(self):
        @self.sio.event
        async def connect():
            self.is_connected = True
            print(f"\033[92m[GATEWAY CONNECTED]\033[0m Linked to NestJS Socket.io server at {self.server_url}")

        @self.sio.event
        async def disconnect():
            self.is_connected = False
            print("\033[91m[GATEWAY DISCONNECTED]\033[0m Connection to NestJS lost. Attempting reconnect...")

        @self.sio.on("telemetry:update")
        async def on_broadcast(data):
            # Optional listener to verify bidirectional loopback
            pass

    async def start(self):
        """Establishes connection to the NestJS backend."""
        try:
            await self.sio.connect(self.server_url, socketio_path="/socket.io")
        except Exception as e:
            print(f"\033[93m[GATEWAY WARN]\033[0m Could not connect immediately to {self.server_url}: {e}")

    async def stop(self):
        if self.is_connected:
            await self.sio.disconnect()

    async def emit_telemetry(self, telemetry_payload: Dict[str, Any], radio_metrics: Dict[str, Any]) -> bool:
        """
        Formats and emits telemetry over WebSocket matching API_WEBSOCKET_SPEC.md
        """
        if not self.is_connected:
            return False

        formatted_payload = {
            "vehicleId": telemetry_payload["vehicle_id"],
            "latitude": telemetry_payload["latitude"],
            "longitude": telemetry_payload["longitude"],
            "altitude": telemetry_payload["altitude"],
            "speedKmh": telemetry_payload["speed_kmh"],
            "heading": telemetry_payload["heading"],
            "rssi": radio_metrics.get("rssi"),
            "snr": radio_metrics.get("snr"),
            "timestamp": int(telemetry_payload.get("timestamp", 0) * 1000)
        }

        await self.sio.emit("telemetry:submit", formatted_payload)
        return True