export type Device = {
  id: string;
  name: string;
  model: string;
  platform: string;
  location: string;
  lastSeen: string;
  status: 'Watching now' | 'Trusted' | 'Inactive';
};

export type PlaybackEvent = {
  id: string;
  title: string;
  detail: string;
  time: string;
  tone: 'success' | 'warning' | 'neutral';
};

export const currentCourse = {
  title: 'Advanced React Native',
  lesson: 'Lesson 8: Secure video playback',
  instructor: 'Dr. Sara Al-Hassan',
  progress: 68,
  position: '18:42',
  duration: '27:30',
  nextLesson: 'Offline sessions and recovery',
};

export const initialDevices: Device[] = [
  {
    id: 'dev_8f2a91',
    name: 'iPhone 15 Pro',
    model: 'iPhone15,2',
    platform: 'iOS 19.4',
    location: 'Erbil, Iraq',
    lastSeen: 'Now',
    status: 'Watching now',
  },
  {
    id: 'dev_10c4b7',
    name: 'MacBook Air',
    model: 'Mac15,12',
    platform: 'Web / Safari',
    location: 'Erbil, Iraq',
    lastSeen: 'Yesterday, 9:12 PM',
    status: 'Trusted',
  },
  {
    id: 'dev_72da30',
    name: 'Galaxy Tab S9',
    model: 'SM-X710',
    platform: 'Android 16',
    location: 'Duhok, Iraq',
    lastSeen: 'Jun 24, 4:30 PM',
    status: 'Inactive',
  },
];

export const initialEvents: PlaybackEvent[] = [
  {
    id: 'evt_01',
    title: 'Heartbeat accepted',
    detail: 'Session sess_7K2M · lock version 42',
    time: '10 seconds ago',
    tone: 'success',
  },
  {
    id: 'evt_02',
    title: 'Playback started',
    detail: 'Secure playback token issued to iPhone 15 Pro',
    time: '18 minutes ago',
    tone: 'success',
  },
  {
    id: 'evt_03',
    title: 'Device verified',
    detail: 'Known device and usual location',
    time: '18 minutes ago',
    tone: 'neutral',
  },
  {
    id: 'evt_04',
    title: 'Previous session completed',
    detail: 'Lesson 7 watched to 100%',
    time: 'Yesterday, 8:48 PM',
    tone: 'neutral',
  },
];
