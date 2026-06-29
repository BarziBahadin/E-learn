import { useEvent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  CreditCard,
  Check,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Clock3,
  Database,
  Download,
  Gauge,
  GraduationCap,
  KeyRound,
  Laptop,
  ListChecks,
  Lock,
  LockKeyhole,
  LogOut,
  Pause,
  Play,
  PlayCircle,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Square,
  Send,
  TicketCheck,
  TimerOff,
  Upload,
  Users,
  UserRound,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  advanceDemoTime,
  createDemoState,
  endPlayback,
  forceSwitch,
  getLockTtlSeconds,
  heartbeat,
  HEARTBEAT_INTERVAL_SECONDS,
  LOCK_TTL_SECONDS,
  redisConflictKey,
  redisCooldownKey,
  redisLockKey,
  registerDevice,
  setRedisAvailable,
  startPlayback,
  type DemoDevice,
  type DemoPlaybackState,
  type DemoUser,
  type StartResult,
} from './demoPlaybackEngine';
import {
  courseLessons,
  courseProgress,
  initialCompletedLessonIds,
  studentCourses,
  type Lesson,
  type StudentCourse,
} from './studentCatalog';
import {
  auditRows,
  contentRows,
  initialCoupons,
  initialNotifications,
  initialPayments,
  subjects,
  teacherStudents,
  teachers,
} from './platformDemoData';
import LandingPage from '../landing/LandingPage';
import { DynamicWatermark } from '../features/playback/DynamicWatermark';
import type { PlaybackWatermark } from '../features/playback/watermark';
import {
  ACADEMIC_YEAR_ACCESS_MODEL,
  formatIQD,
  pathLabel,
  payoutLabel,
  pricingPlanById,
  pricingPlans,
  pricingSystemConstraints,
  subjectsForPlan,
  type AcademicSubject,
  type PricingPlanId,
} from '../features/pricing/academicYearPlans';

type Page = 'Discover' | 'Courses' | 'Plans' | 'Course' | 'Checkout' | 'Lesson' | 'Status' | 'Notifications' | 'Teacher' | 'Admin' | 'Profile';
type AdminView = 'Overview' | 'Content' | 'Plans' | 'Payments' | 'Coupons' | 'Sessions' | 'Risk events' | 'Devices' | 'Notifications' | 'Audit logs';
type ClientSession = {
  sessionId: string;
  deviceId: string;
  lockVersion: number;
  videoToken: string;
  tokenExpiresAtMs: number;
  watermark: PlaybackWatermark;
};

const VIDEO_SOURCE = require('../../assets/mixkit-hands-of-a-person-typing-on-a-cell-phone-4915-full-hd.mp4');

const isIOS = Platform.OS === 'ios';

const colors = {
  ink: isIOS ? '#1c1c1e' : '#17221f',
  muted: isIOS ? '#6c6c70' : '#65736e',
  subtle: isIOS ? '#8e8e93' : '#87938e',
  border: isIOS ? '#c6c6c8' : '#dce3df',
  canvas: isIOS ? '#f2f2f7' : '#f4f6f5',
  white: '#ffffff',
  green: isIOS ? '#007aff' : '#19714f',
  greenDark: isIOS ? '#007aff' : '#10533a',
  greenSoft: isIOS ? '#eaf3ff' : '#e8f4ee',
  blue: isIOS ? '#007aff' : '#295f9b',
  blueSoft: isIOS ? '#eaf3ff' : '#eaf1f8',
  amber: isIOS ? '#ff9500' : '#9a5b13',
  amberSoft: isIOS ? '#fff4e5' : '#fff3df',
  red: isIOS ? '#ff3b30' : '#b23b35',
  redSoft: isIOS ? '#ffebea' : '#fff0ef',
  charcoal: isIOS ? '#000000' : '#111916',
};

function Pill({ label, tone = 'neutral' }: { label: string; tone?: 'success' | 'warning' | 'danger' | 'neutral' }) {
  const toneStyle =
    tone === 'success' ? styles.pillSuccess
      : tone === 'warning' ? styles.pillWarning
        : tone === 'danger' ? styles.pillDanger
          : styles.pillNeutral;
  const textStyle =
    tone === 'success' ? styles.pillTextSuccess
      : tone === 'warning' ? styles.pillTextWarning
        : tone === 'danger' ? styles.pillTextDanger
          : styles.pillTextNeutral;
  return <View style={[styles.pill, toneStyle]}><Text style={[styles.pillText, textStyle]}>{label}</Text></View>;
}

function Button({
  label,
  icon,
  onPress,
  tone = 'primary',
  disabled = false,
}: {
  label: string;
  icon?: React.ReactNode;
  onPress: () => void;
  tone?: 'primary' | 'secondary' | 'danger' | 'warning';
  disabled?: boolean;
}) {
  const buttonStyle =
    tone === 'secondary' ? styles.buttonSecondary
      : tone === 'danger' ? styles.buttonDanger
        : tone === 'warning' ? styles.buttonWarning
          : styles.buttonPrimary;
  const textStyle = tone === 'secondary' ? styles.buttonTextSecondary : styles.buttonTextLight;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, buttonStyle, pressed && styles.pressed, disabled && styles.disabled]}
    >
      {icon}
      <Text style={[styles.buttonText, textStyle]}>{label}</Text>
    </Pressable>
  );
}

function Metric({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return (
    <View style={styles.metric}>
      <View style={styles.metricIcon}>{icon}</View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricNote}>{note}</Text>
    </View>
  );
}

