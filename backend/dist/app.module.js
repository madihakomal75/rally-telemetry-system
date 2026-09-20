"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const vehicles_module_1 = require("./vehicles/vehicles.module");
const tracks_module_1 = require("./tracks/tracks.module");
const telemetry_gateway_1 = require("./telemetry/telemetry.gateway");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forRoot({
                type: 'postgres',
                host: process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_PORT || '5432', 10),
                username: process.env.DB_USER || 'rally_user',
                password: process.env.DB_PASSWORD || 'rally_pass',
                database: process.env.DB_NAME || 'rally_db',
                autoLoadEntities: true,
                synchronize: false,
            }),
            vehicles_module_1.VehiclesModule,
            tracks_module_1.TracksModule,
        ],
        providers: [telemetry_gateway_1.TelemetryGateway],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map