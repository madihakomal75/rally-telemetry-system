Month 2: Python Telemetry Simulator & Real-Time Map Dashboard
Overview
Month 2 focused on developing the multi-threaded Python telemetry simulation suite and upgrading the React frontend dashboard with live trajectory breadcrumbs, network health metrics, and responsive map rendering.

Key Deliverables & Implementation
1. Python Telemetry Simulator Engine
Path Interpolation: Built a robust motion generator that interpolates vehicle coordinates along track polygons for concurrent vehicles (CAR_101, CAR_102, CAR_103).

LoRa Network Constraints: Implemented configurable network physics including random packet loss drop rates, variable jitter, and backhaul latency to simulate real-world radio attenuation.

WebSocket Ingestion: Wired the simulation suite directly into the NestJS backend via the telemetry:submit event channel for live bidirectional streaming.

2. Frontend Map UI & Trajectory Rendering
CartoDB Dark Matter Integration: Bypassed Mapbox API token restrictions by rendering GPU-accelerated Mapbox markers over CartoDB dark raster tile layers.

Live Breadcrumb Trails: Added dynamic GeoJSON LineString trajectory trails behind each vehicle, capped at 100 historical coordinate pairs to optimize frontend memory performance.

Auto-Centering & Camera Controls: Implemented automated map boundary fitting (fitBounds) that tracks active vehicles in real time while respecting manual user pan/zoom gestures via interactive overrides and a "Recenter Map" control.

3. Global Telemetry & Network Health Ribbon
Operational Metrics: Added a real-time status ribbon tracking active vehicles, aggregate average speed, and session packet throughput counters.

Signal Quality Thresholds: Configured RSSI-based network health categorization (EXCELLENT, GOOD, DEGRADED) with automated stale signal detection that flags vehicles as OFFLINE / LOST SIGNAL if packets stop arriving for over 5 seconds.