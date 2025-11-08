import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalCoachAuthGuard extends AuthGuard('local-coach') {}
