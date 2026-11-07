import argparse
import asyncio
import json
import os
import random
from dataclasses import dataclass
from pathlib import Path

from gateway_client import NestJSGatewayClient
from lora_constraints import LoRaPayloadSerializer, LoRaChannelSimulator
from vehicle import SimulatedVehicle, TelemetryFrame

SAMPLE_TRACK_GEOJSON = {
    "type": "Feature",
    "geometry": {
        "type": "LineString",
        "coordinates": [
            [67.0011, 24.8607, 15.0],
            [67.0055, 24.8650, 18.0],
            [67.0120, 24.8620, 22.0],
            [67.0180, 24.8700, 14.0],
            [67.0011, 24.8607, 15.0],
        ],
    },
}


@dataclass
class SimulationStats:
    generated: int = 0
    sent: int = 0
    dropped: int = 0
    not_sent: int = 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Concurrent LoRa telemetry load simulator")
    parser.add_argument(
        "--vehicles", type=int, default=int(os.getenv("VEHICLES", "3")),
        help="number of concurrent vehicles (default: 3; env: VEHICLES)",
    )
    parser.add_argument(
        "--drop-rate", type=float, default=float(os.getenv("DROP_RATE", "0.08")),
        help="random packet drop probability, from 0 to 1 (default: 0.08; env: DROP_RATE)",
    )
    parser.add_argument(
        "--min-delay", type=float, default=float(os.getenv("MIN_DELAY", "0.05")),
        help="minimum backhaul jitter in seconds (default: 0.05; env: MIN_DELAY)",
    )
    parser.add_argument(
        "--max-delay", type=float, default=float(os.getenv("MAX_DELAY", "0.35")),
        help="maximum backhaul jitter in seconds (default: 0.35; env: MAX_DELAY)",
    )
    parser.add_argument(
        "--duration", type=float, default=None,
        help="optional run duration in seconds; Ctrl+C stops an unlimited run",
    )
    parser.add_argument(
        "--backend-url", default=os.getenv("BACKEND_URL", "http://localhost:3000"),
        help="NestJS gateway URL (default: BACKEND_URL or http://localhost:3000)",
    )
    parser.add_argument(
        "--track", type=Path, default=Path(__file__).with_name("track.json"),
        help="GeoJSON route file (default: simulator/track.json)",
    )
    args = parser.parse_args()

    if args.vehicles < 1:
        parser.error("--vehicles must be at least 1")
    if not 0 <= args.drop_rate <= 1:
        parser.error("--drop-rate must be between 0 and 1")
    if args.min_delay < 0 or args.max_delay < args.min_delay:
        parser.error("delays must satisfy 0 <= --min-delay <= --max-delay")
    if args.duration is not None and args.duration <= 0:
        parser.error("--duration must be greater than 0")
    return args


async def run_vehicle_simulation(
    vehicle: SimulatedVehicle,
    channel: LoRaChannelSimulator,
    gateway: NestJSGatewayClient,
    stats: SimulationStats,
    drop_rate: float,
    min_delay: float,
    max_delay: float,
    start_delay: float,
) -> None:
    if start_delay:
        await asyncio.sleep(start_delay)
    print(f"[START] {vehicle.vehicle_id} initialized (offset {vehicle.distance_traveled_m:.1f} m).")

    while True:
        frame: TelemetryFrame = vehicle.step()
        stats.generated += 1
        payload = LoRaPayloadSerializer.pack(frame.model_dump())

        # Model a terrain/RF packet loss before any gateway transmission.
        if random.random() < drop_rate:
            stats.dropped += 1
            print(f"[DROP] {vehicle.vehicle_id}: packet suppressed by simulated terrain attenuation.")
            await asyncio.sleep(vehicle.update_interval_sec)
            continue

        delivered, rx_bytes, metrics = await channel.transmit(payload)
        if not delivered or rx_bytes is None:
            stats.dropped += 1
            print(f"[DROP] {vehicle.vehicle_id}: packet lost on the simulated LoRa channel.")
            await asyncio.sleep(vehicle.update_interval_sec)
            continue

        # Variable cellular/satellite backhaul delay before emitting the WebSocket frame.
        await asyncio.sleep(random.uniform(min_delay, max_delay))
        unpacked_data = LoRaPayloadSerializer.unpack(rx_bytes)
        unpacked_data["timestamp"] = frame.timestamp

        emitted = await gateway.emit_telemetry(unpacked_data, metrics)
        if emitted:
            stats.sent += 1
        else:
            stats.not_sent += 1

        await asyncio.sleep(vehicle.update_interval_sec)


