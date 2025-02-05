import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { SessionAuthDto } from './dto/session-auth.dto';
import { UpdateHostDto } from './dto/update-host.dto';
import { SessionsAuthRepository } from './sessions-auth.repository';

import { Permissions } from '@common/roles/permissions';
import { Roles } from '@common/roles/roles';

@Injectable()
export class SessionsAuthService {
  constructor(private readonly sessionsAuthRepository: SessionsAuthRepository) {}

  async validateOrCreateToken(data: SessionAuthDto, userId: number | null) {
    const { sessionId, token } = data;
    if (!token) {
      const result =
        userId === null
          ? await this.sessionsAuthRepository.generateToken(userId, sessionId)
          : await this.sessionsAuthRepository.findTokenByUserId(userId, sessionId);
      return result ?? (await this.sessionsAuthRepository.generateToken(userId, sessionId));
    } else {
      const result =
        userId === null
          ? await this.sessionsAuthRepository.findTokenByToken(sessionId, token)
          : await this.sessionsAuthRepository.findTokenByUserIdAndToken(userId, sessionId, token);
      return result ?? (await this.sessionsAuthRepository.generateToken(userId, sessionId));
    }
  }

  async findUsers(sessionId: string) {
    const users = await this.sessionsAuthRepository.findUsersBySessionId(sessionId);
    return users.map(({ user, roleType }) => ({
      ...user,
      isHost: roleType === Roles.SUB_HOST || roleType === Roles.SUPER_HOST,
    }));
  }

  async authorizeHost(userId: number, { sessionId, isHost, token }: UpdateHostDto) {
    const { role } = await this.sessionsAuthRepository.findByTokenWithPermissions(token);
    const granted = role.permissions.some(({ permissionId }) => permissionId === Permissions.GRANT_HOST);

    if (!granted) throw new ForbiddenException('세션 생성자만이 호스트 권한을 부여 할 수 있습니다.');
    const targetToken = await this.sessionsAuthRepository.findTokenByUserId(userId, sessionId);

    if (!targetToken) {
      throw new NotFoundException('존재하지 않는 userId입니다.');
    }

    if (token === targetToken) {
      throw new BadRequestException('자신의 권한을 변경하려는 요청은 허용되지 않습니다.');
    }

    const { user, roleType } = await this.sessionsAuthRepository.updateRoleType(
      targetToken,
      isHost ? Roles.SUB_HOST : Roles.PARTICIPANT,
    );
    return {
      userId: user.userId,
      nickname: user.nickname,
      isHost: roleType === Roles.SUB_HOST || roleType === Roles.SUPER_HOST,
    };
  }
}
