import { JwtPayload, ROLES_KEY, RolesGuard, UserType } from '@common';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  describe('canActivate', () => {
    let mockContext: ExecutionContext;
    const mockRequest = {
      user: {
        sub: 'user-1',
        email: 'test@example.com',
        userType: UserType.USER,
        role: 'USER',
      } as JwtPayload,
    };

    beforeEach(() => {
      mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;
    });

    it('should allow access when no roles are required', () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);

      expect(guard.canActivate(mockContext)).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        mockContext.getHandler(),
        mockContext.getClass(),
      ]);
    });

    it('should allow access when user has required role', () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['USER']);

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('should deny access when user lacks required role', () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['COACH']);

      expect(guard.canActivate(mockContext)).toBe(false);
    });

    it('should allow access when user has one of multiple required roles', () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['ADMIN', 'USER', 'COACH']);

      expect(guard.canActivate(mockContext)).toBe(true);
    });
  });
});
