import { RouterOSAPI } from 'node-routeros';

interface MikroTikConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}

export class MikroTikService {
  private conn: RouterOSAPI | null = null;

  async connect(config: MikroTikConfig): Promise<void> {
    this.conn = new RouterOSAPI({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      timeout: 10000,
    });
    await this.conn.connect();
  }

  async disconnect(): Promise<void> {
    if (this.conn) {
      try { await this.conn.close(); } catch {}
      this.conn = null;
    }
  }

  async addHotspotUser(code: string, password: string, server: string, profile: string, comment: string): Promise<any> {
    if (!this.conn) throw new Error('Not connected');
    return this.conn.write(
      '/ip/hotspot/user/add',
      `=name=${code}`,
      `=password=${password}`,
      `=server=${server}`,
      `=profile=${profile}`,
      `=comment=${comment}`,
      '=limit-uptime=1d'
    );
  }

  async getHotspotUsers(): Promise<any[]> {
    if (!this.conn) throw new Error('Not connected');
    return this.conn.write('/ip/hotspot/user/print');
  }

  async getActiveSessions(): Promise<any[]> {
    if (!this.conn) throw new Error('Not connected');
    return this.conn.write('/ip/hotspot/active/print');
  }

  async removeHotspotUser(code: string): Promise<void> {
    if (!this.conn) throw new Error('Not connected');
    const users = await this.conn.write('/ip/hotspot/user/print', `?name=${code}`);
    for (const user of users) {
      await this.conn.write('/ip/hotspot/user/remove', `=.id=${user['.id']}`);
    }
  }

  async addBandwidthProfile(name: string, rateLimit: string): Promise<any> {
    if (!this.conn) throw new Error('Not connected');
    return this.conn.write(
      '/ip/hotspot/user/profile/add',
      `=name=${name}`,
      `=rate-limit=${rateLimit}`
    );
  }

  async getSystemResources(): Promise<any> {
    if (!this.conn) throw new Error('Not connected');
    return this.conn.write('/system/resource/print');
  }

  async getInterfaces(): Promise<any[]> {
    if (!this.conn) throw new Error('Not connected');
    return this.conn.write('/interface/print');
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.getSystemResources();
      return true;
    } catch {
      return false;
    }
  }

  async addPPPoEUser(username: string, password: string, service: string, profile: string): Promise<any> {
    if (!this.conn) throw new Error('Not connected');
    return this.conn.write(
      '/ppp/secret/add',
      `=name=${username}`,
      `=password=${password}`,
      `=service=${service}`,
      `=profile=${profile}`
    );
  }

  async removePPPoEUser(username: string): Promise<void> {
    if (!this.conn) throw new Error('Not connected');
    const secrets = await this.conn.write('/ppp/secret/print', `?name=${username}`);
    for (const s of secrets) {
      await this.conn.write('/ppp/secret/remove', `=.id=${s['.id']}`);
    }
  }
}