export default function PrototypeApp() {
  const { width } = useWindowDimensions();
  const compact = width < 780;
  const [state, setState] = useState<DemoPlaybackState>(() => createDemoState());
  const [selectedUserId, setSelectedUserId] = useState<DemoUser['id']>('user_123');
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);
  const [currentDevice, setCurrentDevice] = useState<DemoDevice | null>(null);
  const [showLanding, setShowLanding] = useState(true);
  const [page, setPage] = useState<Page>('Courses');
  const [adminView, setAdminView] = useState<AdminView>('Overview');
  const [selectedCourseId, setSelectedCourseId] = useState('course_001');
  const [selectedLessonId, setSelectedLessonId] = useState('lesson_008');
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(initialCompletedLessonIds);
  const [expandedChapterIds, setExpandedChapterIds] = useState<string[]>(['chapter_003']);
  const [clientSession, setClientSession] = useState<ClientSession | null>(null);
  const [staleSession, setStaleSession] = useState<ClientSession | null>(null);
  const [conflict, setConflict] = useState<Extract<StartResult, { allowed: false }> | null>(null);
  const [conflictDevice, setConflictDevice] = useState<DemoDevice | null>(null);
  const [heartbeatsEnabled, setHeartbeatsEnabled] = useState(true);
  const [heartbeatIn, setHeartbeatIn] = useState(HEARTBEAT_INTERVAL_SECONDS);
  const [notice, setNotice] = useState('Register a device to begin the demo.');
  const [authStep, setAuthStep] = useState<'account' | 'otp'>('account');
  const [otp, setOtp] = useState('123456');
  const [selectedSubjectId, setSelectedSubjectId] = useState('physics');
  const [selectedTeacherId, setSelectedTeacherId] = useState('teacher_ahmed');
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>(['course_001']);
  const [checkoutCourseId, setCheckoutCourseId] = useState('course_002');
  const [selectedPricingPlanId, setSelectedPricingPlanId] = useState<PricingPlanId>('bronze');
  const [selectedPricingPathIndex, setSelectedPricingPathIndex] = useState(0);
  const [pendingPricingPlanId, setPendingPricingPlanId] = useState<PricingPlanId | null>(null);
  const [unlockMethod, setUnlockMethod] = useState<'Coupon' | 'Manual payment' | 'Online payment'>('Coupon');
  const [couponCode, setCouponCode] = useState('WELCOME12');
  const [notifications, setNotifications] = useState(initialNotifications);
  const [supportMessage, setSupportMessage] = useState('I need help accessing my lesson attachment.');
  const [ticketCount, setTicketCount] = useState(0);
  const [payments, setPayments] = useState(initialPayments);
  const [coupons, setCoupons] = useState(initialCoupons);
  const [broadcastMessage, setBroadcastMessage] = useState('New Grade 12 revision lessons are now available.');

  const player = useVideoPlayer(VIDEO_SOURCE, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.pause();
  });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  const activeLock = currentUser ? state.locks[currentUser.id] : undefined;
  const ownsActiveLock = Boolean(
    activeLock && clientSession && activeLock.session_id === clientSession.sessionId,
  );
  const lockTtl = currentUser ? getLockTtlSeconds(state, currentUser.id) : 0;
  const cooldownTtl = currentUser
    ? Math.max(0, Math.ceil(((state.cooldowns[currentUser.id] ?? 0) - state.now_ms) / 1000))
    : 0;
  const selectedCourse = studentCourses.find((item) => item.id === selectedCourseId) ?? studentCourses[0];
  const selectedLesson = selectedCourse.chapters
    .flatMap((chapter) => chapter.lessons)
    .find((lesson) => lesson.id === selectedLessonId) ?? selectedCourse.chapters[0]?.lessons[0];
  const selectedChapter = selectedCourse.chapters.find((chapter) =>
    chapter.lessons.some((lesson) => lesson.id === selectedLesson?.id),
  );
  const selectedLessonIndex = selectedLesson
    ? courseLessons(selectedCourse).findIndex((lesson) => lesson.id === selectedLesson.id)
    : -1;
  const nextAvailableLesson = courseLessons(selectedCourse)
    .slice(selectedLessonIndex + 1)
    .find((lesson) => lesson.available);
  const checkoutCourse = studentCourses.find((course) => course.id === checkoutCourseId) ?? studentCourses[0];
  const selectedPricingPlan = pricingPlanById(selectedPricingPlanId);
  const selectedPlanSubjects = subjectsForPlan(selectedPricingPlan, {
    pathIndex: selectedPricingPathIndex,
    standaloneSubject: checkoutCourse.category as AcademicSubject,
  });

  useEffect(() => {
    const clock = setInterval(() => {
      setState((current) => advanceDemoTime(current, 1));
      setHeartbeatIn((seconds) => (seconds <= 1 ? HEARTBEAT_INTERVAL_SECONDS : seconds - 1));
    }, 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    if (!currentUser || !clientSession || !heartbeatsEnabled || !isPlaying || !ownsActiveLock) return;
    const interval = setInterval(() => {
      let accepted = false;
      setState((current) => {
        const result = heartbeat(current, {
          user_id: currentUser.id,
          device_id: clientSession.deviceId,
          session_id: clientSession.sessionId,
          lock_version: clientSession.lockVersion,
        });
        accepted = result.result.ok;
        return result.state;
      });
      setHeartbeatIn(HEARTBEAT_INTERVAL_SECONDS);
      if (accepted) setNotice('Protected playback connection refreshed.');
    }, HEARTBEAT_INTERVAL_SECONDS * 1000);
    return () => clearInterval(interval);
  }, [clientSession, currentUser, heartbeatsEnabled, isPlaying, ownsActiveLock]);

  useEffect(() => {
    if (clientSession && !activeLock) {
      player.pause();
      setClientSession(null);
      setNotice('Playback ended after the protected connection expired. Start the lesson again to continue.');
    }
  }, [activeLock, clientSession, player]);

  const currentUserDevices = useMemo(
    () => state.devices.filter((device) => device.user_id === currentUser?.id),
    [currentUser?.id, state.devices],
  );
  const availableUsers = useMemo(
    () => Platform.OS === 'web' ? state.users : state.users.filter((user) => user.role !== 'admin'),
    [state.users],
  );

  const login = useCallback(() => {
    if (authStep === 'account') {
      setAuthStep('otp');
      setNotice('A demo OTP was sent. Enter 123456 to verify the account.');
      return;
    }
    if (otp !== '123456') {
      setNotice('Verification failed. Use the demo code 123456 and try again.');
      return;
    }
    const user = state.users.find((item) => item.id === selectedUserId);
    if (!user) return;
    if (user.role === 'admin' && Platform.OS !== 'web') {
      setNotice('Admin access is available only in the E-Lern web application.');
      setSelectedUserId('user_123');
      return;
    }
    const registered = registerDevice(state, {
      user_id: user.id,
      device_name: isIOS ? 'This iPhone' : 'Chrome on Mac',
      platform: isIOS ? 'ios' : 'web',
    });
    setState(registered.state);
    setCurrentUser(user);
    setCurrentDevice(registered.result);
    setPage(user.role === 'admin' ? 'Admin' : user.role === 'teacher' ? 'Teacher' : pendingPricingPlanId ? 'Checkout' : 'Discover');
    setNotice('');
  }, [authStep, otp, pendingPricingPlanId, selectedUserId, state]);

  const start = useCallback(() => {
    if (!currentUser || !currentDevice || !selectedCourse || !selectedLesson) return;
    const started = startPlayback(state, {
      user_id: currentUser.id,
      device_id: currentDevice.device_id,
      course_id: selectedCourse.id,
      lesson_id: selectedLesson.id,
    });
    setState(started.state);
    if (!started.result.allowed) {
      setConflict(started.result);
      setNotice(started.result.message);
      return;
    }
    const lock = started.state.locks[currentUser.id];
    if (!lock) return;
    setClientSession({
      sessionId: started.result.session_id,
      deviceId: currentDevice.device_id,
      lockVersion: lock.lock_version,
      videoToken: started.result.video_token,
      tokenExpiresAtMs: started.result.video_token_expires_at_ms,
      watermark: started.result.watermark,
    });
    setHeartbeatsEnabled(true);
    setHeartbeatIn(HEARTBEAT_INTERVAL_SECONDS);
    setConflict(null);
    setNotice('Lesson started with protected playback.');
    player.play();
  }, [currentDevice, currentUser, player, selectedCourse, selectedLesson, state]);

  const togglePlayback = useCallback(() => {
    if (!ownsActiveLock) {
      start();
      return;
    }
    if (isPlaying) player.pause();
    else player.play();
  }, [isPlaying, ownsActiveLock, player, start]);

  const sendHeartbeat = useCallback((session = clientSession) => {
    if (!currentUser || !session) return;
    const refreshed = heartbeat(state, {
      user_id: currentUser.id,
      device_id: session.deviceId,
      session_id: session.sessionId,
      lock_version: session.lockVersion,
    });
    setState(refreshed.state);
    setHeartbeatIn(HEARTBEAT_INTERVAL_SECONDS);
    setNotice(
      refreshed.result.ok
        ? 'Heartbeat accepted. The lock TTL is back to 90 seconds.'
        : `Heartbeat rejected: ${refreshed.result.reason}.`,
    );
    if (!refreshed.result.ok && session === clientSession) player.pause();
  }, [clientSession, currentUser, player, state]);

  const stopSession = useCallback(() => {
    if (!currentUser || !currentDevice || !clientSession) return;
    const ended = endPlayback(state, {
      user_id: currentUser.id,
      device_id: currentDevice.device_id,
      session_id: clientSession.sessionId,
      reason: 'USER_STOPPED',
    });
    setState(ended.state);
    player.pause();
    setClientSession(null);
    setNotice(ended.result.ok ? 'Playback ended.' : 'Playback could not be ended. Please try again.');
  }, [clientSession, currentDevice, currentUser, player, state]);

  const simulateSecondDevice = useCallback(() => {
    if (!currentUser || !selectedCourse || !selectedLesson) return;
    const registered = registerDevice(state, {
      user_id: currentUser.id,
      device_name: 'iPhone 15 Pro',
      platform: 'ios',
    });
    const attempted = startPlayback(registered.state, {
      user_id: currentUser.id,
      device_id: registered.result.device_id,
      course_id: selectedCourse.id,
      lesson_id: selectedLesson.id,
    });
    setState(attempted.state);
    setConflictDevice(registered.result);
    if (!attempted.result.allowed) {
      setConflict(attempted.result);
      setNotice('Second device blocked. ACTIVE_SESSION_EXISTS risk event saved.');
    } else {
      setNotice('The second device started because no active lock existed.');
    }
  }, [currentUser, selectedCourse, selectedLesson, state]);

  const moveToSecondDevice = useCallback(() => {
    if (!currentUser || !conflictDevice || !selectedCourse || !selectedLesson) return;
    const oldClient = clientSession;
    const switched = forceSwitch(state, {
      user_id: currentUser.id,
      device_id: conflictDevice.device_id,
      course_id: selectedCourse.id,
      lesson_id: selectedLesson.id,
    });
    setState(switched.state);
    if (!switched.result.allowed) {
      setNotice(switched.result.message);
      return;
    }
    const lock = switched.state.locks[currentUser.id];
    if (!lock) return;
    setStaleSession(oldClient);
    setCurrentDevice(conflictDevice);
    setClientSession({
      sessionId: switched.result.session_id,
      deviceId: conflictDevice.device_id,
      lockVersion: lock.lock_version,
      videoToken: switched.result.video_token,
      tokenExpiresAtMs: switched.result.video_token_expires_at_ms,
      watermark: switched.result.watermark,
    });
    setConflict(null);
    setHeartbeatsEnabled(true);
    setHeartbeatIn(HEARTBEAT_INTERVAL_SECONDS);
    setNotice('Force switch complete. The old session ended and lock version increased.');
    player.play();
  }, [clientSession, conflictDevice, currentUser, player, selectedCourse, selectedLesson, state]);

  const openCourse = useCallback((courseToOpen: StudentCourse) => {
    const lessons = courseLessons(courseToOpen);
    const nextLesson = lessons.find(
      (lesson) => lesson.available && !completedLessonIds.includes(lesson.id),
    ) ?? lessons.find((lesson) => lesson.available);
    setSelectedCourseId(courseToOpen.id);
    if (nextLesson) setSelectedLessonId(nextLesson.id);
    const chapter = courseToOpen.chapters.find((item) =>
      item.lessons.some((lesson) => lesson.id === nextLesson?.id),
    );
    setExpandedChapterIds(chapter ? [chapter.id] : [courseToOpen.chapters[0]?.id ?? '']);
    setPage('Course');
    setNotice(`Opened ${courseToOpen.title}. Select any available lesson to continue.`);
  }, [completedLessonIds]);

  const previewCourse = useCallback((courseToOpen: StudentCourse) => {
    const lesson = courseLessons(courseToOpen).find((item) => item.available);
    if (!lesson) return;
    const chapter = courseToOpen.chapters.find((item) => item.lessons.some((entry) => entry.id === lesson.id));
    setSelectedCourseId(courseToOpen.id);
    setSelectedLessonId(lesson.id);
    setExpandedChapterIds(chapter ? [chapter.id] : []);
    setPage('Lesson');
    setNotice(`Free preview opened for “${lesson.title}”. Secure playback rules still apply.`);
  }, []);

  const openCheckout = useCallback((courseId: string, planId: PricingPlanId = 'bronze') => {
    setCheckoutCourseId(courseId);
    setSelectedPricingPlanId(planId);
    setSelectedPricingPathIndex(0);
    setPendingPricingPlanId(null);
    setPage('Checkout');
    setNotice('Choose a plan, confirm its fixed subject path, then select an unlock method.');
  }, []);

  const completeUnlock = useCallback(() => {
    if (unlockMethod === 'Coupon' && couponCode.trim().toUpperCase() !== 'WELCOME12') {
      setNotice('Coupon rejected by the demo validation function. Try WELCOME12.');
      return;
    }
    const unlockedCourses = studentCourses.filter((course) =>
      selectedPlanSubjects.includes(course.category as AcademicSubject),
    );
    const unlockedCourseIds = unlockedCourses.map((course) => course.id);
    setEnrolledCourseIds((current) => Array.from(new Set([...current, ...unlockedCourseIds])));
    const course = unlockedCourses[0] ?? checkoutCourse;
    setNotice(
      unlockMethod === 'Manual payment'
        ? `Payment proof uploaded for ${selectedPricingPlan.tierName}. Demo admin approval completed and access is active.`
        : `${selectedPricingPlan.tierName} activated for ${pathLabel(selectedPlanSubjects)}. Enrollment and notification rows were created.`,
    );
    setPendingPricingPlanId(null);
    if (course) openCourse(course);
  }, [checkoutCourse, couponCode, openCourse, selectedPlanSubjects, selectedPricingPlan, unlockMethod]);

  const submitSupportTicket = useCallback(() => {
    if (!supportMessage.trim()) {
      setNotice('Add a short description before submitting the ticket.');
      return;
    }
    setTicketCount((count) => count + 1);
    setSupportMessage('');
    setNotice('Support ticket submitted. The admin notification was queued.');
  }, [supportMessage]);

  const updatePayment = useCallback((id: string, status: 'Approved' | 'Refunded') => {
    setPayments((current) => current.map((payment) => payment.id === id ? { ...payment, status } : payment));
    setNotice(`${id} marked ${status.toLowerCase()}. Enrollment and audit records were updated.`);
  }, []);

  const toggleDeviceBlocked = useCallback((deviceId: string) => {
    setState((current) => ({
      ...current,
      devices: current.devices.map((device) => device.device_id === deviceId ? { ...device, is_blocked: !device.is_blocked } : device),
    }));
    setNotice(`Device ${deviceId} block status changed and an audit event was recorded.`);
  }, []);

  const openLesson = useCallback((courseToOpen: StudentCourse, lesson: Lesson, chapterId: string) => {
    if (!lesson.available) {
      setNotice('This lesson is locked until the previous chapter is completed.');
      return;
    }

    if (currentUser && currentDevice && clientSession) {
      const ended = endPlayback(state, {
        user_id: currentUser.id,
        device_id: currentDevice.device_id,
        session_id: clientSession.sessionId,
        reason: 'LESSON_CHANGED',
      });
      setState(ended.state);
      setClientSession(null);
      player.pause();
    }

    setSelectedCourseId(courseToOpen.id);
    setSelectedLessonId(lesson.id);
    setExpandedChapterIds((current) => current.includes(chapterId) ? current : [...current, chapterId]);
    setPage('Lesson');
    setNotice(`Selected “${lesson.title}”. Start playback when ready.`);
  }, [clientSession, currentDevice, currentUser, player, state]);

  const markLessonComplete = useCallback(() => {
    if (!selectedLesson) return;
    setCompletedLessonIds((current) =>
      current.includes(selectedLesson.id) ? current : [...current, selectedLesson.id],
    );
    setNotice(`Completed “${selectedLesson.title}”. Course progress has been updated.`);
  }, [selectedLesson]);

  const openNextLesson = useCallback(() => {
    if (!selectedCourse || !selectedLesson) return;
    const lessons = courseLessons(selectedCourse);
    const currentIndex = lessons.findIndex((lesson) => lesson.id === selectedLesson.id);
    const nextLesson = lessons.slice(currentIndex + 1).find((lesson) => lesson.available);
    if (!nextLesson) {
      setNotice('You reached the final available lesson in this course.');
      return;
    }
    const chapter = selectedCourse.chapters.find((item) =>
      item.lessons.some((lesson) => lesson.id === nextLesson.id),
    );
    openLesson(selectedCourse, nextLesson, chapter?.id ?? selectedCourse.chapters[0]?.id ?? '');
  }, [openLesson, selectedCourse, selectedLesson]);

  const expireNow = useCallback(() => {
    setHeartbeatsEnabled(false);
    setState((current) => advanceDemoTime(current, LOCK_TTL_SECONDS + 1));
  }, []);

  const resetDemo = useCallback(() => {
    player.pause();
    setState(createDemoState());
    setCurrentUser(null);
    setCurrentDevice(null);
    setClientSession(null);
    setStaleSession(null);
    setConflict(null);
    setConflictDevice(null);
    setPage('Courses');
    setSelectedCourseId('course_001');
    setSelectedLessonId('lesson_008');
    setCompletedLessonIds(initialCompletedLessonIds);
    setExpandedChapterIds(['chapter_003']);
    setSelectedPricingPlanId('bronze');
    setSelectedPricingPathIndex(0);
    setPendingPricingPlanId(null);
    setHeartbeatsEnabled(true);
    setHeartbeatIn(HEARTBEAT_INTERVAL_SECONDS);
    setNotice('Register a device to begin the demo.');
    setAuthStep('account');
    setShowLanding(true);
  }, [player]);

  const switchUser = useCallback(() => {
    player.pause();
    setCurrentUser(null);
    setCurrentDevice(null);
    setClientSession(null);
    setStaleSession(null);
    setConflict(null);
    setConflictDevice(null);
    setHeartbeatsEnabled(true);
    setHeartbeatIn(HEARTBEAT_INTERVAL_SECONDS);
    setPage('Courses');
    setAuthStep('account');
    setPendingPricingPlanId(null);
    setShowLanding(false);
    setNotice('Choose another role. Existing demo sessions and audit records are preserved.');
  }, [player]);

  if (!currentUser || !currentDevice) {
    if (showLanding) {
      return <LandingPage onStartDemo={(planId) => {
        if (planId) {
          setSelectedPricingPlanId(planId);
          setSelectedPricingPathIndex(0);
          setPendingPricingPlanId(planId);
        } else {
          setPendingPricingPlanId(null);
        }
        setShowLanding(false);
      }} />;
    }

    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        <View style={styles.loginShell}>
          <Pressable onPress={() => setShowLanding(true)} style={styles.backToLanding}>
            <Text style={styles.backToLandingText}>Back to website</Text>
          </Pressable>
          <View style={styles.loginBrand}>
            <View style={styles.brandMark}><Image source={require('../../assets/icon.png')} style={styles.brandImage} /></View>
            <Text style={styles.brandName}>E-Lern</Text>
          </View>
          <View style={styles.loginPanel}>
            <Pill label="Interactive prototype" tone="success" />
            <Text style={styles.loginTitle}>Grade 12 learning demo</Text>
            <Text style={styles.loginSubtitle}>Choose a role, verify the demo OTP, and explore the complete learning platform.</Text>
            <Text style={styles.fieldLabel}>Mock user</Text>
            <View style={styles.userOptions}>
              {availableUsers.map((user) => {
                const selected = selectedUserId === user.id;
                return (
                  <Pressable
                    key={user.id}
                    onPress={() => setSelectedUserId(user.id)}
                    style={[styles.userOption, selected && styles.userOptionSelected]}
                  >
                    <View style={[styles.userIcon, selected && styles.userIconSelected]}><UserRound color={selected ? colors.white : colors.greenDark} size={20} /></View>
                    <View style={styles.userOptionCopy}>
                      <View style={styles.userNameLine}>
                        <Text style={styles.userName}>{user.name}</Text>
                        <Pill label={user.role === 'student' ? 'Student' : user.role === 'teacher' ? 'Teacher' : 'Admin'} tone={user.role === 'student' ? 'success' : 'warning'} />
                      </View>
                      <Text style={styles.userMeta}>{user.id} · {user.email}</Text>
                    </View>
                    {selected && <Check color={colors.green} size={20} />}
                  </Pressable>
                );
              })}
            </View>
            {authStep === 'otp' && (
              <View style={styles.otpPanel}>
                <View><Text style={styles.registrationTitle}>Verify email or phone</Text><Text style={styles.registrationMeta}>Demo code: 123456</Text></View>
                <TextInput accessibilityLabel="One-time password" keyboardType="number-pad" maxLength={6} onChangeText={setOtp} style={styles.textInput} value={otp} />
              </View>
            )}
            <View style={styles.registrationPreview}>
              {isIOS ? <Smartphone color={colors.blue} size={20} /> : <Laptop color={colors.blue} size={20} />}
              <View style={styles.registrationCopy}>
                <Text style={styles.registrationTitle}>{isIOS ? 'This iPhone' : 'Chrome on Mac'}</Text>
                <Text style={styles.registrationMeta}>Platform: {isIOS ? 'iOS' : 'web'} · IP and user-agent stored as hashes</Text>
              </View>
            </View>
            <Button
              label={authStep === 'account' ? 'Send demo OTP' : 'Verify and continue'}
              icon={<KeyRound color={colors.white} size={17} />}
              onPress={login}
            />
          </View>
          <Text style={styles.loginFootnote}>Auth, payments, storage, notifications, and DRM are simulated. Playback locking uses the in-memory Redis and SQL model.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const userInitials = currentUser.name.split(' ').map((part) => part[0]).join('').slice(0, 2);
  const desktopWeb = Platform.OS === 'web' && width >= 920;
  const roleNavigation: Page[] = currentUser.role === 'student'
    ? (desktopWeb ? ['Discover', 'Courses', 'Plans', 'Notifications', 'Status', 'Profile'] : isIOS ? ['Discover', 'Courses', 'Plans', 'Notifications', 'Profile'] : ['Discover', 'Courses', 'Plans', 'Notifications'])
    : currentUser.role === 'teacher'
      ? (desktopWeb || isIOS ? ['Teacher', 'Profile'] : ['Teacher'])
      : (desktopWeb || isIOS ? ['Admin', 'Status', 'Profile'] : ['Admin', 'Status']);
  const isNavigationActive = (item: Page) => item === 'Courses'
    ? ['Courses', 'Course', 'Lesson'].includes(page)
    : item === 'Plans'
      ? ['Plans', 'Checkout'].includes(page)
      : page === item;
  const navigation = (
    <View style={[styles.bottomNavItems, isIOS && styles.bottomNavItemsIOS]}>
      {roleNavigation.map((item) => {
        const active = isNavigationActive(item);
        return (
          <Pressable
            accessibilityLabel={`${item} section`}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            key={item}
            onPress={() => setPage(item)}
            style={({ pressed }) => [
              styles.bottomNavItem,
              isIOS && styles.bottomNavItemIOS,
              pressed && styles.bottomNavPressed,
            ]}
          >
            <View style={[
              styles.bottomNavIcon,
              isIOS && styles.bottomNavIconIOS,
              active && styles.bottomNavIconActive,
              isIOS && active && styles.bottomNavIconActiveIOS,
            ]}>
              {navigationIcon(item, active)}
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.bottomNavLabel,
                isIOS && styles.bottomNavLabelIOS,
                active && styles.bottomNavLabelActive,
              ]}
            >
              {item}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
  const profileTrigger = (
    <Pressable accessibilityLabel="Open profile" accessibilityRole="button" onPress={() => setPage('Profile')} style={({ pressed }) => [styles.profileTrigger, desktopWeb && styles.webProfileTrigger, pressed && styles.pressed]}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{userInitials}</Text></View>
      <View style={styles.profileTriggerCopy}>
        <Text numberOfLines={1} style={styles.profileTriggerName}>{currentUser.name}</Text>
        {!compact && <Text style={styles.profileTriggerHint}>{desktopWeb ? currentUser.email : 'View profile'}</Text>}
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.screen, desktopWeb && styles.webScreen]}>
      <StatusBar style="dark" />
      <View style={[styles.topbar, desktopWeb && styles.webTopbar]}>
        {desktopWeb ? (
          <View style={styles.webBrand}>
            <View style={styles.brandMark}><Image source={require('../../assets/icon.png')} style={styles.brandImage} /></View>
            <View>
              <Text style={styles.brandName}>E-Lern</Text>
              <Text style={styles.brandTagline}>{currentUser.role === 'admin' ? 'Administration workspace' : 'Grade 12 learning workspace'}</Text>
            </View>
          </View>
        ) : profileTrigger}
        <View style={styles.topbarRight}>
          <Pill label={compact ? currentUser.role : `${currentUser.role[0]?.toUpperCase()}${currentUser.role.slice(1)} account`} tone={currentUser.role === 'student' ? 'success' : 'warning'} />
          {!compact && currentUser.role === 'admin' && <Pill label={state.redis_available ? 'Redis online' : 'Redis unavailable'} tone={state.redis_available ? 'success' : 'danger'} />}
          {!compact && !desktopWeb && <Text style={styles.deviceLabel}>{currentDevice.device_name}</Text>}
          {desktopWeb && profileTrigger}
        </View>
      </View>

      <View style={[styles.appBody, desktopWeb && styles.webAppBody]}>
        {desktopWeb && (
          <View style={styles.webSidebar}>
            <Text style={styles.webSidebarEyebrow}>WORKSPACE</Text>
            <View style={styles.webSidebarNavigation}>
              {roleNavigation.map((item) => {
                const active = isNavigationActive(item);
                return (
                  <Pressable
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    key={item}
                    onPress={() => setPage(item)}
                    style={({ pressed }) => [styles.webNavItem, active && styles.webNavItemActive, pressed && styles.pressed]}
                  >
                    <View style={[styles.webNavIcon, active && styles.webNavIconActive]}>{navigationIcon(item, active)}</View>
                    <Text style={[styles.webNavLabel, active && styles.webNavLabelActive]}>{item}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.webSidebarFooter}>
              <ShieldCheck color={colors.green} size={19} />
              <View style={styles.webSidebarFooterCopy}>
                <Text style={styles.webSidebarFooterTitle}>Protected learning</Text>
                <Text style={styles.webSidebarFooterText}>One active playback device</Text>
              </View>
            </View>
          </View>
        )}

        <ScrollView style={[styles.scroll, desktopWeb && styles.webMainScroll]} contentContainerStyle={[styles.scrollContent, desktopWeb && styles.webScrollContent]}>
          <View style={[styles.content, desktopWeb && styles.webContent]}>
          {notice ? (
            <View style={styles.noticeBar}>
              <Activity color={colors.blue} size={17} />
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          ) : null}

          {conflict && conflict.reason === 'ACTIVE_SESSION_EXISTS' && (
            <View style={styles.conflictBanner}>
              <View style={styles.conflictIcon}><ShieldAlert color={colors.amber} size={22} /></View>
              <View style={styles.conflictCopy}>
                <Text style={styles.conflictTitle}>Second device blocked</Text>
                <Text style={styles.conflictText}>{conflict.message} The existing lock is still active.</Text>
              </View>
              <View style={styles.actionRow}>
                <Button label="Keep current device" tone="secondary" onPress={() => setConflict(null)} />
                <Button label="Force switch" tone="warning" icon={<RefreshCw color={colors.white} size={16} />} onPress={moveToSecondDevice} />
              </View>
            </View>
          )}

          {page === 'Discover' && currentUser.role === 'student' && (
            <View style={styles.pageStack}>
              <View style={styles.pageHeader}>
                <View><Text style={styles.overline}>GRADE 12 CURRICULUM</Text><Text style={styles.pageTitle}>Find your next course</Text><Text style={styles.pageSubtitle}>Choose a subject, compare teachers, preview a lesson, and unlock the full course.</Text></View>
                <Pill label="Realtime catalog" tone="success" />
              </View>
              <View style={styles.sectionBlock}>
                <Text style={styles.panelEyebrow}>1 · CHOOSE A SUBJECT</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
                  {subjects.map((subject) => (
                    <Pressable key={subject.id} onPress={() => { setSelectedSubjectId(subject.id); const first = teachers.find((teacher) => teacher.subjectId === subject.id); if (first) setSelectedTeacherId(first.id); }} style={[styles.choiceCard, selectedSubjectId === subject.id && styles.choiceCardSelected]}>
                      <BookOpen color={selectedSubjectId === subject.id ? colors.white : colors.green} size={20} />
                      <Text style={[styles.choiceTitle, selectedSubjectId === subject.id && styles.choiceTextSelected]}>{subject.name}</Text>
                      <Text style={[styles.choiceMeta, selectedSubjectId === subject.id && styles.choiceTextSelected]}>{subject.teacherCount} teachers · {subject.courseCount} courses</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.sectionBlock}>
                <Text style={styles.panelEyebrow}>2 · CHOOSE A TEACHER</Text>
                <View style={[styles.courseGrid, compact && styles.courseGridCompact]}>
                  {teachers.filter((teacher) => teacher.subjectId === selectedSubjectId).map((teacher) => (
                    <Pressable key={teacher.id} onPress={() => setSelectedTeacherId(teacher.id)} style={[styles.teacherCard, selectedTeacherId === teacher.id && styles.teacherCardSelected]}>
                      <View style={styles.teacherAvatar}><Text style={styles.avatarText}>{teacher.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</Text></View>
                      <View style={styles.teacherCopy}><Text style={styles.courseCardTitle}>{teacher.name}</Text><Text style={styles.teacherSubject}>{teacher.subject}</Text><Text style={styles.courseCardDescription}>{teacher.bio}</Text><Text style={styles.courseStat}>{teacher.students} students · {teacher.completionRate}% completion</Text></View>
                      {selectedTeacherId === teacher.id && <Check color={colors.green} size={20} />}
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={styles.sectionBlock}>
                <Text style={styles.panelEyebrow}>3 · PREVIEW OR UNLOCK</Text>
                <View style={[styles.courseGrid, compact && styles.courseGridCompact]}>
                  {studentCourses.map((courseItem) => {
                    const enrolled = enrolledCourseIds.includes(courseItem.id);
                    return (
                      <View key={courseItem.id} style={styles.courseCard}>
                        <View style={styles.courseCardTop}><View style={styles.courseCategoryIcon}><CourseCategoryIcon category={courseItem.category} /></View><Pill label={enrolled ? 'Enrolled' : `Bronze · ${formatIQD(pricingPlanById('bronze').retailPriceIQD)}`} tone={enrolled ? 'success' : 'warning'} /></View>
                        <Text style={styles.courseCardTitle}>{courseItem.title}</Text><Text style={styles.courseCardInstructor}>{courseItem.instructor}</Text><Text style={styles.courseCardDescription}>{courseItem.description}</Text>
                        <View style={styles.actionRow}><Button label="Free preview" tone="secondary" onPress={() => previewCourse(courseItem)} /><Button label={enrolled ? 'Open course' : 'Unlock course'} onPress={() => enrolled ? openCourse(courseItem) : openCheckout(courseItem.id)} /></View>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {page === 'Plans' && currentUser.role === 'student' && (
            <View style={styles.pageStack}>
              <View style={styles.pageHeader}>
                <View>
                  <Text style={styles.overline}>ACADEMIC-YEAR ACCESS</Text>
                  <Text style={styles.pageTitle}>Choose your plan</Text>
                  <Text style={styles.pageSubtitle}>{ACADEMIC_YEAR_ACCESS_MODEL}</Text>
                </View>
                <Pill label="One-time purchase" tone="success" />
              </View>
              <View style={[styles.planGrid, compact && styles.planGridCompact]}>
                {pricingPlans.map((plan) => (
                  <View key={plan.id} style={[styles.planCard, plan.id === 'platinum' && styles.planCardVip]}>
                    <View style={styles.courseCardTop}>
                      <Text style={[styles.planName, plan.id === 'platinum' && styles.planTextVip]}>{plan.tierName}</Text>
                      <Pill label="Full year" tone={plan.id === 'platinum' ? 'warning' : 'success'} />
                    </View>
                    <Text style={[styles.planPrice, plan.id === 'platinum' && styles.planTextVip]}>{formatIQD(plan.retailPriceIQD)}</Text>
                    <Text style={[styles.planUnlocks, plan.id === 'platinum' && styles.planTextVipMuted]}>{plan.unlocks}</Text>
                    <View style={styles.planPaths}>
                      {plan.allowedPaths.length > 0 ? plan.allowedPaths.map((path) => (
                        <View key={pathLabel(path)} style={[styles.planPathChip, plan.id === 'platinum' && styles.planPathChipVip]}>
                          <Text style={[styles.planPathText, plan.id === 'platinum' && styles.planTextVip]}>{pathLabel(path)}</Text>
                        </View>
                      )) : (
                        <View style={styles.planPathChip}><Text style={styles.planPathText}>Choose any one subject</Text></View>
                      )}
                    </View>
                    <Button
                      label={`Choose ${plan.shortName}`}
                      tone={plan.id === 'platinum' ? 'warning' : 'primary'}
                      onPress={() => openCheckout(selectedCourseId, plan.id)}
                    />
                  </View>
                ))}
              </View>
              <View style={styles.planRuleBanner}>
                <LockKeyhole color={colors.blue} size={18} />
                <Text style={styles.noticeText}>Bundle subjects are fixed. Custom multi-teacher mixes are disabled, and access remains valid through the August/September resits.</Text>
              </View>
            </View>
          )}

          {page === 'Checkout' && currentUser.role === 'student' && (
            <View style={styles.pageStack}>
              <View style={styles.breadcrumbRow}><Pressable onPress={() => setPage('Plans')}><Text style={styles.breadcrumbLink}>Plans</Text></Pressable><ChevronRight color={colors.subtle} size={14} /><Text style={styles.breadcrumbCurrent}>Activate academic-year access</Text></View>
              <View style={styles.pageHeader}><View><Text style={styles.overline}>SECURE ACADEMIC-YEAR ACCESS</Text><Text style={styles.pageTitle}>Choose and activate your plan</Text><Text style={styles.pageSubtitle}>One payment covers access through the August/September ministerial resits.</Text></View><Pill label={formatIQD(selectedPricingPlan.retailPriceIQD)} tone="warning" /></View>
              <View style={styles.planChoiceGrid}>
                {pricingPlans.map((plan) => {
                  const selected = selectedPricingPlanId === plan.id;
                  return (
                    <Pressable
                      accessibilityState={{ selected }}
                      key={plan.id}
                      onPress={() => { setSelectedPricingPlanId(plan.id); setSelectedPricingPathIndex(0); }}
                      style={[styles.planChoice, selected && styles.planChoiceSelected]}
                    >
                      <Text style={[styles.planChoiceName, selected && styles.planChoiceNameSelected]}>{plan.shortName}</Text>
                      <Text style={[styles.planChoicePrice, selected && styles.planChoiceNameSelected]}>{formatIQD(plan.retailPriceIQD)}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {selectedPricingPlan.allowedPaths.length > 1 && (
                <View style={styles.sectionBlock}>
                  <Text style={styles.fieldLabel}>Choose exactly one Silver path</Text>
                  <View style={styles.pathChoiceGrid}>
                    {selectedPricingPlan.allowedPaths.map((path, index) => {
                      const selected = selectedPricingPathIndex === index;
                      return (
                        <Pressable
                          accessibilityState={{ selected }}
                          key={pathLabel(path)}
                          onPress={() => setSelectedPricingPathIndex(index)}
                          style={[styles.pathChoice, selected && styles.pathChoiceSelected]}
                        >
                          <Check color={selected ? colors.white : colors.green} size={17} />
                          <Text style={[styles.pathChoiceText, selected && styles.pathChoiceTextSelected]}>{pathLabel(path)}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
              <View style={[styles.checkoutLayout, compact && styles.courseLayoutCompact]}>
                <View style={styles.sectionBlock}>
                  <Text style={styles.fieldLabel}>Unlock method</Text>
                  <View style={styles.segmented}>{(['Coupon', 'Manual payment', 'Online payment'] as const).map((method) => <Pressable key={method} onPress={() => setUnlockMethod(method)} style={[styles.segment, unlockMethod === method && styles.segmentActive]}><Text style={[styles.segmentText, unlockMethod === method && styles.segmentTextActive]}>{method}</Text></Pressable>)}</View>
                  {unlockMethod === 'Coupon' && <><Text style={styles.fieldLabel}>Access code</Text><TextInput autoCapitalize="characters" onChangeText={setCouponCode} style={styles.textInput} value={couponCode} /><Text style={styles.helperText}>Use WELCOME12 for the successful demo path.</Text></>}
                  {unlockMethod === 'Manual payment' && <View style={styles.uploadBox}><Upload color={colors.blue} size={24} /><Text style={styles.registrationTitle}>Payment proof ready</Text><Text style={styles.registrationMeta}>fastpay-receipt.jpg · Stored in private payment-proofs bucket</Text></View>}
                  {unlockMethod === 'Online payment' && <View style={styles.uploadBox}><CreditCard color={colors.blue} size={24} /><Text style={styles.registrationTitle}>ZainCash / FastPay gateway</Text><Text style={styles.registrationMeta}>The demo returns a successful verified transaction.</Text></View>}
                  <Button label={unlockMethod === 'Manual payment' ? 'Upload and submit' : unlockMethod === 'Coupon' ? 'Apply code and unlock' : 'Pay securely'} icon={<KeyRound color={colors.white} size={16} />} onPress={completeUnlock} />
                </View>
                <View style={styles.sessionPanel}><Text style={styles.panelEyebrow}>ORDER SUMMARY</Text><Text style={styles.panelTitle}>{selectedPricingPlan.tierName}</Text><Text style={styles.pageSubtitle}>{selectedPricingPlan.unlocks}</Text><View style={styles.detailList}><Detail label="Subjects" value={pathLabel(selectedPlanSubjects)} /><Detail label="Price" value={formatIQD(selectedPricingPlan.retailPriceIQD)} /><Detail label="Access" value="Through Aug/Sep resits" /><Detail label="Enrollment" value="Immediate after approval" /></View></View>
              </View>
            </View>
          )}

          {page === 'Courses' && currentUser.role === 'student' && (
            <View style={styles.pageStack}>
              <View style={styles.pageHeader}>
                <View>
                  <Text style={styles.overline}>STUDENT WORKSPACE</Text>
                  <Text style={styles.pageTitle}>My courses</Text>
                  <Text style={styles.pageSubtitle}>Continue an enrolled course or open its chapters and lessons.</Text>
                </View>
                <Pill label={`${enrolledCourseIds.length} enrolled courses`} tone="success" />
              </View>

              <View style={[styles.metricGrid, compact && styles.metricGridCompact]}>
                <Metric icon={<GraduationCap color={colors.green} size={20} />} label="Enrolled" value={`${enrolledCourseIds.length} courses`} note="Current term" />
                <Metric icon={<Check color={colors.blue} size={20} />} label="Lessons complete" value={String(completedLessonIds.length)} note="Across all courses" />
                <Metric icon={<Clock3 color={colors.amber} size={20} />} label="Learning time" value="12h 35m" note="This month" />
                <Metric icon={<ShieldCheck color={colors.green} size={20} />} label="Secure sessions" value={String(state.playback_sessions.length)} note="Playback audit history" />
              </View>

              <View style={[styles.courseGrid, compact && styles.courseGridCompact]}>
                {studentCourses.filter((courseItem) => enrolledCourseIds.includes(courseItem.id)).map((courseItem) => {
                  const progress = courseProgress(courseItem, completedLessonIds);
                  const lessons = courseLessons(courseItem);
                  const completedCount = lessons.filter((lesson) => completedLessonIds.includes(lesson.id)).length;
                  return (
                    <View key={courseItem.id} style={styles.courseCard}>
                      <View style={styles.courseCardTop}>
                        <View style={styles.courseCategoryIcon}><CourseCategoryIcon category={courseItem.category} /></View>
                        <Pill label={courseItem.category} tone="neutral" />
                      </View>
                      <Text style={styles.courseCardTitle}>{courseItem.title}</Text>
                      <Text style={styles.courseCardInstructor}>{courseItem.instructor}</Text>
                      <Text style={styles.courseCardDescription}>{courseItem.description}</Text>
                      <View style={styles.courseStats}>
                        <Text style={styles.courseStat}>{courseItem.chapters.length} chapters</Text>
                        <Text style={styles.courseStat}>{lessons.length} lessons</Text>
                        <Text style={styles.courseStat}>{courseItem.duration}</Text>
                      </View>
                      <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>{completedCount} of {lessons.length} lessons</Text>
                        <Text style={styles.progressValue}>{progress}%</Text>
                      </View>
                      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
                      <Button
                        label={progress > 0 ? 'Continue course' : 'View course'}
                        icon={<ChevronRight color={colors.white} size={16} />}
                        onPress={() => openCourse(courseItem)}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {page === 'Course' && currentUser.role === 'student' && selectedCourse && (
            <View style={styles.pageStack}>
              <View style={styles.breadcrumbRow}>
                <Pressable onPress={() => setPage('Courses')}><Text style={styles.breadcrumbLink}>My courses</Text></Pressable>
                <ChevronRight color={colors.subtle} size={14} />
                <Text style={styles.breadcrumbCurrent}>{selectedCourse.title}</Text>
              </View>
              <View style={[styles.courseSummary, compact && styles.courseSummaryCompact]}>
                <View style={styles.courseSummaryIcon}><CourseCategoryIcon category={selectedCourse.category} size={30} /></View>
                <View style={styles.courseSummaryCopy}>
                  <View style={styles.courseSummaryMeta}><Pill label={selectedCourse.category} tone="neutral" /><Text style={styles.courseSummaryLevel}>{selectedCourse.level} · {selectedCourse.duration}</Text></View>
                  <Text style={styles.pageTitle}>{selectedCourse.title}</Text>
                  <Text style={styles.pageSubtitle}>{selectedCourse.description}</Text>
                  <Text style={styles.courseInstructor}>Instructor: {selectedCourse.instructor}</Text>
                </View>
                <View style={styles.courseProgressBlock}>
                  <Text style={styles.courseProgressNumber}>{courseProgress(selectedCourse, completedLessonIds)}%</Text>
                  <Text style={styles.courseProgressCaption}>course complete</Text>
                </View>
              </View>

              <View style={styles.curriculumHeader}>
                <View><Text style={styles.panelEyebrow}>COURSE CONTENT</Text><Text style={styles.curriculumTitle}>Chapters and lessons</Text></View>
                <Text style={styles.curriculumMeta}>{selectedCourse.chapters.length} chapters · {courseLessons(selectedCourse).length} lessons</Text>
              </View>

              <View style={styles.chapterList}>
                {selectedCourse.chapters.map((chapter, chapterIndex) => {
                  const expanded = expandedChapterIds.includes(chapter.id);
                  const completedInChapter = chapter.lessons.filter((lesson) => completedLessonIds.includes(lesson.id)).length;
                  return (
                    <View key={chapter.id} style={styles.chapterSection}>
                      <Pressable
                        style={styles.chapterHeader}
                        onPress={() => setExpandedChapterIds((current) =>
                          current.includes(chapter.id)
                            ? current.filter((id) => id !== chapter.id)
                            : [...current, chapter.id],
                        )}
                      >
                        <View style={styles.chapterNumber}><Text style={styles.chapterNumberText}>{chapterIndex + 1}</Text></View>
                        <View style={styles.chapterCopy}>
                          <Text style={styles.chapterTitle}>{chapter.title}</Text>
                          <Text style={styles.chapterSummary}>{chapter.summary}</Text>
                        </View>
                        <Text style={styles.chapterProgress}>{completedInChapter}/{chapter.lessons.length}</Text>
                        {expanded ? <ChevronUp color={colors.muted} size={19} /> : <ChevronDown color={colors.muted} size={19} />}
                      </Pressable>
                      {expanded && (
                        <View style={styles.lessonList}>
                          {chapter.lessons.map((lesson, lessonIndex) => {
                            const completed = completedLessonIds.includes(lesson.id);
                            return (
                              <Pressable
                                key={lesson.id}
                                disabled={!lesson.available}
                                style={({ pressed }) => [styles.lessonRow, pressed && lesson.available && styles.lessonRowPressed, !lesson.available && styles.lessonRowLocked]}
                                onPress={() => openLesson(selectedCourse, lesson, chapter.id)}
                              >
                                <View style={[styles.lessonStatus, completed && styles.lessonStatusComplete]}>
                                  {completed ? <Check color={colors.white} size={14} /> : lesson.available ? <Text style={styles.lessonIndex}>{lessonIndex + 1}</Text> : <Lock color={colors.subtle} size={14} />}
                                </View>
                                <View style={styles.lessonCopy}>
                                  <Text style={[styles.lessonName, !lesson.available && styles.lessonNameLocked]}>{lesson.title}</Text>
                                  <Text style={styles.lessonMeta}>{lesson.type} · {lesson.duration}</Text>
                                </View>
                                <View style={styles.lessonAction}>
                                  {lesson.available ? <PlayCircle color={colors.green} size={21} /> : <Pill label="Locked" tone="neutral" />}
                                </View>
                              </Pressable>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {page === 'Lesson' && currentUser.role === 'student' && selectedCourse && selectedLesson && (
            <View style={styles.pageStack}>
              <View style={styles.breadcrumbRow}>
                <Pressable onPress={() => setPage('Courses')}><Text style={styles.breadcrumbLink}>My courses</Text></Pressable>
                <ChevronRight color={colors.subtle} size={14} />
                <Pressable onPress={() => setPage('Course')}><Text style={styles.breadcrumbLink}>{selectedCourse.title}</Text></Pressable>
                <ChevronRight color={colors.subtle} size={14} />
                <Text style={styles.breadcrumbCurrent}>{selectedLesson.title}</Text>
              </View>
              <View style={styles.pageHeader}>
                <View>
                  <Text style={styles.overline}>{selectedChapter?.title ?? 'COURSE LESSON'}</Text>
                  <Text style={styles.pageTitle}>{selectedLesson.title}</Text>
                  <Text style={styles.pageSubtitle}>{selectedCourse.title} · {selectedLesson.type} · {selectedLesson.duration}</Text>
                </View>
                <Button
                  label={completedLessonIds.includes(selectedLesson.id) ? 'Completed' : 'Mark complete'}
                  tone="secondary"
                  icon={<Check color={colors.greenDark} size={16} />}
                  onPress={markLessonComplete}
                  disabled={completedLessonIds.includes(selectedLesson.id)}
                />
              </View>

              <View style={[styles.courseLayout, compact && styles.courseLayoutCompact]}>
                <View style={styles.playerPanel}>
                  <View style={styles.videoFrame}>
                    <VideoView
                      player={player}
                      style={styles.video}
                      nativeControls={ownsActiveLock}
                      contentFit="contain"
                      allowsFullscreen={false}
                    />
                    {!ownsActiveLock && (
                      <View style={styles.videoGate}>
                        <View style={styles.videoGateIcon}><LockKeyhole color={colors.white} size={28} /></View>
                        <Text style={styles.videoGateTitle}>Ready to learn?</Text>
                        <Text style={styles.videoGateText}>Start this lesson to begin protected playback.</Text>
                        <Button label="Start lesson" icon={<Play color={colors.white} fill={colors.white} size={16} />} onPress={start} />
                      </View>
                    )}
                    {ownsActiveLock && clientSession && (
                      <DynamicWatermark watermark={clientSession.watermark} />
                    )}
                  </View>
                  <View style={styles.playerControls}>
                    <Pressable accessibilityLabel={isPlaying ? 'Pause video' : 'Play video'} style={styles.roundControl} onPress={togglePlayback}>
                      {isPlaying ? <Pause color={colors.white} fill={colors.white} size={18} /> : <Play color={colors.white} fill={colors.white} size={18} />}
                    </Pressable>
                    <View style={styles.playerControlCopy}>
                      <Text style={styles.playerState}>{ownsActiveLock ? (isPlaying ? 'Lesson playing' : 'Paused') : 'Ready to start'}</Text>
                      <Text style={styles.playerMeta}>{ownsActiveLock ? 'Protected playback' : selectedLesson.duration}</Text>
                    </View>
                    {ownsActiveLock && <Button label="End playback" tone="danger" icon={<Square color={colors.white} fill={colors.white} size={13} />} onPress={stopSession} />}
                  </View>
                </View>

                <View style={styles.nextLessonPanel}>
                  <View style={styles.nextLessonHero}><BookOpen color={colors.green} size={26} /></View>
                  <Text style={styles.panelEyebrow}>CONTINUE LEARNING</Text>
                  <Text style={styles.panelTitle}>{nextAvailableLesson?.title ?? 'Course complete'}</Text>
                  <Text style={styles.pageSubtitle}>{nextAvailableLesson ? 'Your next available lesson is ready when you are.' : 'You have reached the end of this course.'}</Text>
                  <Pressable style={styles.nextLesson} onPress={openNextLesson}>
                    <BookOpen color={colors.blue} size={18} />
                    <View style={styles.nextLessonCopy}><Text style={styles.nextLessonLabel}>UP NEXT</Text><Text style={styles.nextLessonTitle}>{nextAvailableLesson?.duration ?? 'Review your completed lessons'}</Text></View>
                    <ChevronRight color={colors.subtle} size={18} />
                  </Pressable>
                </View>
              </View>
            </View>
          )}

          {page === 'Profile' && (
            <View style={styles.pageStack}>
              <View style={styles.pageHeader}>
                <View><Text style={styles.overline}>MY ACCOUNT</Text><Text style={styles.pageTitle}>Profile</Text><Text style={styles.pageSubtitle}>Your personal details, learning account, and signed-in device.</Text></View>
                <Pill label={`${currentUser.role[0]?.toUpperCase()}${currentUser.role.slice(1)} account`} tone={currentUser.role === 'student' ? 'success' : 'warning'} />
              </View>
              <View style={[styles.profileLayout, compact && styles.courseLayoutCompact]}>
                <View style={styles.profileIdentityCard}>
                  <View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>{userInitials}</Text></View>
                  <Text style={styles.profileName}>{currentUser.name}</Text>
                  <Text style={styles.profileEmail}>{currentUser.email}</Text>
                  <Pill label={currentUser.role} tone={currentUser.role === 'student' ? 'success' : 'warning'} />
                </View>
                <View style={styles.profileDetailsCard}>
                  <Text style={styles.panelEyebrow}>ACCOUNT DETAILS</Text>
                  <View style={styles.detailList}>
                    <Detail label="Full name" value={currentUser.name} />
                    <Detail label="Email" value={currentUser.email} />
                    <Detail label="Account ID" value={currentUser.id} />
                    <Detail label="Role" value={`${currentUser.role[0]?.toUpperCase()}${currentUser.role.slice(1)}`} />
                    <Detail label="Language" value="Kurdish / Arabic / English" />
                  </View>
                </View>
              </View>
              <View style={[styles.profileLayout, compact && styles.courseLayoutCompact]}>
                <View style={styles.profileDetailsCard}>
                  <View style={styles.profileSectionTitle}><Laptop color={colors.blue} size={20} /><View><Text style={styles.panelTitle}>Signed-in device</Text><Text style={styles.pageSubtitle}>The device currently using this account.</Text></View></View>
                  <View style={styles.detailList}>
                    <Detail label="Device" value={currentDevice.device_name} />
                    <Detail label="Platform" value={currentDevice.platform} />
                    <Detail label="Status" value={currentDevice.is_blocked ? 'Blocked' : 'Trusted'} />
                  </View>
                </View>
                <View style={styles.profileDetailsCard}>
                  <View style={styles.profileSectionTitle}><GraduationCap color={colors.green} size={20} /><View><Text style={styles.panelTitle}>Account overview</Text><Text style={styles.pageSubtitle}>Information related to your role.</Text></View></View>
                  <View style={styles.detailList}>
                    {currentUser.role === 'student' && <Detail label="Enrolled courses" value={String(enrolledCourseIds.length)} />}
                    {currentUser.role === 'student' && <Detail label="Completed lessons" value={String(completedLessonIds.length)} />}
                    {currentUser.role === 'teacher' && <Detail label="Teaching" value="Grade 12 Physics" />}
                    {currentUser.role === 'teacher' && <Detail label="Students" value="842" />}
                    {currentUser.role === 'admin' && <Detail label="Access" value="Platform administration" />}
                    <Detail label="Notifications" value="Enabled" />
                  </View>
                </View>
              </View>
              {currentUser.role === 'student' && (
                <View style={styles.profileSupportCard}>
                  <View style={styles.profileSupportHeader}>
                    <View style={styles.profileSectionTitle}>
                      <TicketCheck color={colors.green} size={22} />
                      <View><Text style={styles.panelTitle}>Support</Text><Text style={styles.pageSubtitle}>Get help with your account, payments, courses, or playback.</Text></View>
                    </View>
                    <Pill label={`${ticketCount} submitted`} tone="neutral" />
                  </View>
                  <Text style={styles.fieldLabel}>How can we help?</Text>
                  <TextInput multiline numberOfLines={4} onChangeText={setSupportMessage} placeholder="Describe the issue" placeholderTextColor={colors.subtle} style={[styles.textInput, styles.textArea]} value={supportMessage} />
                  <View style={styles.profileSupportFooter}>
                    <Text style={styles.helperText}>Typical response within 24 hours.</Text>
                    <Button label="Submit support ticket" icon={<Send color={colors.white} size={16} />} onPress={submitSupportTicket} />
                  </View>
                </View>
              )}
              <View style={styles.profileActions}>
                <Button label="Switch user" tone="secondary" icon={<LogOut color={colors.greenDark} size={17} />} onPress={switchUser} />
              </View>
            </View>
          )}

          {page === 'Notifications' && currentUser.role === 'student' && (
            <View style={styles.pageStack}>
              <View style={styles.pageHeader}><View><Text style={styles.overline}>STUDENT INBOX</Text><Text style={styles.pageTitle}>Notifications</Text><Text style={styles.pageSubtitle}>Course access, new lessons, reminders, and security updates.</Text></View><Button label="Mark all read" tone="secondary" onPress={() => { setNotifications((current) => current.map((item) => ({ ...item, read: true }))); setNotice('All notifications marked as read.'); }} /></View>
              <View style={styles.listPanel}>
                {notifications.map((item) => <Pressable key={item.id} onPress={() => setNotifications((current) => current.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry))} style={styles.notificationRow}><View style={[styles.notificationIcon, !item.read && styles.notificationIconUnread]}><Bell color={item.read ? colors.muted : colors.green} size={18} /></View><View style={styles.notificationCopy}><View style={styles.userNameLine}><Text style={styles.studentDeviceName}>{item.title}</Text>{!item.read && <Pill label="New" tone="success" />}</View><Text style={styles.courseCardDescription}>{item.body}</Text><Text style={styles.studentDeviceMeta}>{item.time}</Text></View></Pressable>)}
              </View>
            </View>
          )}

          {page === 'Teacher' && currentUser.role === 'teacher' && (
            <View style={styles.pageStack}>
              <View style={styles.pageHeader}><View><Text style={styles.overline}>TEACHER PORTAL</Text><Text style={styles.pageTitle}>Ahmed’s course analytics</Text><Text style={styles.pageSubtitle}>Only owned courses and their enrolled students are visible under teacher RLS.</Text></View><Pill label="Physics teacher" tone="warning" /></View>
              <View style={[styles.metricGrid, compact && styles.metricGridCompact]}><Metric icon={<Users color={colors.green} size={20} />} label="Enrolled students" value="842" note="Across 2 courses" /><Metric icon={<BarChart3 color={colors.blue} size={20} />} label="Completion rate" value="74%" note="Up 6% this term" /><Metric icon={<PlayCircle color={colors.amber} size={20} />} label="Lesson plays" value="4,218" note="Past 30 days" /><Metric icon={<GraduationCap color={colors.green} size={20} />} label="Completions" value="311" note="Current academic year" /></View>
              <View style={[styles.courseGrid, compact && styles.courseGridCompact]}><View style={styles.courseCard}><Pill label="Published" tone="success" /><Text style={styles.courseCardTitle}>Grade 12 Physics</Text><Text style={styles.courseCardDescription}>24 lessons · 3 chapters · 615 active students</Text><View style={styles.progressTrack}><View style={[styles.progressFill, { width: '74%' }]} /></View></View><View style={styles.courseCard}><Pill label="Published" tone="success" /><Text style={styles.courseCardTitle}>Physics Exam Revision</Text><Text style={styles.courseCardDescription}>12 lessons · 2 chapters · 227 active students</Text><View style={styles.progressTrack}><View style={[styles.progressFill, { width: '68%' }]} /></View></View></View>
              <View><Text style={styles.panelEyebrow}>ENROLLED STUDENTS</Text><ScrollView horizontal><View style={styles.table}><TableRow header cells={['Student', 'Course', 'Progress', 'Last active']} />{teacherStudents.map((student) => <TableRow key={student.name} cells={[student.name, student.course, student.progress, student.lastActive]} />)}</View></ScrollView></View>
            </View>
          )}

          {page === 'Status' && currentUser.role === 'admin' && (
            <View style={styles.pageStack}>
              <View style={styles.pageHeader}>
                <View><Text style={styles.overline}>ACTIVE PLAYBACK STATUS</Text><Text style={styles.pageTitle}>Lock service inspector</Text><Text style={styles.pageSubtitle}>Current Redis-style state for {currentUser.id}.</Text></View>
                <View style={styles.actionRow}>
                  <Button label="Advance 91 seconds" tone="warning" icon={<TimerOff color={colors.white} size={16} />} onPress={expireNow} disabled={!activeLock} />
                  {staleSession && <Button label="Test old heartbeat" tone="secondary" onPress={() => sendHeartbeat(staleSession)} />}
                </View>
              </View>
              <View style={[styles.metricGrid, compact && styles.metricGridCompact]}>
                <Metric icon={<LockKeyhole color={colors.green} size={20} />} label="Active lock" value={activeLock ? '1' : '0'} note="One maximum per user" />
                <Metric icon={<Clock3 color={colors.blue} size={20} />} label="TTL remaining" value={`${lockTtl}s`} note="Refresh target: 90s" />
                <Metric icon={<Gauge color={colors.amber} size={20} />} label="Lock version" value={String(activeLock?.lock_version ?? 0)} note="Fencing token" />
                <Metric icon={<ListChecks color={colors.blue} size={20} />} label="Risk events" value={String(state.playback_risk_events.length)} note="Permanent audit rows" />
              </View>
              <View style={[styles.statusGrid, compact && styles.courseLayoutCompact]}>
                <View style={styles.debugPanel}>
                  <View style={styles.panelTitleRow}><View><Text style={styles.panelEyebrow}>REDIS KEY</Text><Text style={styles.panelTitle}>{redisLockKey(currentUser.id)}</Text></View><Pill label={activeLock ? 'EX 90' : 'missing'} tone={activeLock ? 'success' : 'neutral'} /></View>
                  <ScrollView horizontal style={styles.codeScroll}>
                    <Text style={styles.codeText}>{activeLock ? JSON.stringify({ ...activeLock, ttl_seconds: lockTtl }, null, 2) : '{\n  "status": "idle"\n}'}</Text>
                  </ScrollView>
                </View>
                <View style={styles.keyPanel}>
                  <Text style={styles.panelEyebrow}>RELATED KEYS</Text>
                  <KeyRow icon={<LockKeyhole color={colors.green} size={17} />} label={redisLockKey(currentUser.id)} value={activeLock ? `${lockTtl}s` : 'none'} />
                  <KeyRow icon={<Clock3 color={colors.amber} size={17} />} label={redisCooldownKey(currentUser.id)} value={cooldownTtl > 0 ? `${cooldownTtl}s` : 'none'} />
                  <KeyRow icon={<ShieldAlert color={colors.red} size={17} />} label={redisConflictKey(currentUser.id)} value={String(Object.values(state.conflict_counts).reduce<number>((sum, value) => sum + (value ?? 0), 0))} />
                  <View style={styles.failureControl}>
                    <View style={styles.failureCopy}><Text style={styles.failureTitle}>Redis availability</Text><Text style={styles.failureText}>Starting playback fails closed while unavailable.</Text></View>
                    <Button
                      label={state.redis_available ? 'Take offline' : 'Restore Redis'}
                      tone={state.redis_available ? 'danger' : 'primary'}
                      icon={state.redis_available ? <WifiOff color={colors.white} size={16} /> : <Wifi color={colors.white} size={16} />}
                      onPress={() => setState((current) => setRedisAvailable(current, !current.redis_available))}
                    />
                  </View>
                </View>
              </View>
            </View>
          )}

          {page === 'Admin' && currentUser.role === 'admin' && (
            <View style={styles.pageStack}>
              <View style={styles.pageHeader}>
                <View><Text style={styles.overline}>ADMIN OPERATIONS</Text><Text style={styles.pageTitle}>Platform control center</Text><Text style={styles.pageSubtitle}>Manage content, payments, access, devices, notifications, logs, and reports.</Text></View>
                <View style={styles.actionRow}>
                  <Button label="Export report" tone="secondary" icon={<Download color={colors.greenDark} size={16} />} onPress={() => setNotice('CSV report generated by the demo report function.')} />
                  <Button label="Reset all demo data" tone="danger" onPress={resetDemo} />
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={styles.segmented}>{(['Overview', 'Content', 'Plans', 'Payments', 'Coupons', 'Sessions', 'Risk events', 'Devices', 'Notifications', 'Audit logs'] as AdminView[]).map((item) => <Pressable key={item} style={[styles.segment, adminView === item && styles.segmentActive]} onPress={() => setAdminView(item)}><Text style={[styles.segmentText, adminView === item && styles.segmentTextActive]}>{item}</Text></Pressable>)}</View></ScrollView>

              {adminView === 'Overview' && <><View style={[styles.metricGrid, compact && styles.metricGridCompact]}><Metric icon={<Users color={colors.green} size={20} />} label="Students" value="2,416" note="128 active today" /><Metric icon={<CreditCard color={colors.blue} size={20} />} label="Pending payments" value={String(payments.filter((item) => item.status === 'Pending').length)} note="Needs review" /><Metric icon={<PlayCircle color={colors.amber} size={20} />} label="Active streams" value={String(Object.keys(state.locks).length)} note="Protected sessions" /><Metric icon={<ShieldAlert color={colors.red} size={20} />} label="Risk events" value={String(state.playback_risk_events.length)} note="Review suspicious activity" /></View><View style={[styles.courseGrid, compact && styles.courseGridCompact]}><Pressable style={styles.quickAction} onPress={() => setAdminView('Content')}><Plus color={colors.green} size={22} /><Text style={styles.studentDeviceName}>Publish content</Text><Text style={styles.courseCardDescription}>Manage subjects, teachers, courses, chapters, lessons, and secure video IDs.</Text></Pressable><Pressable style={styles.quickAction} onPress={() => setAdminView('Payments')}><CreditCard color={colors.blue} size={22} /><Text style={styles.studentDeviceName}>Review payments</Text><Text style={styles.courseCardDescription}>Approve manual proofs, refund transactions, and activate enrollment.</Text></Pressable><Pressable style={styles.quickAction} onPress={() => setAdminView('Notifications')}><Bell color={colors.amber} size={22} /><Text style={styles.studentDeviceName}>Send broadcast</Text><Text style={styles.courseCardDescription}>Queue push and email announcements for students.</Text></Pressable></View></>}

              {adminView === 'Content' && <View style={styles.pageStack}><View style={styles.actionRow}><Button label="Add subject" tone="secondary" icon={<Plus color={colors.greenDark} size={16} />} onPress={() => setNotice('New subject draft created.')} /><Button label="Add course" icon={<Plus color={colors.white} size={16} />} onPress={() => setNotice('New course draft created. Add chapters and lessons before publishing.')} /></View><ScrollView horizontal><View style={styles.table}><TableRow header cells={['Subject', 'Teacher', 'Course', 'Lessons', 'Status']} />{contentRows.map((row) => <TableRow key={row.course} cells={[row.subject, row.teacher, row.course, row.lessons, row.status]} />)}</View></ScrollView><View style={styles.adminFooter}><Upload color={colors.blue} size={18} /><Text style={styles.adminFooterText}>Lesson publishing accepts a DRM provider video ID plus PDFs and thumbnails from private Storage buckets.</Text></View></View>}

              {adminView === 'Plans' && <View style={styles.pageStack}>
                <View style={styles.pageHeader}>
                  <View><Text style={styles.panelTitle}>Academic-year pricing and payouts</Text><Text style={styles.pageSubtitle}>Retail totals and payout allocations use the same shared rules as student checkout.</Text></View>
                  <Pill label="Fixed bundles" tone="success" />
                </View>
                <View style={[styles.planGrid, compact && styles.planGridCompact]}>
                  {pricingPlans.map((plan) => (
                    <View key={plan.id} style={styles.adminPlanCard}>
                      <View style={styles.courseCardTop}><Text style={styles.planName}>{plan.tierName}</Text><Text style={styles.planChoicePrice}>{formatIQD(plan.retailPriceIQD)}</Text></View>
                      <Text style={styles.planUnlocks}>{plan.unlocks}</Text>
                      <View style={styles.detailList}>
                        {Object.entries(plan.payoutStructure).map(([key, amount]) => <Detail key={key} label={payoutLabel(key)} value={formatIQD(amount)} />)}
                      </View>
                    </View>
                  ))}
                </View>
                <View style={styles.planRuleBanner}><ShieldCheck color={colors.green} size={18} /><Text style={styles.noticeText}>Custom multi-teacher mix: {pricingSystemConstraints.allowCustomMultiTeacherMix ? 'Allowed' : 'Disabled'} · Minimum bundle teacher payout: {formatIQD(pricingSystemConstraints.minimumBundleTeacherPayoutIQD)}</Text></View>
              </View>}

              {adminView === 'Payments' && <View style={styles.listPanel}>{payments.map((payment) => <View key={payment.id} style={styles.paymentRow}><View style={styles.paymentIcon}><CreditCard color={colors.blue} size={20} /></View><View style={styles.notificationCopy}><View style={styles.userNameLine}><Text style={styles.studentDeviceName}>{payment.student}</Text><Pill label={payment.status} tone={payment.status === 'Pending' ? 'warning' : payment.status === 'Approved' ? 'success' : 'neutral'} /></View><Text style={styles.courseCardDescription}>{payment.course} · {payment.amount} · {payment.method}</Text><Text style={styles.studentDeviceMeta}>{payment.id}</Text></View><View style={styles.actionRow}>{payment.status === 'Pending' && <Button label="Approve" onPress={() => updatePayment(payment.id, 'Approved')} />}<Button label="Refund" tone="secondary" onPress={() => updatePayment(payment.id, 'Refunded')} /></View></View>)}</View>}

              {adminView === 'Coupons' && <View style={styles.pageStack}><View style={styles.pageHeader}><Text style={styles.pageSubtitle}>Access codes can be course-specific, usage-limited, and time-limited.</Text><Button label="Create demo code" icon={<Plus color={colors.white} size={16} />} onPress={() => { setCoupons((current) => [{ code: `EXAM${current.length + 1}0`, course: 'Physics Exam Revision', uses: '0 / 25', expires: '31 Dec 2026', status: 'Active' }, ...current]); setNotice('New access code created.'); }} /></View><ScrollView horizontal><View style={styles.table}><TableRow header cells={['Code', 'Course', 'Uses', 'Expires', 'Status']} />{coupons.map((coupon) => <TableRow key={coupon.code} cells={[coupon.code, coupon.course, coupon.uses, coupon.expires, coupon.status]} />)}</View></ScrollView></View>}

              {(adminView === 'Sessions' || adminView === 'Risk events' || adminView === 'Audit logs') && <ScrollView horizontal showsHorizontalScrollIndicator><View style={styles.table}>
                  {adminView === 'Sessions' && (
                    <>
                      <TableRow header cells={['session_id', 'device_id', 'started_at', 'last_heartbeat_at', 'ended_at', 'end_reason']} />
                      {state.playback_sessions.length === 0 ? <EmptyTable label="No playback sessions yet." /> : state.playback_sessions.map((row) => (
                        <TableRow key={row.id} cells={[row.session_id, row.device_id, formatTime(row.started_at), formatTime(row.last_heartbeat_at), row.ended_at ? formatTime(row.ended_at) : 'active', row.end_reason ?? '—']} />
                      ))}
                    </>
                  )}
                  {adminView === 'Risk events' && (
                    <>
                      <TableRow header cells={['event_type', 'device_id', 'session_id', 'message', 'created_at']} />
                      {state.playback_risk_events.length === 0 ? <EmptyTable label="No risk events yet." /> : state.playback_risk_events.map((row) => (
                        <TableRow key={row.id} cells={[row.event_type, row.device_id ?? '—', row.session_id ?? '—', row.event_message, formatTime(row.created_at)]} />
                      ))}
                    </>
                  )}
                  {adminView === 'Audit logs' && <><TableRow header cells={['Action', 'Actor', 'Resource', 'Result', 'Time']} />{auditRows.map((row) => <TableRow key={`${row.action}-${row.resource}`} cells={[row.action, row.actor, row.resource, row.result, row.time]} />)}</>}
                </View></ScrollView>}

              {adminView === 'Devices' && <View style={styles.listPanel}>{state.devices.length === 0 ? <EmptyTable label="Devices appear after a user signs in." /> : state.devices.map((device) => <View key={device.id} style={styles.paymentRow}><View style={styles.deviceIconSmall}>{device.platform === 'web' ? <Laptop color={colors.greenDark} size={18} /> : <Smartphone color={colors.greenDark} size={18} />}</View><View style={styles.notificationCopy}><View style={styles.userNameLine}><Text style={styles.studentDeviceName}>{device.device_name}</Text><Pill label={device.is_blocked ? 'Blocked' : 'Allowed'} tone={device.is_blocked ? 'danger' : 'success'} /></View><Text style={styles.studentDeviceMeta}>{device.user_id} · {device.device_id} · {device.platform}</Text></View><Button label={device.is_blocked ? 'Unblock' : 'Block'} tone={device.is_blocked ? 'secondary' : 'danger'} onPress={() => toggleDeviceBlocked(device.device_id)} /></View>)}</View>}

              {adminView === 'Notifications' && <View style={[styles.checkoutLayout, compact && styles.courseLayoutCompact]}><View style={styles.sectionBlock}><Text style={styles.fieldLabel}>Broadcast message</Text><TextInput multiline numberOfLines={4} onChangeText={setBroadcastMessage} style={[styles.textInput, styles.textArea]} value={broadcastMessage} /><Button label="Send push and email" icon={<Send color={colors.white} size={16} />} onPress={() => setNotice('Broadcast queued for 2,416 students through push and email functions.')} /></View><View style={styles.sessionPanel}><Text style={styles.panelEyebrow}>DELIVERY PREVIEW</Text><Bell color={colors.green} size={24} /><Text style={styles.panelTitle}>E-Lern announcement</Text><Text style={styles.pageSubtitle}>{broadcastMessage}</Text><View style={styles.detailList}><Detail label="Audience" value="All active students" /><Detail label="Channels" value="Expo push + email" /></View></View></View>}

              <View style={styles.adminFooter}><Database color={colors.blue} size={18} /><Text style={styles.adminFooterText}>This demo mirrors the architecture’s RLS-protected tables and Edge Function actions without contacting production services.</Text></View>
            </View>
          )}
          </View>
        </ScrollView>
      </View>
      {!desktopWeb && (
        <View style={[styles.bottomNavDock, isIOS && styles.bottomNavDockIOS]}>
          <View style={[styles.bottomNavSurface, Platform.OS === 'android' && styles.bottomNavAndroid, isIOS && styles.bottomNavIOSFallback]}>
            {navigation}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text numberOfLines={1} style={styles.detailValue}>{value}</Text></View>;
}

function CourseCategoryIcon({ category, size = 22 }: { category: StudentCourse['category']; size?: number }) {
  if (category === 'Mathematics') return <BarChart3 color={colors.blue} size={size} />;
  if (category === 'Chemistry') return <Database color={colors.amber} size={size} />;
  return <Zap color={colors.green} size={size} />;
}

function navigationIcon(page: Page, active: boolean) {
  const color = active ? colors.greenDark : colors.muted;
  if (page === 'Discover') return <BookOpen color={color} size={20} />;
  if (page === 'Courses') return <GraduationCap color={color} size={20} />;
  if (page === 'Plans') return <TicketCheck color={color} size={20} />;
  if (page === 'Notifications') return <Bell color={color} size={20} />;
  if (page === 'Teacher') return <BarChart3 color={color} size={20} />;
  if (page === 'Admin') return <ShieldCheck color={color} size={20} />;
  if (page === 'Status') return <Activity color={color} size={20} />;
  return <UserRound color={color} size={20} />;
}

function KeyRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <View style={styles.keyRow}><View style={styles.keyIcon}>{icon}</View><Text numberOfLines={1} style={styles.keyLabel}>{label}</Text><Text style={styles.keyValue}>{value}</Text></View>;
}

function TableRow({ cells, header = false }: { cells: string[]; header?: boolean }) {
  return <View style={[styles.tableRow, header && styles.tableHeader]}>{cells.map((cell, index) => <Text key={`${cell}-${index}`} numberOfLines={2} style={[styles.tableCell, header && styles.tableHeaderText]}>{cell}</Text>)}</View>;
}

function EmptyTable({ label }: { label: string }) {
  return <View style={styles.emptyTable}><Text style={styles.emptyTableText}>{label}</Text></View>;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.canvas, flex: 1 },
  webScreen: { backgroundColor: '#eef2f0' },
  appBody: { flex: 1 },
  webAppBody: { alignItems: 'stretch', flexDirection: 'row' },
  backToLanding: { alignSelf: 'center', marginBottom: 16, paddingHorizontal: 12, paddingVertical: 8 },
  backToLandingText: { color: colors.greenDark, fontSize: 12, fontWeight: '800' },
  loginShell: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: isIOS ? 20 : 24 },
  loginBrand: { alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 18 },
  loginPanel: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: isIOS ? 20 : 8, borderWidth: isIOS ? 0 : 1, maxWidth: 520, padding: isIOS ? 20 : 26, width: '100%', ...(isIOS ? { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 24 } : {}) },
  loginTitle: { color: colors.ink, fontSize: isIOS ? 34 : 28, fontWeight: isIOS ? '700' : '800', letterSpacing: isIOS ? 0.3 : 0, marginTop: 18 },
  loginSubtitle: { color: colors.muted, fontSize: isIOS ? 15 : 14, lineHeight: isIOS ? 22 : 21, marginTop: 7 },
  fieldLabel: { color: colors.ink, fontSize: isIOS ? 13 : 12, fontWeight: isIOS ? '600' : '800', marginBottom: 8, marginTop: 24 },
  userOptions: { gap: 9 },
  userOption: { alignItems: 'center', borderColor: colors.border, borderRadius: isIOS ? 12 : 7, borderWidth: isIOS ? StyleSheet.hairlineWidth : 1, flexDirection: 'row', gap: 11, minHeight: isIOS ? 72 : 68, padding: isIOS ? 12 : 11 },
  userOptionSelected: { backgroundColor: colors.greenSoft, borderColor: '#9cc8b4' },
  userIcon: { alignItems: 'center', backgroundColor: colors.greenSoft, borderRadius: isIOS ? 20 : 6, height: 40, justifyContent: 'center', width: 40 },
  userIconSelected: { backgroundColor: colors.green },
  userOptionCopy: { flex: 1, minWidth: 0 },
  userNameLine: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  userName: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  userMeta: { color: colors.muted, fontSize: 11, marginTop: 3 },
  registrationPreview: { alignItems: 'center', backgroundColor: colors.blueSoft, borderRadius: isIOS ? 12 : 7, flexDirection: 'row', gap: 11, marginBottom: 16, marginTop: 18, padding: 13 },
  registrationCopy: { flex: 1 },
  registrationTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  registrationMeta: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  otpPanel: { backgroundColor: colors.greenSoft, borderRadius: isIOS ? 12 : 7, gap: 10, marginBottom: 16, padding: 13 },
  textInput: { backgroundColor: isIOS ? colors.canvas : colors.white, borderColor: colors.border, borderRadius: isIOS ? 10 : 6, borderWidth: isIOS ? 0 : 1, color: colors.ink, fontSize: isIOS ? 17 : 13, minHeight: isIOS ? 44 : 42, paddingHorizontal: 12, paddingVertical: 9 },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  helperText: { color: colors.muted, fontSize: 10, marginBottom: 14, marginTop: 6 },
  loginFootnote: { color: colors.muted, fontSize: 11, marginTop: 16, textAlign: 'center' },
  topbar: { alignItems: 'center', backgroundColor: isIOS ? 'rgba(249,249,249,0.94)' : colors.white, borderBottomColor: colors.border, borderBottomWidth: isIOS ? StyleSheet.hairlineWidth : 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: isIOS ? 52 : 68, paddingHorizontal: isIOS ? 16 : 24 },
  webTopbar: { minHeight: 76, paddingHorizontal: 28 },
  webBrand: { alignItems: 'center', flexDirection: 'row', gap: 11 },
  profileTrigger: { alignItems: 'center', borderRadius: 22, flexDirection: 'row', gap: 10, maxWidth: '55%', paddingHorizontal: 4, paddingVertical: 4 },
  webProfileTrigger: { backgroundColor: '#f7f9f8', borderColor: colors.border, borderRadius: 12, borderWidth: 1, maxWidth: 290, paddingHorizontal: 10, paddingVertical: 7 },
  profileTriggerCopy: { flexShrink: 1, minWidth: 0 },
  profileTriggerName: { color: colors.ink, fontSize: isIOS ? 17 : 14, fontWeight: isIOS ? '600' : '800' },
  profileTriggerHint: { color: colors.muted, fontSize: 10, marginTop: 2 },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  brandMark: { alignItems: 'center', backgroundColor: colors.greenSoft, borderRadius: 7, height: 38, justifyContent: 'center', overflow: 'hidden', width: 38 },
  brandImage: { height: 44, width: 44 },
  brandName: { color: colors.ink, fontSize: 18, fontWeight: '800', letterSpacing: 0 },
  brandTagline: { color: colors.muted, fontSize: 11, marginTop: 1 },
  topbarRight: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  deviceLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  avatar: { alignItems: 'center', backgroundColor: colors.greenDark, borderRadius: 19, height: isIOS ? 36 : 38, justifyContent: 'center', width: isIOS ? 36 : 38 },
  avatarText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  bottomNavDock: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 0 },
  bottomNavDockIOS: { paddingBottom: 4, paddingHorizontal: 12, paddingTop: 8 },
  bottomNavSurface: { backgroundColor: 'rgba(255,255,255,0.96)', borderColor: colors.border, borderRadius: Platform.OS === 'web' ? 24 : 0, borderTopWidth: 1, maxWidth: Platform.OS === 'web' ? 720 : undefined, overflow: 'hidden', width: '100%' },
  bottomNavAndroid: { backgroundColor: '#f7faf8', borderRadius: 0, elevation: 8 },
  bottomNavIOSFallback: { backgroundColor: 'rgba(255,255,255,0.98)', borderColor: '#d9d9de', borderRadius: 20, borderTopWidth: 0, borderWidth: StyleSheet.hairlineWidth, maxWidth: 720, shadowColor: '#000000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.11, shadowRadius: 18 },
  bottomNavItems: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-around', minHeight: 64, paddingHorizontal: 5, paddingVertical: 5 },
  bottomNavItemsIOS: { minHeight: 66, paddingHorizontal: 6, paddingVertical: 6 },
  bottomNavItem: { alignItems: 'center', flex: 1, gap: 2, justifyContent: 'center', minHeight: 54, minWidth: 54, paddingHorizontal: 3 },
  bottomNavItemIOS: { gap: 3, minHeight: 54, minWidth: 60, paddingHorizontal: 2 },
  bottomNavPressed: { transform: [{ scale: 0.97 }] },
  bottomNavIcon: { alignItems: 'center', borderRadius: 18, height: 32, justifyContent: 'center', width: 52 },
  bottomNavIconIOS: { borderRadius: 13, height: 30, width: 46 },
  bottomNavIconActive: { backgroundColor: colors.greenSoft },
  bottomNavIconActiveIOS: { backgroundColor: '#e8f2ff' },
  bottomNavLabel: { color: colors.muted, fontSize: isIOS ? 10 : 9, fontWeight: isIOS ? '500' : '700' },
  bottomNavLabelIOS: { fontSize: 10, letterSpacing: -0.05 },
  bottomNavLabelActive: { color: colors.greenDark, fontWeight: isIOS ? '600' : '800' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  webMainScroll: { backgroundColor: '#eef2f0' },
  webScrollContent: { paddingBottom: 40 },
  webSidebar: { backgroundColor: '#15231e', borderRightColor: '#273b34', borderRightWidth: 1, paddingHorizontal: 16, paddingVertical: 24, width: 248 },
  webSidebarEyebrow: { color: '#82978f', fontSize: 9, fontWeight: '900', letterSpacing: 1.2, paddingHorizontal: 12 },
  webSidebarNavigation: { gap: 5, marginTop: 14 },
  webNavItem: { alignItems: 'center', borderRadius: 9, flexDirection: 'row', gap: 12, minHeight: 48, paddingHorizontal: 10 },
  webNavItemActive: { backgroundColor: '#244338' },
  webNavIcon: { alignItems: 'center', borderRadius: 7, height: 32, justifyContent: 'center', width: 34 },
  webNavIconActive: { backgroundColor: '#dff2e8' },
  webNavLabel: { color: '#b8c6c1', fontSize: 13, fontWeight: '700' },
  webNavLabelActive: { color: colors.white },
  webSidebarFooter: { alignItems: 'center', backgroundColor: '#1c3029', borderColor: '#2c493f', borderRadius: 10, borderWidth: 1, bottom: 22, flexDirection: 'row', gap: 10, left: 16, padding: 12, position: 'absolute', right: 16 },
  webSidebarFooterCopy: { flex: 1 },
  webSidebarFooterTitle: { color: colors.white, fontSize: 11, fontWeight: '800' },
  webSidebarFooterText: { color: '#90a49d', fontSize: 9, lineHeight: 13, marginTop: 2 },
  content: { alignSelf: 'center', maxWidth: 1200, paddingHorizontal: isIOS ? 16 : 24, paddingTop: isIOS ? 14 : 20, width: '100%' },
  webContent: { alignSelf: 'stretch', maxWidth: 1440, paddingHorizontal: 32, paddingTop: 30 },
  pageStack: { gap: isIOS ? 20 : 22 },
  sectionBlock: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: isIOS ? 14 : 7, borderWidth: isIOS ? 0 : 1, gap: 14, padding: isIOS ? 16 : 18 },
  choiceRow: { gap: 10, paddingTop: 12 },
  choiceCard: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: isIOS ? 12 : 7, borderWidth: isIOS ? StyleSheet.hairlineWidth : 1, gap: 5, minHeight: 105, padding: 14, width: 172 },
  choiceCardSelected: { backgroundColor: colors.greenDark, borderColor: colors.greenDark },
  choiceTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  choiceMeta: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  choiceTextSelected: { color: colors.white },
  teacherCard: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.border, borderRadius: isIOS ? 14 : 7, borderWidth: isIOS ? 0 : 1, flex: 1, flexDirection: 'row', gap: 12, minWidth: 260, padding: 16 },
  teacherCardSelected: { backgroundColor: colors.greenSoft, borderColor: '#9cc8b4' },
  teacherAvatar: { alignItems: 'center', backgroundColor: colors.greenDark, borderRadius: 24, height: 48, justifyContent: 'center', width: 48 },
  teacherCopy: { flex: 1, minWidth: 0 },
  teacherSubject: { color: colors.green, fontSize: 11, fontWeight: '700', lineHeight: 15, marginTop: 1 },
  checkoutLayout: { alignItems: 'flex-start', flexDirection: 'row', gap: 16 },
  planGrid: { alignItems: 'stretch', flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  planGridCompact: { flexDirection: 'column' },
  planCard: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: isIOS ? 16 : 9, borderWidth: isIOS ? 0 : 1, flex: 1, gap: 14, minWidth: 235, padding: isIOS ? 18 : 20 },
  planCardVip: { backgroundColor: colors.charcoal, borderColor: colors.charcoal },
  planName: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  planPrice: { color: colors.ink, fontSize: 24, fontWeight: '900' },
  planUnlocks: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  planTextVip: { color: colors.white },
  planTextVipMuted: { color: '#b8c3bf' },
  planPaths: { gap: 7 },
  planPathChip: { backgroundColor: colors.greenSoft, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8 },
  planPathChipVip: { backgroundColor: 'rgba(255,255,255,0.09)' },
  planPathText: { color: colors.greenDark, fontSize: 10, fontWeight: '800', lineHeight: 15 },
  planRuleBanner: { alignItems: 'center', backgroundColor: colors.blueSoft, borderColor: '#cadbea', borderRadius: isIOS ? 12 : 7, borderWidth: isIOS ? 0 : 1, flexDirection: 'row', gap: 10, padding: 14 },
  planChoiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  planChoice: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: isIOS ? 12 : 7, borderWidth: 1, flex: 1, gap: 5, minWidth: 145, padding: 14 },
  planChoiceSelected: { backgroundColor: colors.greenDark, borderColor: colors.greenDark },
  planChoiceName: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  planChoiceNameSelected: { color: colors.white },
  planChoicePrice: { color: colors.greenDark, fontSize: 11, fontWeight: '800' },
  pathChoiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pathChoice: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.border, borderRadius: isIOS ? 12 : 7, borderWidth: 1, flexDirection: 'row', gap: 9, minHeight: 48, paddingHorizontal: 14 },
  pathChoiceSelected: { backgroundColor: colors.greenDark, borderColor: colors.greenDark },
  pathChoiceText: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  pathChoiceTextSelected: { color: colors.white },
  adminPlanCard: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: isIOS ? 14 : 7, borderWidth: isIOS ? 0 : 1, flex: 1, minWidth: 280, padding: isIOS ? 16 : 18 },
  uploadBox: { alignItems: 'center', backgroundColor: colors.blueSoft, borderColor: '#cadbea', borderRadius: isIOS ? 14 : 7, borderStyle: 'dashed', borderWidth: isIOS ? 0 : 1, gap: 5, marginVertical: 14, padding: 24 },
  noticeBar: { alignItems: 'center', backgroundColor: colors.blueSoft, borderColor: '#cadbea', borderRadius: isIOS ? 12 : 6, borderWidth: isIOS ? 0 : 1, flexDirection: 'row', gap: 9, marginBottom: 20, minHeight: isIOS ? 44 : 42, paddingHorizontal: 12 },
  noticeText: { color: '#244f7d', flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 18 },
  pageHeader: { alignItems: 'flex-end', flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between' },
  overline: { color: colors.green, fontSize: 10, fontWeight: '800', letterSpacing: 0 },
  pageTitle: { color: colors.ink, fontSize: isIOS ? 34 : 27, fontWeight: isIOS ? '700' : '800', letterSpacing: isIOS ? 0.3 : 0, marginTop: 6 },
  pageSubtitle: { color: colors.muted, fontSize: isIOS ? 15 : 13, lineHeight: isIOS ? 22 : 20, marginTop: 4 },
  courseGrid: { flexDirection: 'row', gap: 14 },
  courseGridCompact: { flexDirection: 'column' },
  courseCard: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: isIOS ? 14 : 7, borderWidth: isIOS ? 0 : 1, flex: 1, gap: 12, minWidth: 0, padding: isIOS ? 16 : 18 },
  courseCardTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  courseCategoryIcon: { alignItems: 'center', backgroundColor: colors.greenSoft, borderRadius: isIOS ? 10 : 7, height: 44, justifyContent: 'center', width: 44 },
  courseCardTitle: { color: colors.ink, fontSize: isIOS ? 20 : 18, fontWeight: isIOS ? '700' : '800', lineHeight: isIOS ? 25 : 23 },
  courseCardInstructor: { color: colors.green, fontSize: 11, fontWeight: '700', marginTop: -7 },
  courseCardDescription: { color: colors.muted, fontSize: isIOS ? 13 : 11, lineHeight: isIOS ? 19 : 17, minHeight: 52 },
  courseStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  courseStat: { color: colors.muted, fontSize: 10, fontWeight: '600' },
  progressHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { color: colors.muted, fontSize: 10, fontWeight: '600' },
  progressValue: { color: colors.greenDark, fontSize: 11, fontWeight: '800' },
  progressTrack: { backgroundColor: isIOS ? '#e5e5ea' : '#e6ece8', borderRadius: 3, height: 6, overflow: 'hidden' },
  progressFill: { backgroundColor: colors.green, height: '100%' },
  breadcrumbRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  breadcrumbLink: { color: colors.green, fontSize: 11, fontWeight: '700' },
  breadcrumbCurrent: { color: colors.muted, flexShrink: 1, fontSize: 11 },
  courseSummary: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.border, borderRadius: isIOS ? 14 : 7, borderWidth: isIOS ? 0 : 1, flexDirection: 'row', gap: 18, padding: isIOS ? 16 : 20 },
  courseSummaryCompact: { alignItems: 'flex-start', flexDirection: 'column' },
  courseSummaryIcon: { alignItems: 'center', backgroundColor: colors.greenSoft, borderRadius: isIOS ? 14 : 8, height: 64, justifyContent: 'center', width: 64 },
  courseSummaryCopy: { flex: 1, minWidth: 0 },
  courseSummaryMeta: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  courseSummaryLevel: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  courseInstructor: { color: colors.green, fontSize: 11, fontWeight: '700', marginTop: 8 },
  courseProgressBlock: { alignItems: 'flex-end', minWidth: 110 },
  courseProgressNumber: { color: colors.greenDark, fontSize: 28, fontWeight: '800' },
  courseProgressCaption: { color: colors.muted, fontSize: 10, marginTop: 2 },
  curriculumHeader: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between' },
  curriculumTitle: { color: colors.ink, fontSize: 19, fontWeight: '800', marginTop: 5 },
  curriculumMeta: { color: colors.muted, fontSize: 11 },
  chapterList: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: isIOS ? 14 : 7, borderWidth: isIOS ? 0 : 1, overflow: 'hidden' },
  chapterSection: { borderBottomColor: colors.border, borderBottomWidth: isIOS ? StyleSheet.hairlineWidth : 1 },
  chapterHeader: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 82, paddingHorizontal: 16, paddingVertical: 12 },
  chapterNumber: { alignItems: 'center', backgroundColor: colors.greenSoft, borderRadius: isIOS ? 9 : 6, height: 36, justifyContent: 'center', width: 36 },
  chapterNumberText: { color: colors.greenDark, fontSize: 13, fontWeight: '800' },
  chapterCopy: { flex: 1, minWidth: 0 },
  chapterTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  chapterSummary: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  chapterProgress: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  lessonList: { borderTopColor: colors.border, borderTopWidth: isIOS ? StyleSheet.hairlineWidth : 1, paddingLeft: isIOS ? 52 : 64 },
  lessonRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: isIOS ? StyleSheet.hairlineWidth : 1, flexDirection: 'row', gap: 11, minHeight: isIOS ? 60 : 66, paddingHorizontal: 16, paddingVertical: 10 },
  lessonRowPressed: { backgroundColor: colors.greenSoft },
  lessonRowLocked: { backgroundColor: '#fafbfa', opacity: 0.65 },
  lessonStatus: { alignItems: 'center', borderColor: colors.border, borderRadius: 15, borderWidth: 1, height: 30, justifyContent: 'center', width: 30 },
  lessonStatusComplete: { backgroundColor: colors.green, borderColor: colors.green },
  lessonIndex: { color: colors.muted, fontSize: 10, fontWeight: '800' },
  lessonCopy: { flex: 1, minWidth: 0 },
  lessonName: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  lessonNameLocked: { color: colors.muted },
  lessonMeta: { color: colors.muted, fontSize: 10, marginTop: 3, textTransform: 'capitalize' },
  lessonAction: { alignItems: 'flex-end', minWidth: 58 },
  courseLayout: { alignItems: 'stretch', flexDirection: 'row', gap: 16 },
  courseLayoutCompact: { flexDirection: 'column' },
  playerPanel: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: isIOS ? 14 : 7, borderWidth: isIOS ? 0 : 1, flex: 1.65, overflow: 'hidden' },
  videoFrame: { aspectRatio: 16 / 9, backgroundColor: colors.charcoal, overflow: 'hidden', position: 'relative' },
  video: { height: '100%', width: '100%' },
  videoGate: { alignItems: 'center', backgroundColor: 'rgba(17, 25, 22, 0.93)', bottom: 0, justifyContent: 'center', left: 0, padding: 22, position: 'absolute', right: 0, top: 0 },
  videoGateIcon: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 28, height: 56, justifyContent: 'center', width: 56 },
  videoGateTitle: { color: colors.white, fontSize: 20, fontWeight: '800', marginTop: 14 },
  videoGateText: { color: '#b8c3bf', fontSize: 12, lineHeight: 18, marginBottom: 16, marginTop: 5, maxWidth: 360, textAlign: 'center' },
  playerControls: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 72, padding: 13 },
  roundControl: { alignItems: 'center', backgroundColor: colors.greenDark, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  playerControlCopy: { flex: 1 },
  playerState: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  playerMeta: { color: colors.muted, fontSize: 11, marginTop: 3 },
  sessionPanel: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: isIOS ? 14 : 7, borderWidth: isIOS ? 0 : 1, flex: 1, padding: isIOS ? 16 : 18 },
  nextLessonPanel: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: isIOS ? 14 : 12, borderWidth: isIOS ? 0 : 1, flex: 1, padding: isIOS ? 16 : 18 },
  nextLessonHero: { alignItems: 'center', backgroundColor: colors.greenSoft, borderRadius: 22, height: 44, justifyContent: 'center', marginBottom: 16, width: 44 },
  panelTitleRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  panelEyebrow: { color: colors.muted, fontSize: 9, fontWeight: '800' },
  panelTitle: { color: colors.ink, fontSize: 17, fontWeight: '800', marginTop: 5 },
  detailList: { borderTopColor: colors.border, borderTopWidth: isIOS ? StyleSheet.hairlineWidth : 1, marginTop: 16, paddingTop: 7 },
  detailRow: { flexDirection: 'row', gap: 14, justifyContent: 'space-between', paddingVertical: 8 },
  detailLabel: { color: colors.muted, fontSize: 11 },
  detailValue: { color: colors.ink, flex: 1, fontSize: 11, fontWeight: '700', textAlign: 'right' },
  panelActions: { gap: 8, marginTop: 12 },
  nextLesson: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: isIOS ? StyleSheet.hairlineWidth : 1, flexDirection: 'row', gap: 10, marginTop: 18, paddingTop: 15 },
  nextLessonCopy: { flex: 1 },
  nextLessonLabel: { color: colors.muted, fontSize: 9, fontWeight: '800' },
  nextLessonTitle: { color: colors.ink, fontSize: 11, fontWeight: '700', marginTop: 3 },
  conflictBanner: { alignItems: 'center', backgroundColor: colors.amberSoft, borderColor: '#ecd29e', borderRadius: isIOS ? 14 : 7, borderWidth: isIOS ? 0 : 1, flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20, padding: 14 },
  conflictIcon: { alignItems: 'center', height: 34, justifyContent: 'center', width: 34 },
  conflictCopy: { flex: 1, minWidth: 220 },
  conflictTitle: { color: '#70400c', fontSize: 14, fontWeight: '800' },
  conflictText: { color: '#8a571d', fontSize: 12, lineHeight: 18, marginTop: 2 },
  actionRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { alignItems: 'center', borderRadius: isIOS ? 10 : 6, flexDirection: 'row', gap: 7, justifyContent: 'center', minHeight: isIOS ? 44 : 40, paddingHorizontal: isIOS ? 16 : 13 },
  buttonPrimary: { backgroundColor: colors.greenDark },
  buttonSecondary: { backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1 },
  buttonDanger: { backgroundColor: colors.red },
  buttonWarning: { backgroundColor: colors.amber },
  buttonText: { fontSize: isIOS ? 15 : 12, fontWeight: isIOS ? '600' : '800' },
  buttonTextLight: { color: colors.white },
  buttonTextSecondary: { color: colors.greenDark },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.42 },
  pill: { alignSelf: 'flex-start', borderRadius: 11, paddingHorizontal: 8, paddingVertical: 5 },
  pillSuccess: { backgroundColor: colors.greenSoft },
  pillWarning: { backgroundColor: colors.amberSoft },
  pillDanger: { backgroundColor: colors.redSoft },
  pillNeutral: { backgroundColor: '#edf0ee' },
  pillText: { fontSize: isIOS ? 11 : 10, fontWeight: isIOS ? '600' : '800' },
  pillTextSuccess: { color: colors.greenDark },
  pillTextWarning: { color: colors.amber },
  pillTextDanger: { color: colors.red },
  pillTextNeutral: { color: '#5d6965' },
  metricGrid: { flexDirection: 'row', gap: 12 },
  metricGridCompact: { flexWrap: 'wrap' },
  metric: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: isIOS ? 14 : 7, borderWidth: isIOS ? 0 : 1, flex: 1, minWidth: 155, padding: isIOS ? 16 : 15 },
  metricIcon: { alignItems: 'center', height: 22, justifyContent: 'center', width: 22 },
  metricLabel: { color: colors.muted, fontSize: 11, fontWeight: '600', marginTop: 11 },
  metricValue: { color: colors.ink, fontSize: 21, fontWeight: '800', marginTop: 5 },
  metricNote: { color: colors.muted, fontSize: 10, marginTop: 4 },
  profileLayout: { alignItems: 'stretch', flexDirection: 'row', gap: 16 },
  profileIdentityCard: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.border, borderRadius: isIOS ? 16 : 12, borderWidth: isIOS ? 0 : 1, flex: 0.75, gap: 7, justifyContent: 'center', minHeight: 260, padding: 24 },
  profileAvatar: { alignItems: 'center', backgroundColor: colors.greenDark, borderRadius: 42, height: 84, justifyContent: 'center', marginBottom: 7, width: 84 },
  profileAvatarText: { color: colors.white, fontSize: 26, fontWeight: '800' },
  profileName: { color: colors.ink, fontSize: 21, fontWeight: '800', marginTop: 2 },
  profileEmail: { color: colors.muted, fontSize: 12, marginBottom: 5 },
  profileDetailsCard: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: isIOS ? 16 : 12, borderWidth: isIOS ? 0 : 1, flex: 1, padding: isIOS ? 16 : 20 },
  profileSectionTitle: { alignItems: 'flex-start', flexDirection: 'row', gap: 11 },
  profileSupportCard: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: isIOS ? 16 : 12, borderWidth: isIOS ? 0 : 1, gap: 12, padding: isIOS ? 16 : 20 },
  profileSupportHeader: { alignItems: 'flex-start', flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  profileSupportFooter: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  profileActions: { alignItems: 'flex-end' },
  studentStatusLayout: { alignItems: 'stretch', flexDirection: 'row', gap: 16 },
  studentSessionPanel: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: isIOS ? 14 : 7, borderWidth: isIOS ? 0 : 1, flex: 1, padding: isIOS ? 16 : 18 },
  studentDevicePanel: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: isIOS ? 14 : 7, borderWidth: isIOS ? 0 : 1, flex: 1, padding: isIOS ? 16 : 18 },
  studentDeviceRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: isIOS ? StyleSheet.hairlineWidth : 1, flexDirection: 'row', gap: 10, minHeight: 68, paddingVertical: 10 },
  deviceIconSmall: { alignItems: 'center', backgroundColor: colors.greenSoft, borderRadius: 6, height: 36, justifyContent: 'center', width: 36 },
  studentDeviceCopy: { flex: 1, minWidth: 0 },
  studentDeviceName: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  studentDeviceMeta: { color: colors.muted, fontSize: 9, marginTop: 3 },
  dangerLink: { color: colors.red, fontSize: 11, fontWeight: '800', padding: 6 },
  listPanel: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: isIOS ? 14 : 7, borderWidth: isIOS ? 0 : 1, overflow: 'hidden' },
  notificationRow: { alignItems: 'flex-start', borderBottomColor: colors.border, borderBottomWidth: isIOS ? StyleSheet.hairlineWidth : 1, flexDirection: 'row', gap: 12, padding: 16 },
  notificationIcon: { alignItems: 'center', backgroundColor: '#edf0ee', borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  notificationIconUnread: { backgroundColor: colors.greenSoft },
  notificationCopy: { flex: 1, minWidth: 0 },
  paymentRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: isIOS ? StyleSheet.hairlineWidth : 1, flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16 },
  paymentIcon: { alignItems: 'center', backgroundColor: colors.blueSoft, borderRadius: 7, height: 42, justifyContent: 'center', width: 42 },
  quickAction: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: isIOS ? 14 : 7, borderWidth: isIOS ? 0 : 1, flex: 1, gap: 10, minWidth: 220, padding: isIOS ? 16 : 18 },
  statusGrid: { alignItems: 'stretch', flexDirection: 'row', gap: 16 },
  debugPanel: { backgroundColor: colors.charcoal, borderRadius: isIOS ? 14 : 7, flex: 1.4, minHeight: 410, overflow: 'hidden', padding: isIOS ? 16 : 18 },
  codeScroll: { marginTop: 16 },
  codeText: { color: '#b8d7c8', fontFamily: 'monospace', fontSize: 11, lineHeight: 18 },
  keyPanel: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: isIOS ? 14 : 7, borderWidth: isIOS ? 0 : 1, flex: 1, padding: isIOS ? 16 : 18 },
  keyRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: isIOS ? StyleSheet.hairlineWidth : 1, flexDirection: 'row', gap: 9, minHeight: 64 },
  keyIcon: { alignItems: 'center', width: 24 },
  keyLabel: { color: colors.ink, flex: 1, fontFamily: 'monospace', fontSize: 10 },
  keyValue: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  failureControl: { alignItems: 'flex-start', gap: 12, marginTop: 18 },
  failureCopy: { flex: 1 },
  failureTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  failureText: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 3 },
  segmented: { alignSelf: 'flex-start', backgroundColor: isIOS ? '#e3e3e8' : '#e9eeeb', borderRadius: isIOS ? 9 : 7, flexDirection: 'row', padding: 3 },
  segment: { borderRadius: isIOS ? 7 : 5, justifyContent: 'center', minHeight: isIOS ? 36 : 34, paddingHorizontal: 13 },
  segmentActive: { backgroundColor: colors.white },
  segmentText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  segmentTextActive: { color: colors.ink },
  table: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: isIOS ? 14 : 7, borderWidth: isIOS ? 0 : 1, minWidth: 1080, overflow: 'hidden' },
  tableRow: { borderBottomColor: colors.border, borderBottomWidth: isIOS ? StyleSheet.hairlineWidth : 1, flexDirection: 'row', minHeight: 58 },
  tableHeader: { backgroundColor: '#eef2f0', minHeight: 42 },
  tableCell: { color: colors.muted, fontSize: 10, lineHeight: 15, paddingHorizontal: 12, paddingVertical: 12, width: 180 },
  tableHeaderText: { color: colors.ink, fontWeight: '800' },
  emptyTable: { alignItems: 'center', justifyContent: 'center', minHeight: 130 },
  emptyTableText: { color: colors.muted, fontSize: 12 },
  adminFooter: { alignItems: 'center', backgroundColor: colors.blueSoft, borderRadius: isIOS ? 12 : 6, flexDirection: 'row', gap: 9, padding: 12 },
  adminFooterText: { color: '#244f7d', flex: 1, fontSize: 11, lineHeight: 17 },
});
