import { forwardRef, useEffect, useImperativeHandle } from 'react';
import { Text, View } from 'react-native';

export type LessonVideoStatus = string;

export type LessonVideoPlayerHandle = {
  pause: () => void;
  play: () => void;
  seekBy: (seconds: number) => void;
};

export type LessonVideoPlayerProps = {
  allowsPlayback: boolean;
  contentFit?: 'contain' | 'cover';
  source: number | string | { uri?: string; src?: string };
  style: object;
  onDurationChange: (duration: number) => void;
  onPlayingChange: (isPlaying: boolean) => void;
  onStatusChange: (status: LessonVideoStatus) => void;
  onTimeChange: (time: number) => void;
};

export const LessonVideoPlayer = forwardRef<LessonVideoPlayerHandle, LessonVideoPlayerProps>(
  function LessonVideoPlayer({ style, onDurationChange, onPlayingChange, onStatusChange, onTimeChange }, ref) {
    useEffect(() => {
      onDurationChange(0);
      onTimeChange(0);
    }, [onDurationChange, onTimeChange]);

    useImperativeHandle(ref, () => ({
      pause: () => {
        onPlayingChange(false);
        onStatusChange('paused');
      },
      play: () => {
        onPlayingChange(false);
        onStatusChange('Video.js player is available on web only');
      },
      seekBy: () => {},
    }), [onPlayingChange, onStatusChange]);

    return (
      <View style={[style, { alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', textAlign: 'center' }}>
          Video.js playback is available in the web app.
        </Text>
      </View>
    );
  },
);
