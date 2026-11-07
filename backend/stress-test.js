const { randomUUID } = require("node:crypto");

function assignVehicleId(context, _events, next) {
  context.vars.vehicleId = `CAR_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
  context.vars.packetSequence = 0;
  next();
}

function createTelemetryPacket(context, _events, next) {
  const sequence = context.vars.packetSequence++;
  const longitude = 67.012 + (sequence % 1000) * 0.000001;
  const latitude = 24.863 + (sequence % 700) * 0.000001;

  context.vars.packet = {
    vehicleId: context.vars.vehicleId,
    latitude,
    longitude,
    speedKmh: 55 + (sequence % 40),
    heading: sequence % 360,
    rssi: -90 - (sequence % 20),
    snr: 4 + (sequence % 8),
    timestamp: Date.now(),
  };
  next();
}

module.exports = { assignVehicleId, createTelemetryPacket };
