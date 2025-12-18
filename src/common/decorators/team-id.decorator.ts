import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const TeamId = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.params.teamId || request.body?.team_id || request.query?.team_id;
});