async def report_status(
    gateway: NestJSGatewayClient, stats: SimulationStats, stop_event: asyncio.Event
) -> None:
    while not stop_event.is_set():
        dropped_pct = 100 * stats.dropped / stats.generated if stats.generated else 0.0
        connection = "CONNECTED" if gateway.is_connected else "DISCONNECTED"
        print(
            f"[STATUS] WS: {connection} | Generated: {stats.generated} | Sent: {stats.sent} | "
            f"Dropped: {stats.dropped} ({dropped_pct:.1f}%) | Not sent: {stats.not_sent}",
            flush=True,
        )
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=1.0)
        except asyncio.TimeoutError:
            pass


def print_summary(stats: SimulationStats) -> None:
    dropped_pct = 100 * stats.dropped / stats.generated if stats.generated else 0.0
    print(
        f"\n[SUMMARY] Generated {stats.generated} packets | Sent: {stats.sent} | "
        f"Dropped: {stats.dropped} ({dropped_pct:.1f}%) | Not sent: {stats.not_sent}"
    )


async def main(args: argparse.Namespace) -> None:
    if not args.track.exists():
        args.track.write_text(json.dumps(SAMPLE_TRACK_GEOJSON, indent=2), encoding="utf-8")

    gateway = NestJSGatewayClient(server_url=args.backend_url)
    await gateway.start()

    # LoRa airtime remains modeled by the channel; random drop rate is applied above,
    # so the configured percentage is not compounded by a second loss check.
    channel = LoRaChannelSimulator(packet_loss_rate=0.0)
    stats = SimulationStats()
    stop_event = asyncio.Event()

    speed_presets = (80.0, 65.0, 90.0)
    vehicles = []
    for index in range(args.vehicles):
        vehicle = SimulatedVehicle(
            f"CAR_{101 + index}",
            str(args.track),
            base_speed_kmh=speed_presets[index] if index < len(speed_presets) else random.uniform(60, 90),
            update_interval_sec=1.0,
        )
        # Separate route positions and small per-car speed offsets avoid synchronized motion.
        vehicle.distance_traveled_m = random.uniform(0, vehicle.total_length_m)
        vehicle.base_speed_kmh *= random.uniform(0.97, 1.03)
        vehicles.append(vehicle)

    tasks = [
        asyncio.create_task(
            run_vehicle_simulation(
                vehicle,
                channel,
                gateway,
                stats,
                args.drop_rate,
                args.min_delay,
                args.max_delay,
                start_delay=index * 0.2,
            )
        )
        for index, vehicle in enumerate(vehicles)
    ]
    status_task = asyncio.create_task(report_status(gateway, stats, stop_event))

    print(
        f"[CONFIG] Vehicles: {args.vehicles} | Drop rate: {args.drop_rate:.1%} | "
        f"Backhaul jitter: {args.min_delay:.2f}-{args.max_delay:.2f}s | "
        f"Gateway: {args.backend_url}"
    )

    try:
        if args.duration is None:
            await asyncio.gather(*tasks)
        else:
            await asyncio.sleep(args.duration)
    finally:
        stop_event.set()
        for task in tasks:
            task.cancel()
        status_task.cancel()
        await asyncio.gather(*tasks, status_task, return_exceptions=True)
        await gateway.stop()
        print_summary(stats)


if __name__ == "__main__":
    arguments = parse_args()
    try:
        asyncio.run(main(arguments))
    except KeyboardInterrupt:
        print("\n[STOP] Telemetry simulator stopped cleanly.")
