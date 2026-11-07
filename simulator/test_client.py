import socketio
import time

sio = socketio.Client()

@sio.event
def connect():
    print(" Successfully connected to NestJS Telemetry Gateway!")
    
    # Dummy telemetry packet based on contract
    payload = {
        "vehicle_id": 1,
        "vehicle_number": "RACER-01",
        "latitude": 24.8601,
        "longitude": 67.0010,
        "speed_kmh": 95.4,
        "heading": 180.0,
        "timestamp": "2026-09-20T15:30:00Z",
        "status": "RACING"
    }
    
    print(f" Sending telemetry packet: {payload}")
    sio.emit('telemetry:submit', payload)

@sio.on('telemetry:update')
def on_broadcast(data):
    print(f" Received broadcast echo from NestJS:\n{data}")
    sio.disconnect()

@sio.event
def disconnect():
    print(" Disconnected from Gateway.")

if __name__ == '__main__':
    try:
        sio.connect('http://localhost:3000')
        sio.wait()
    except Exception as e:
        print(f" Connection failed: {e}")