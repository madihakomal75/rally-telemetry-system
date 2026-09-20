# API & WebSocket Communication Specification
**Project:** Web-Based Real-Time Rally Telemetry & Race Management Dashboard  
**Phase:** 1 — System & Spatial Design  

---

## 1. REST API Endpoints

### 1.1 Vehicles Management
* **`GET /api/v1/vehicles`**
  * **Description:** Fetches all registered vehicles and their operational statuses.
  * **Response (200 OK):**
    ```json
    [
      { "id": 1, "vehicle_number": "RACER-01", "driver_name": "Driver A", "status": "RACING" }
    ]
    ```

* **`POST /api/v1/vehicles`**
  * **Description:** Registers a new vehicle into the competition database.
  * **Body:** 
    ```json
    { "vehicle_number": "RACER-01", "driver_name": "Driver A" }
    ```
  * **Response (201 Created):** 
    ```json
    { "id": 1, "status": "READY" }
    ```

---

### 1.2 Tracks & Checkpoints
* **`GET /api/v1/tracks/:id`**
  * **Description:** Retrieves track geometry polygon and spatial checkpoint definitions.
  * **Response (200 OK):** GeoJSON FeatureCollection containing track polygon boundary and checkpoints.

* **`POST /api/v1/tracks`**
  * **Description:** Uploads a new track definition.
  * **Body:** GeoJSON object defining track polygon boundary[cite: 1].

---

### 1.3 Leaderboard & Emergency
* **`GET /api/v1/leaderboard/:track_id`**
  * **Description:** Retrieves synchronized standings with checkpoint finish timestamps and penalties[cite: 1].
  * **Response (200 OK):** Sorted array of driver ranks, start/finish timestamps, and penalty totals[cite: 1].

* **`POST /api/v1/sos`**
  * **Description:** Triggers emergency protocol and computes geodesic routing to the nearest medical unit[cite: 1].
  * **Body:** 
    ```json
    { "vehicle_id": 1, "latitude": 24.8601, "longitude": 67.0010 }
    ```
  * **Response (201 Created):** Triggers emergency routing to nearest medical unit[cite: 1].

---

## 2. WebSocket Events (`/telemetry` namespace)[cite: 1]

### 2.1 Inbound Events (Mobile App / Simulator -> Backend)[cite: 1]

#### Event: `telemetry:submit`
* **Description:** Ingests GNSS coordinates, speed, and operational status from simulated radio link[cite: 1].
* **Payload:**
  ```json
  {
    "vehicle_id": 1,
    "vehicle_number": "RACER-01",
    "latitude": 24.8601,
    "longitude": 67.0010,
    "speed_kmh": 82.3,
    "heading": 120.5,
    "timestamp": "2026-09-20T13:00:00Z",
    "status": "RACING"
  }