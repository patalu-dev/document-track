import { Injectable, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findByUsername(username);

    // Dummy compare để thời gian phản hồi không lộ user tồn tại hay không
    const DUMMY_HASH = '$2b$10$C6UzMDM.H6dfI/f/IKcEe.Qr7kHeuG5vB0vJ9vJ9vJ9vJ9vJ9vJ9u';
    const hashToCompare = user ? user.password : DUMMY_HASH;
    const passOk = await bcrypt.compare(pass ?? '', hashToCompare).catch(() => false);
    
    if (!user || !passOk) {
      throw new UnauthorizedException('Tài khoản hoặc mật khẩu không chính xác');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản của bạn đã bị khóa');
    }

    const { password, ...result } = user;
    return result;
  }

  async getTokens(userId: number, username: string, roleIds: number[], tokenVersion = 0) {
    const payload = {
      sub: userId,
      username,
      roles: roleIds,
      tv: tokenVersion,
    };

    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    const jwtRefreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    if (jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }
    if (!jwtRefreshSecret) {
      throw new Error('JWT_REFRESH_SECRET environment variable is required');
    }
    if (jwtRefreshSecret.length < 32) {
      throw new Error('JWT_REFRESH_SECRET must be at least 32 characters long');
    }
    if (jwtSecret === jwtRefreshSecret) {
      throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different');
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: jwtSecret,
        expiresIn: this.configService.get<string>('JWT_EXPIRATION', '15m') as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: jwtRefreshSecret,
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d') as any,
      }),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async updateRefreshTokenHash(userId: number, refreshToken: string | null) {
    if (refreshToken) {
      const salt = await bcrypt.genSalt();
      const hash = await bcrypt.hash(refreshToken, salt);
      await this.usersService.updateRefreshToken(userId, hash);
    } else {
      await this.usersService.updateRefreshToken(userId, null);
    }
  }

  async login(user: any) {
    const roleIds = user.roles ? user.roles.map((r: any) => r.id) : [];
    const tv = (user as any).tokenVersion ?? 0;

    const tokens = await this.getTokens(user.id, user.username, roleIds, tv);
    await this.updateRefreshTokenHash(user.id, tokens.refresh_token);

    return {
      ...tokens,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        roles: user.roles
          ? user.roles.map((r: any) => ({
              id: r.id,
              name: r.name,
              permissions: r.permissions
                ? r.permissions.map((p: any) => ({ 
                    action: p.action, 
                    subject: p.subject, 
                    inverted: p.inverted,
                    conditions: p.conditions
                  }))
                : [],
            }))
          : [],
      },
    };
  }

  async refreshTokens(refreshToken: string) {
    const jwtRefreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!jwtRefreshSecret) {
      throw new Error('JWT_REFRESH_SECRET environment variable is required');
    }
    if (jwtRefreshSecret.length < 32) {
      throw new Error('JWT_REFRESH_SECRET must be at least 32 characters long');
    }
    if (!refreshToken) {
      throw new ForbiddenException('Refresh Token is missing');
    }

    let payload: any;
    try {
      // 1. Xác thực token + bind userId từ payload đã verify, không tin body client
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: jwtRefreshSecret,
      });
    } catch (e) {
      throw new ForbiddenException('Refresh Token is invalid or expired');
    }

    const userId = payload?.sub;
    if (!userId) {
      throw new ForbiddenException('Refresh Token is invalid or expired');
    }

    const user = await this.usersService.findOne(userId);
    if (!user || !user.refreshToken) {
      throw new ForbiddenException('Access Denied');
    }
    // Refresh cũ sau logout/đổi pass (tokenVersion đã tăng) thì loại ngay
    if ((payload?.tv ?? 0) !== ((user as any).tokenVersion ?? 0)) {
      throw new ForbiddenException('Refresh Token is revoked');
    }

    const refreshTokenMatches = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!refreshTokenMatches) {
      // Reuse token cũ (rotation đã đổi hash) -> revoke cả chuỗi để chống replay
      await this.usersService.bumpTokenVersion(user.id);
      await this.updateRefreshTokenHash(user.id, null);
      throw new ForbiddenException('Access Denied');
    }

    // Lấy lại roles đầy đủ
    const fullUser = await this.usersService.findByUsername(user.username);
    if (!fullUser) {
      throw new ForbiddenException('User not found');
    }
    const roleIds = fullUser.roles ? fullUser.roles.map((r: any) => r.id) : [];

    const tokens = await this.getTokens(user.id, user.username, roleIds, (user as any).tokenVersion ?? 0);
    await this.updateRefreshTokenHash(user.id, tokens.refresh_token);

    return tokens;
  }

  decodeToken(token: string) {
    return this.jwtService.decode(token) as any;
  }

  async logout(userId: number) {
    await this.updateRefreshTokenHash(userId, null);
    await this.usersService.bumpTokenVersion(userId);
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản của bạn đã bị khóa');
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Mật khẩu hiện tại không chính xác');
    }

    if (currentPassword === newPassword) {
      throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại');
    }

    await this.usersService.updatePassword(userId, newPassword);
    // Đá mọi session khác sau khi đổi pass
    await this.updateRefreshTokenHash(userId, null);
    return { message: 'Đổi mật khẩu thành công, vui lòng đăng nhập lại' };
  }
}
