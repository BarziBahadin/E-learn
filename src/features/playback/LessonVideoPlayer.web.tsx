import { createPlayer } from '@videojs/react';
import '@videojs/react/video/skin.css';
import { Video, VideoSkin, videoFeatures } from '@videojs/react/video';
import {
  type CSSProperties,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';

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

const Player = createPlayer({ features: videoFeatures });

function resolveWebVideoSource(source: LessonVideoPlayerProps['source']) {
  if (typeof source === 'string') return source;
  if (typeof source === 'object' && source) return source.uri ?? source.src ?? '';

  const assetRegistry = (globalThis as {
    __r?: { importDefault?: (moduleId: number) => unknown };
  }).__r;
  const moduleValue = assetRegistry?.importDefault?.(source);
  if (typeof moduleValue === 'string') return moduleValue;
  if (typeof moduleValue === 'object' && moduleValue) {
    const asset = moduleValue as { uri?: string; src?: string };
    return asset.uri ?? asset.src ?? '';
  }

  return '';
}

const skinStyle: CSSProperties = {
  background: '#1c1a1a',
  height: '100%',
  overflow: 'hidden',
  position: 'relative',
  width: '100%',
};

const mediaStyle = (contentFit: 'contain' | 'cover'): CSSProperties => ({
  background: '#1c1a1a',
  height: '100%',
  objectFit: contentFit,
  width: '100%',
});

const outerStyle = (style: object): CSSProperties => ({
  ...(style as CSSProperties),
  background: '#1c1a1a',
  overflow: 'hidden',
});

export const LessonVideoPlayer = forwardRef<LessonVideoPlayerHandle, LessonVideoPlayerProps>(
  function LessonVideoPlayer({
    allowsPlayback,
    contentFit = 'contain',
    onDurationChange,
    onPlayingChange,
    onStatusChange,
    onTimeChange,
    source,
    style,
  }, ref) {
    const mediaRef = useRef<HTMLVideoElement | null>(null);
    const resolvedSource = useMemo(() => resolveWebVideoSource(source), [source]);

    const pause = useCallback(() => {
      mediaRef.current?.pause();
    }, []);

    const play = useCallback(() => {
      if (!allowsPlayback) return;
      mediaRef.current?.play().catch(() => {});
    }, [allowsPlayback]);

    useImperativeHandle(ref, () => ({
      pause,
      play,
      seekBy: (seconds: number) => {
        if (!allowsPlayback || !mediaRef.current) return;
        const media = mediaRef.current;
        const duration = Number.isFinite(media.duration) && media.duration > 0
          ? media.duration
          : Number.POSITIVE_INFINITY;
        media.currentTime = Math.max(0, Math.min(duration, media.currentTime + seconds));
      },
    }), [allowsPlayback, pause, play]);

    return (
      <div style={outerStyle(style)}>
        <Player.Provider>
          <VideoSkin style={skinStyle}>
            <Video
              loop
              playsInline
              preload="metadata"
              ref={mediaRef}
              src={resolvedSource}
              style={mediaStyle(contentFit)}
              onDurationChange={(event) => onDurationChange(event.currentTarget.duration || 0)}
              onLoadedMetadata={(event) => onDurationChange(event.currentTarget.duration || 0)}
              onPause={() => {
                onPlayingChange(false);
                onStatusChange('paused');
              }}
              onPlay={(event) => {
                if (!allowsPlayback) {
                  event.currentTarget.pause();
                  onPlayingChange(false);
                  return;
                }
                onPlayingChange(true);
                onStatusChange('playing');
              }}
              onTimeUpdate={(event) => onTimeChange(event.currentTarget.currentTime || 0)}
              onWaiting={() => onStatusChange('buffering')}
            />
          </VideoSkin>
        </Player.Provider>
      </div>
    );
  },
);
