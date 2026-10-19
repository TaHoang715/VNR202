import { io, Socket } from 'socket.io-client';

// Determine default server URL:
// In dev with Vite proxy, empty or localhost:3001. If deployed, current origin or custom input.
const isLocalhostHost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const DEFAULT_SERVER_URL =
  typeof window !== 'undefined' && !isLocalhostHost
    ? window.location.origin
    : 'http://localhost:3001';

export function getServerUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_SERVER_URL;
  const saved = localStorage.getItem('vnr202_server_url');
  if (saved) {
    if (!isLocalhostHost && (saved.includes('localhost') || saved.includes('127.0.0.1'))) {
      return window.location.origin;
    }
    return saved;
  }
  return DEFAULT_SERVER_URL;
}

export function setServerUrl(url: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('vnr202_server_url', url);
  }
}

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    const url = getServerUrl();
    socketInstance = io(url, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socketInstance;
}

export function reconnectSocketWithNewServer(url: string): Socket {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
  setServerUrl(url);
  return getSocket();
}

// Local storage session helpers
export const SessionStorage = {
  saveHostSession(roomCode: string, hostToken: string) {
    localStorage.setItem('vnr202_host_room', roomCode);
    localStorage.setItem('vnr202_host_token', hostToken);
  },
  getHostSession(): { roomCode: string | null; hostToken: string | null } {
    return {
      roomCode: localStorage.getItem('vnr202_host_room'),
      hostToken: localStorage.getItem('vnr202_host_token'),
    };
  },
  clearHostSession() {
    localStorage.removeItem('vnr202_host_room');
    localStorage.removeItem('vnr202_host_token');
  },
  savePlayerSession(roomCode: string, playerToken: string, nickname: string, team: number) {
    localStorage.setItem('vnr202_player_room', roomCode);
    localStorage.setItem('vnr202_player_token', playerToken);
    localStorage.setItem('vnr202_player_nickname', nickname);
    localStorage.setItem('vnr202_player_team', String(team));
  },
  getPlayerSession(): {
    roomCode: string | null;
    playerToken: string | null;
    nickname: string | null;
    team: number | null;
  } {
    const teamStr = localStorage.getItem('vnr202_player_team');
    return {
      roomCode: localStorage.getItem('vnr202_player_room'),
      playerToken: localStorage.getItem('vnr202_player_token'),
      nickname: localStorage.getItem('vnr202_player_nickname'),
      team: teamStr !== null ? parseInt(teamStr, 10) : null,
    };
  },
  clearPlayerSession() {
    localStorage.removeItem('vnr202_player_room');
    localStorage.removeItem('vnr202_player_token');
    localStorage.removeItem('vnr202_player_nickname');
    localStorage.removeItem('vnr202_player_team');
  },
};
