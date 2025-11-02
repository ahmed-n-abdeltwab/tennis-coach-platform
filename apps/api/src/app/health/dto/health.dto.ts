export class CheckHealthDto {
  status: string;
  timestamp: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  version: string;
  environment: string;
  database: string;
}
