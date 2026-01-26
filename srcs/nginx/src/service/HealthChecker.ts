export class HealthChecker {
  // Update status style
  private async updateStatus(
    dot: HTMLElement | null,
    label: HTMLElement | null,
    isOnline: boolean,
    onlineText = 'Ready',
    offlineText = 'Offline',
  ) {
    if (!dot || !label) return;

    dot.className = `w-3 h-3 rounded-full bg-${isOnline ? 'green' : 'red'}-400 ${isOnline ? 'animate-pulse' : ''}`;
    label.textContent = isOnline ? onlineText : offlineText;
    label.className = `text-${isOnline ? 'green' : 'red'}-400 text-sm font-mono`;

    const parent = dot.closest('.flex')?.parentElement;
    if (parent) {
      if (isOnline) {
        parent.classList.remove('opacity-50');
      } else {
        parent.classList.add('opacity-50');
      }
    }
  }

  private async checkNginx(): Promise<boolean> {
    const nginxDot = document.getElementById('nginx-status');
    const nginxLabel = nginxDot?.nextElementSibling?.nextElementSibling as HTMLElement;

    try {
      const response = await fetch('/health');
      if (response.ok) {
        await this.updateStatus(nginxDot, nginxLabel, true);
        return true;
      } else {
        throw new Error('Nginx offline');
      }
    } catch (error) {
      console.warn('Nginx check failed:', error);
      await this.updateStatus(nginxDot, nginxLabel, false);
      return false;
    }
  }

  private async checkUsers(): Promise<boolean> {
    const usersDot = document.getElementById('users-status');
    const usersLabel = usersDot?.nextElementSibling?.nextElementSibling as HTMLElement;
    try {
      const response = await fetch('/api/users');
      await response.json();

      if (response.ok && usersDot) {
        await this.updateStatus(usersDot, usersLabel, true);
        return true;
      } else {
        throw new Error('users offline');
      }
    } catch (error) {
      console.warn('users check failed:', error);
      await this.updateStatus(usersDot, usersLabel, false);
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    const redisDot = document.getElementById('redis-status');
    const redisLabel = redisDot?.nextElementSibling?.nextElementSibling as HTMLElement;
    try {
      const response = await fetch('/api/redis');
      await response.json();

      if (response.ok && redisDot) {
        await this.updateStatus(redisDot, redisLabel, true);
        return true;
      } else {
        throw new Error('Redis offline');
      }
    } catch (error) {
      console.warn('Redis check failed:', error);
      await this.updateStatus(redisDot, redisLabel, false);
      return false;
    }
  }

  private async checkAPI(): Promise<boolean> {
    const apiDot = document.getElementById('api-status');
    const apiLabel = apiDot?.nextElementSibling?.nextElementSibling as HTMLElement;

    try {
      const response = await fetch('/api/health');
      await response.json();

      if (response.ok) {
        await this.updateStatus(apiDot, apiLabel, true);
        return true;
      } else {
        throw new Error('API offline');
      }
    } catch (error) {
      console.warn('API check failed:', error);
      await this.updateStatus(apiDot, apiLabel, false);
      return false;
    }
  }

  private async checkGame(): Promise<boolean> {
    const gameDot = document.getElementById('game-status');
    const gameLabel = gameDot?.nextElementSibling?.nextElementSibling as HTMLElement;

    try {
      const response = await fetch('/api/game/health');
      await response.json();

      if (response.ok) {
        await this.updateStatus(gameDot, gameLabel, true);
        return true;
      } else {
        throw new Error('Game-service offline');
      }
    } catch (error) {
      console.warn('Game check failed:', error);
      await this.updateStatus(gameDot, gameLabel, false);
      return false;
    }
  }

  private async checkBlockchain(): Promise<boolean> {
    const blockDot = document.getElementById('game-status');
    const blockLabel = blockDot?.nextElementSibling?.nextElementSibling as HTMLElement;

    try {
      const response = await fetch('/api/block/health');
      await response.json();

      if (response.ok) {
        await this.updateStatus(blockDot, blockLabel, true);
        return true;
      } else {
        throw new Error('Blockchain-service offline');
      }
    } catch (error) {
      console.warn('Blockchain check failed:', error);
      await this.updateStatus(blockDot, blockLabel, false);
      return false;
    }
  }

  private async checkAllServices(): Promise<void> {
    const statusElement = document.getElementById('status');
    const nginxOnline = await this.checkNginx();
    const apiOnline = await this.checkAPI();
    const usersOnline = await this.checkUsers();
    const redisOnline = await this.checkRedis();
    const gameOnline = await this.checkGame();
    const blockchainOnline = await this.checkBlockchain();

    if (statusElement) {
      if (
        nginxOnline &&
        apiOnline &&
        redisOnline &&
        usersOnline &&
        gameOnline &&
        blockchainOnline
      ) {
        statusElement.textContent = 'Online';
        statusElement.className =
          'px-3 py-1 rounded-full text-sm font-semibold bg-green-500 text-white';
      } else {
        statusElement.textContent = '✗ Offline';
        statusElement.className =
          'px-3 py-1 rounded-full text-sm font-semibold bg-red-500 text-white';
      }
    }
  }

  public async checkHealth(): Promise<void> {
    await this.checkAllServices();
  }
}
