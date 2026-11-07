import struct
import random
import asyncio
import time
from typing import Optional, Dict, Any, Tuple

class LoRaPayloadSerializer:
    """
    Packs telemetry data into a compact binary layout (21 bytes) 
    to fit within low-bandwidth LoRa physical frame limits (SF12 limit = 51 bytes).
    
    Binary Layout:
    - vehicle_id : 8 bytes (fixed char array)
    - latitude   : 4 bytes (int32, multiplied by 1e6 for microdegree accuracy)
    - longitude  : 4 bytes (int32, multiplied by 1e6)
    - speed_kmh  : 2 bytes (uint16, multiplied by 10)
    - heading    : 2 bytes (uint16, multiplied by 10)
    - altitude   : 1 byte  (uint8, offset by +500m / 5m resolution)
    Total = 21 bytes
    """
    
    STRUCT_FORMAT = ">8siiHHB"  # Big-endian

    @classmethod
    def pack(cls, frame_data: Dict[str, Any]) -> bytes:
        # Truncate or pad vehicle_id to exactly 8 bytes
        v_id = frame_data["vehicle_id"].encode("utf-8")[:8].ljust(8, b'\x00')
        lat = int(frame_data["latitude"] * 1e6)
        lon = int(frame_data["longitude"] * 1e6)
        speed = int(frame_data["speed_kmh"] * 10)
        heading = int(frame_data["heading"] * 10)
        # Scale altitude (0..255 maps to 0..1275m with 5m steps)
        alt = max(0, min(255, int((frame_data["altitude"] + 500) / 5)))

        return struct.pack(cls.STRUCT_FORMAT, v_id, lat, lon, speed, heading, alt)

    @classmethod
    def unpack(cls, binary_payload: bytes) -> Dict[str, Any]:
        v_id_raw, lat_int, lon_int, speed_int, heading_int, alt_int = struct.unpack(
            cls.STRUCT_FORMAT, binary_payload
        )
        return {
            "vehicle_id": v_id_raw.decode("utf-8").rstrip('\x00'),
            "latitude": round(lat_int / 1e6, 6),
            "longitude": round(lon_int / 1e6, 6),
            "speed_kmh": round(speed_int / 10.0, 1),
            "heading": round(heading_int / 10.0, 1),
            "altitude": round((alt_int * 5) - 500, 1)
        }


class LoRaChannelSimulator:
    def __init__(
        self,
        packet_loss_rate: float = 0.10,    # 10% packet drop probability
        base_latency_ms: float = 180.0,    # Base LoRa airtime latency
        jitter_ms: float = 40.0             # Random jitter range
    ):
        self.packet_loss_rate = packet_loss_rate
        self.base_latency_ms = base_latency_ms
        self.jitter_ms = jitter_ms

    def generate_radio_metrics(self) -> Dict[str, float]:
        """Generates synthetic RSSI and SNR values typical for field LoRa links."""
        rssi = round(random.uniform(-115.0, -85.0), 1)  # dBm
        snr = round(random.uniform(-10.0, 10.0), 1)     # dB
        return {"rssi": rssi, "snr": snr}

    async def transmit(self, payload: bytes) -> Tuple[bool, Optional[bytes], Dict[str, Any]]:
        """
        Simulates physical radio channel behavior: packet loss, latency, and noise.
        Returns: (is_delivered, payload_or_none, radio_metadata)
        """
        # 1. Packet Loss Simulation
        if random.random() < self.packet_loss_rate:
            return False, None, {}

        # 2. Airtime Delay Simulation
        delay_sec = max(0.01, (self.base_latency_ms + random.uniform(-self.jitter_ms, self.jitter_ms)) / 1000.0)
        await asyncio.sleep(delay_sec)

        # 3. Radio Signal Metadata
        radio_metrics = self.generate_radio_metrics()
        radio_metrics["airtime_delay_ms"] = round(delay_sec * 1000, 1)
        radio_metrics["payload_bytes"] = len(payload)

        return True, payload, radio_metrics