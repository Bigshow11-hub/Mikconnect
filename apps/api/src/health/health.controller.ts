import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";

import { HealthService } from "./health.service";

@Controller("health")
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @SkipThrottle()
  inspect() {
    return this.health.inspect();
  }
}
