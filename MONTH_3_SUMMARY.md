Month 3: NestJS Backend, Redis Caching & PostGIS Persistence
Overview
Month 3 established the robust backend data pipeline, integrating NestJS WebSockets, non-blocking Redis caching, asynchronous PostgreSQL/PostGIS spatial persistence, and high-throughput analytics APIs.
Key Deliverables & Architecture

1. Ingestion Gateway & Validation (Week 1)
--TelemetryGateway: Managed WebSocket connections, room isolation (telemetry:stream for subscribers, telemetry:submit for ingestors), and event broadcasting (telemetry:update).   
--Strict Payload Validation: Enforced robust DTO validation using class-validator to sanitize incoming latitude, longitude, speed, heading, RSSI, SNR, and ISO/epoch timestamps.   

2. Caching & Spatial Persistence (Week 2)
--Redis Caching: Configured TelemetryCacheService using atomic Redis pipelines to store the latest vehicle states with a 60-second TTL alongside an active vehicle roster set (telemetry:active_vehicles).
--PostgreSQL + PostGIS: Created a time-series telemetry entity leveraging PostGIS spatial point extensions (GEOMETRY(Point, 4326)) and spatial indexing for high-performance geospatial queries.

3. REST Analytics & Swagger Documentation (Week 3)
--API Endpoints (/api/v1/telemetry):GET /latest: Fetches current vehicle states directly from Redis cache.GET /vehicles: Combines active Redis rosters with historical database records.GET /history/:vehicleId: Queries time-windowed GeoJSON coordinate arrays for historical route analysis and replay.
--Swagger UI: Integrated OpenAPI documentation accessible at /api/docs.

4. High-Throughput Optimization & Load Testing (Week 4)
--Asynchronous Batch Writing: Implemented an in-memory queue that flushes PostgreSQL inserts in batches every 500ms or 100 items to prevent event loop blocking under heavy load.
--Load Testing Suite: Created Artillery (load-test.yml) and Autocannon (stress-test.js) simulation scripts designed to benchmark high-frequency concurrent WebSocket packet streams