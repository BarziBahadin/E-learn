import type { PlaybackWatermark } from './watermark';

export type PlaybackLockStatus = 'success' | 'conflict' | 'blocked' | 'error';

export type PlaybackLockResponse = {
  status: PlaybackLockStatus;
  data?: {
    session_id?: string;
    lock_version?: number;
    playback_token?: string;
    expires_at?: string;
    current_device?: string;
    current_session?: string;
    can_force?: boolean;
    watermark?: PlaybackWatermark;
  };
  reason?: string;
  message?: string;
};

export type AcquirePlaybackLockInput = {
  lesson_id: string;
  course_id: string;
  device_id: string;
};

export type RegisterDeviceInput = {
  device_name?: string;
  platform?: string;
  device_model?: string;
  os_version?: string;
  app_version?: string;
};

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

async function postPlayback<TInput extends object>(
  accessToken: string,
  path: string,
  input: TInput,
) {
  if (!apiBaseUrl) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL is required for playback APIs.');
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Playback request failed with ${response.status}.`);
  }

  return (await response.json()) as PlaybackLockResponse;
}

export async function acquirePlaybackLock(
  accessToken: string,
  input: AcquirePlaybackLockInput,
) {
  return startPlayback(accessToken, input);
}

export async function startPlayback(
  accessToken: string,
  input: AcquirePlaybackLockInput,
) {
  return postPlayback(accessToken, '/start', input);
}

export async function heartbeat(
  accessToken: string,
  input: {
    session_id: string;
    lock_version: number;
    device_id: string;
    position_seconds: number;
  },
) {
  return postPlayback(accessToken, '/heartbeat', input);
}

export async function registerDevice(
  accessToken: string,
  input: RegisterDeviceInput,
) {
  return postPlayback(accessToken, '/register-device', input);
}

export async function forceSwitchPlayback(
  accessToken: string,
  input: AcquirePlaybackLockInput,
) {
  return postPlayback(accessToken, '/force-switch', input);
}

export async function endPlayback(
  accessToken: string,
  input: {
    session_id: string;
    device_id: string;
    position_seconds?: number;
    completed?: boolean;
    end_reason?: string;
  },
) {
  return postPlayback(accessToken, '/end', input);
}

export async function getPlaybackStatus(accessToken: string) {
  if (!apiBaseUrl) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL is required for playback APIs.');
  }

  const response = await fetch(`${apiBaseUrl}/status`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Playback status failed with ${response.status}.`);
  }

  return (await response.json()) as PlaybackLockResponse;
}

async function getPlaybackAdminData(accessToken: string, path: string) {
  if (!apiBaseUrl) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL is required for playback APIs.');
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Playback admin request failed with ${response.status}.`);
  }

  return response.json() as Promise<{ status: string; data: unknown[] }>;
}

export function getPlaybackSessions(accessToken: string) {
  return getPlaybackAdminData(accessToken, '/admin/playback-sessions');
}

export function getPlaybackRiskEvents(accessToken: string) {
  return getPlaybackAdminData(accessToken, '/admin/risk-events');
}

export async function validatePlaybackToken(
  accessToken: string,
  playbackToken: string,
) {
  return postPlayback(accessToken, '/validate-token', {
    playback_token: playbackToken,
  });
}
