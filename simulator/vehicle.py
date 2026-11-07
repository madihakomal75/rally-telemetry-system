import math
import time
import json
from typing import Dict, Any, List, Tuple
from shapely.geometry import shape, LineString, Point
from pydantic import BaseModel, Field

class TelemetryFrame(BaseModel):
    vehicle_id: str
    latitude: float
    longitude: float
    altitude: float
    speed_kmh: float
    heading: float
    timestamp: float

class SimulatedVehicle:
    def __init__(
        self,
        vehicle_id: str,
        track_geojson_path: str,
        base_speed_kmh: float = 60.0,
        update_interval_sec: float = 1.0
    ):
        self.vehicle_id = vehicle_id
        self.base_speed_kmh = base_speed_kmh
        self.update_interval_sec = update_interval_sec
        self.distance_traveled_m = 0.0
        
        # Load and convert GeoJSON to Shapely LineString
        self.line = self._load_track(track_geojson_path)
        self.total_length_m = self._calculate_haversine_length(self.line)

    def _load_track(self, geojson_path: str) -> LineString:
        with open(geojson_path, "r") as f:
            data = json.load(f)
        
        # Handle FeatureCollection or single Feature
        geom = data["geometry"] if "geometry" in data else data["features"][0]["geometry"]
        parsed_geom = shape(geom)
        
        if parsed_geom.geom_type == "LineString":
            return parsed_geom
        elif parsed_geom.geom_type == "MultiLineString":
            # Merge MultiLineString into single sequence
            coords = [coord for line in parsed_geom.geoms for coord in line.coords]
            return LineString(coords)
        else:
            raise ValueError(f"Unsupported geometry type: {parsed_geom.geom_type}")

    def _calculate_haversine_length(self, line: LineString) -> float:
        """Calculates total ground distance in meters across geographic coordinates."""
        coords = list(line.coords)
        total_dist = 0.0
        for i in range(len(coords) - 1):
            total_dist += self._haversine(coords[i], coords[i+1])
        return total_dist

    @staticmethod
    def _haversine(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
        """Haversine formula to compute ground distance in meters."""
        lon1, lat1 = coord1[:2]
        lon2, lat2 = coord2[:2]
        R = 6371000.0  # Earth radius in meters
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        
        a = (math.sin(dphi / 2) ** 2 +
             math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2)
        return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    def _calculate_bearing(self, p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
        """Computes compass heading (0-360 deg) between two coordinate points."""
        lon1, lat1 = math.radians(p1[0]), math.radians(p1[1])
        lon2, lat2 = math.radians(p2[0]), math.radians(p2[1])
        dlon = lon2 - lon1
        
        x = math.sin(dlon) * math.cos(lat2)
        y = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
        initial_bearing = math.atan2(x, y)
        
        # Convert from radians (-pi, pi) to compass degrees (0, 360)
        compass_bearing = (math.degrees(initial_bearing) + 360) % 360
        return round(compass_bearing, 2)

    def _interpolate_position(self, progress_ratio: float) -> Tuple[float, float, float]:
        """Gets point along line using Shapely normalized interpolation."""
        target_point = self.line.interpolate(progress_ratio, normalized=True)
        lon = target_point.x
        lat = target_point.y
        # Default altitude if 3D coordinate exists, otherwise fallback
        alt = target_point.z if target_point.has_z else 150.0
        return lon, lat, alt

    def step(self) -> TelemetryFrame:
        """Advances vehicle position by one tick and returns updated telemetry frame."""
        # Calculate current fractional progress (0.0 to 1.0)
        progress = (self.distance_traveled_m % self.total_length_m) / self.total_length_m
        
        # Current position
        lon, lat, alt = self._interpolate_position(progress)
        
        # Lookahead position to calculate heading and turn curvature
        lookahead_progress = ((self.distance_traveled_m + 5.0) % self.total_length_m) / self.total_length_m
        next_lon, next_lat, _ = self._interpolate_position(lookahead_progress)
        
        # Compute heading
        heading = self._calculate_bearing((lon, lat), (next_lon, next_lat))
        
        # Dynamic Speed Modifiers (simulates slowing down on turns)
        bearing_delta = abs(heading - self._calculate_bearing((next_lon, next_lat), 
                        self._interpolate_position(((self.distance_traveled_m + 10.0) % self.total_length_m) / self.total_length_m)[:2]))
        speed_factor = max(0.5, 1.0 - (bearing_delta / 180.0))
        current_speed_kmh = self.base_speed_kmh * speed_factor
        
        # Advance distance for the next step (Speed in m/s = km/h / 3.6)
        distance_step = (current_speed_kmh / 3.6) * self.update_interval_sec
        self.distance_traveled_m += distance_step
        
        return TelemetryFrame(
            vehicle_id=self.vehicle_id,
            latitude=round(lat, 6),
            longitude=round(lon, 6),
            altitude=round(alt, 1),
            speed_kmh=round(current_speed_kmh, 2),
            heading=heading,
            timestamp=time.time()
        )