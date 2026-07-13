import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import { getTenantStore } from '../tenancy/tenant-context';

/**
 * Verifies the JWT, then writes the resulting identity into the request's
 * AsyncLocalStorage store (opened by TenantAlsMiddleware earlier in the
 * pipeline). Every guard/interceptor/controller/service downstream of
 * this point can read `getCurrentTenantId()` etc. This is also what lets
 * TenantTransactionInterceptor (which runs after guards) know which
 * tenant to open the RLS transaction for.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    const store = getTenantStore();
    if (store) {
      store.tenantId = user.tenantId ?? null;
      store.userId = user.userId;
      store.role = user.role;
    }
    return user;
  }
}
