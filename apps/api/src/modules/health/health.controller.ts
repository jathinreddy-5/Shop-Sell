import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { DatabaseService } from '../../database/database.service';

@Controller()
export class HealthController {
  constructor(private readonly db: DatabaseService) {}

  @Public()
  @Get('health')
  checkLiveness() {
    return {
      status: 'ok',
      service: 'shop-sell-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  @Public()
  @Get('ready')
  async checkReadiness() {
    try {
      const start = Date.now();
      const res = await this.db.query('SELECT 1 as alive');
      const latencyMs = Date.now() - start;

      return {
        status: 'ready',
        service: 'shop-sell-api',
        checks: {
          database: {
            status: 'connected',
            latencyMs,
          },
        },
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      // If DB is unconfigured or unreachable, report degraded or throw 503
      throw new HttpException(
        {
          status: 'degraded',
          service: 'shop-sell-api',
          error: err.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }
}
