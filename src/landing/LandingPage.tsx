import {
  ArrowLeft,
  ArrowRight,
  Atom,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  FlaskConical,
  Laptop,
  LockKeyhole,
  Menu,
  MonitorPlay,
  Play,
  ShieldCheck,
  Smartphone,
  Sparkles,
  SquareFunction,
  Target,
  TrendingUp,
  Users,
  X,
} from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Image,
  LayoutChangeEvent,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  ACADEMIC_YEAR_ACCESS_MODEL,
  formatIQD,
  pathLabel,
  pricingPlans,
  type PricingPlanId,
} from '../features/pricing/academicYearPlans';
import { GlassSurface } from '../ui/GlassSurface';

type LandingPageProps = {
  onStartDemo: (planId?: PricingPlanId) => void;
};

type SectionKey = 'courses' | 'pricing' | 'teachers' | 'how' | 'parents';

const palette = {
  ink: '#10233f',
  blue: '#0b5dcc',
  blueDark: '#073c85',
  blueSoft: '#edf5ff',
  green: '#5f8755',
  greenSoft: '#edf3e9',
  sand: '#f3eadc',
  cream: '#fbf8f2',
  paper: '#fffdf9',
  line: '#ded9d0',
  muted: '#5e6978',
  white: '#ffffff',
};

const subjects = [
  {
    id: 'Physics',
    icon: Atom,
    color: palette.blue,
    copy: 'Build deep understanding through clear explanations, worked examples, and exam practice.',
    detail: '42 video lessons · 8 quizzes',
  },
  {
    id: 'Mathematics',
    icon: SquareFunction,
    color: palette.green,
    copy: 'Move from strong foundations to confident problem-solving and faster exam technique.',
    detail: '56 video lessons · 12 quizzes',
  },
  {
    id: 'Chemistry',
    icon: FlaskConical,
    color: '#b27a24',
    copy: 'Understand reactions and key concepts, then practice until every step feels familiar.',
    detail: '38 video lessons · 9 quizzes',
  },
] as const;

const teachers = [
  { name: 'Hawkar Ahmed', subject: 'Physics', credential: 'BSc Physics · 10+ years teaching', image: require('../../assets/perspon/christopher-campbell-rDEOVtE7vOs-unsplash.jpg') },
  { name: 'Shilan Omer', subject: 'Mathematics', credential: 'BSc Mathematics · 8+ years teaching', image: require('../../assets/perspon/ian-dooley-d1UPkiFd04A-unsplash.jpg') },
  { name: 'Karzan Mohammed', subject: 'Chemistry', credential: 'BSc Chemistry · 9+ years teaching', image: require('../../assets/perspon/joseph-gonzalez-iFgRcqHznqg-unsplash.jpg') },
];

const landingImages = {
  hero: require('../../assets/unseen-studio-s9CC2SKySJM-unsplash.jpg'),
  journey: require('../../assets/priscilla-du-preez-XkKCui44iM0-unsplash.jpg'),
  parent: require('../../assets/juan-hilario-3fiztRMJPr8-unsplash.jpg'),
};

const testimonials = [
  {
    quote: 'E-Lern helped me understand difficult topics and stay on track. I feel more confident every day.',
    name: 'Dana J.',
    meta: 'Grade 12 student · Erbil',
  },
  {
    quote: 'The lessons are clear, and the practice questions show me exactly what I still need to improve.',
    name: 'Rawa S.',
    meta: 'Grade 12 student · Sulaymaniyah',
  },
];

function MediaSlot({ label, source, compact = false }: { label: string; source: number; compact?: boolean }) {
  return (
    <View accessibilityLabel={label} style={[styles.mediaSlot, compact && styles.mediaSlotCompact]}>
      <Image resizeMode="cover" source={source} style={styles.mediaImage} />
    </View>
  );
}

function LandingButton({
  label,
  onPress,
  secondary = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.buttonPressed]}
    >
      <GlassSurface
        glassStyle={styles.nativeGlassClear}
        interactive
        style={[styles.button, secondary ? styles.buttonSecondary : styles.buttonPrimary]}
        tintColor={secondary ? 'rgba(255,255,255,0.7)' : palette.blue}
      >
        {icon}
        <Text style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>{label}</Text>
      </GlassSurface>
    </Pressable>
  );
}

export default function LandingPage({ onStartDemo }: LandingPageProps) {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const narrow = width < 460;
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<SectionKey, number>>({ courses: 0, pricing: 0, teachers: 0, how: 0, parents: 0 });
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSubject, setActiveSubject] = useState<(typeof subjects)[number]['id']>('Physics');
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  const activeSubjectData = useMemo(
    () => subjects.find((subject) => subject.id === activeSubject) ?? subjects[0],
    [activeSubject],
  );

  const captureSection = (key: SectionKey) => (event: LayoutChangeEvent) => {
    sectionOffsets.current[key] = event.nativeEvent.layout.y;
  };

  const goTo = (key: SectionKey) => {
    setMenuOpen(false);
    scrollRef.current?.scrollTo({ animated: true, y: Math.max(0, sectionOffsets.current[key] - 74) });
  };

  const openStore = (store: 'ios' | 'android') => {
    const url = store === 'ios'
      ? 'https://apps.apple.com/us/search?term=E-Lern'
      : 'https://play.google.com/store/search?q=E-Lern&c=apps';
    Linking.openURL(url).catch(() => undefined);
  };

  const navItems: Array<{ label: string; section: SectionKey }> = [
    { label: 'Courses', section: 'courses' },
    { label: 'Pricing', section: 'pricing' },
    { label: 'Teachers', section: 'teachers' },
    { label: 'How it works', section: 'how' },
    { label: 'For parents', section: 'parents' },
  ];

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <Pressable accessibilityRole="button" onPress={() => scrollRef.current?.scrollTo({ animated: true, y: 0 })} style={styles.logo}>
            <View style={styles.logoMark}><BookOpen color={palette.white} size={19} strokeWidth={2.2} /></View>
            <View>
              <Text style={styles.logoName}>E-Lern</Text>
              {!narrow && <Text style={styles.logoTag}>Grade 12 learning platform</Text>}
            </View>
          </Pressable>

          {!compact && (
            <View style={styles.desktopNav}>
              {navItems.map((item) => (
                <Pressable key={item.section} onPress={() => goTo(item.section)} style={styles.navLink}>
                  <Text style={styles.navLinkText}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.headerActions}>
            {!narrow && (
              <Pressable onPress={() => onStartDemo()} style={styles.signInButton}>
                <Text style={styles.signInText}>Sign in</Text>
              </Pressable>
            )}
            <Pressable onPress={() => compact ? scrollRef.current?.scrollToEnd({ animated: true }) : onStartDemo()} style={styles.headerCta}>
              <Text style={styles.headerCtaText}>{compact ? 'Get the app' : 'Try the demo'}</Text>
            </Pressable>
            {compact && (
              <Pressable accessibilityLabel={menuOpen ? 'Close menu' : 'Open menu'} onPress={() => setMenuOpen((open) => !open)} style={styles.menuButton}>
                {menuOpen ? <X color={palette.ink} size={22} /> : <Menu color={palette.ink} size={22} />}
              </Pressable>
            )}
          </View>
        </View>
        {compact && menuOpen && (
          <View style={styles.mobileMenu}>
            {navItems.map((item) => (
              <Pressable key={item.section} onPress={() => goTo(item.section)} style={styles.mobileNavLink}>
                <Text style={styles.mobileNavText}>{item.label}</Text>
                <ChevronRight color={palette.muted} size={17} />
              </Pressable>
            ))}
            <Pressable onPress={() => scrollRef.current?.scrollToEnd({ animated: true })} style={styles.mobileNavLink}>
              <Text style={styles.mobileNavText}>Download the student app</Text>
              <ChevronRight color={palette.muted} size={17} />
            </Pressable>
          </View>
        )}
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, compact && styles.heroCompact]}>
          <View style={[styles.heroCopy, compact && styles.heroCopyCompact]}>
            <View style={styles.eyebrowRow}>
              <Sparkles color={palette.blue} size={15} />
              <Text style={styles.eyebrow}>MADE FOR GRADE 12 IN KURDISTAN</Text>
            </View>
            <Text style={[styles.heroTitle, compact && styles.heroTitleCompact]}>
              Your strongest year <Text style={styles.heroTitleAccent}>starts here.</Text>
            </Text>
            <Text style={styles.heroSubtitle}>
              Trusted teachers. Focused preparation. Stronger results—through lessons that match your curriculum.
            </Text>
            <View style={[styles.heroActions, narrow && styles.heroActionsNarrow]}>
              <LandingButton label="Browse Grade 12 courses" onPress={() => goTo('courses')} />
              <LandingButton
                secondary
                icon={<Play color={palette.blue} fill={palette.blue} size={15} />}
                label={compact ? 'Get the student app' : 'Watch a free preview'}
                onPress={() => compact ? scrollRef.current?.scrollToEnd({ animated: true }) : onStartDemo()}
              />
            </View>
            <View style={styles.heroProof}>
              <View style={styles.proofItem}><Users color={palette.blue} size={18} /><Text style={styles.proofText}>Trusted local teachers</Text></View>
              <View style={styles.proofItem}><Target color={palette.green} size={18} /><Text style={styles.proofText}>Built for Grade 12</Text></View>
              <View style={styles.proofItem}><Laptop color="#a56d20" size={18} /><Text style={styles.proofText}>Learn on every device</Text></View>
            </View>
          </View>

          <View style={[styles.heroMedia, compact && styles.heroMediaCompact]}>
            <MediaSlot label="Student learning with E-Lern" source={landingImages.hero} />
            <GlassSurface glassStyle={styles.nativeGlassClear} style={styles.floatingProgress} tintColor="rgba(255,255,255,0.5)">
              <View style={styles.progressIcon}><TrendingUp color={palette.green} size={17} /></View>
              <View><Text style={styles.floatingLabel}>Weekly progress</Text><Text style={styles.floatingValue}>On track</Text></View>
            </GlassSurface>
            <GlassSurface glassStyle={styles.nativeGlassClear} style={styles.floatingPractice} tintColor="rgba(237,245,255,0.45)">
              <Atom color={palette.blue} size={17} />
              <Text style={styles.floatingValue}>Practice Physics</Text>
            </GlassSurface>
          </View>
        </View>

        <View style={styles.credibilityStrip}>
          {[
            { icon: BookOpen, title: 'Curriculum aligned', copy: 'Ministry of Education Grade 12' },
            { icon: MonitorPlay, title: 'Free preview lessons', copy: 'Try before you decide' },
            { icon: Target, title: 'Structured exam prep', copy: 'Chapters, notes, and quizzes' },
            { icon: ShieldCheck, title: 'Secure progress', copy: 'Safe access on one device' },
          ].map((item) => (
            <View key={item.title} style={styles.credibilityItem}>
              <item.icon color={palette.ink} size={21} strokeWidth={1.7} />
              <View style={styles.credibilityCopy}><Text style={styles.credibilityTitle}>{item.title}</Text><Text style={styles.credibilityText}>{item.copy}</Text></View>
            </View>
          ))}
        </View>

        <View onLayout={captureSection('courses')} style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionKicker}>CURRICULUM-FOCUSED COURSES</Text>
            <Text style={[styles.sectionTitle, compact && styles.sectionTitleCompact]}>
              Lessons that match what you’re <Text style={styles.sectionTitleAccent}>learning.</Text>
            </Text>
            <Text style={styles.sectionIntro}>Choose a subject and see how E-Lern turns the Grade 12 curriculum into a clear weekly plan.</Text>
          </View>
          <View style={[styles.subjectLayout, compact && styles.subjectLayoutCompact]}>
            <View style={styles.subjectTabs}>
              {subjects.map((subject) => {
                const selected = subject.id === activeSubject;
                return (
                  <Pressable
                    accessibilityState={{ selected }}
                    key={subject.id}
                    onPress={() => setActiveSubject(subject.id)}
                    style={[styles.subjectTab, selected && styles.subjectTabSelected]}
                  >
                    <subject.icon color={selected ? palette.white : subject.color} size={24} />
                    <Text style={[styles.subjectTabText, selected && styles.subjectTabTextSelected]}>{subject.id}</Text>
                    <ChevronRight color={selected ? palette.white : palette.muted} size={18} />
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.subjectDetail}>
              <View style={styles.subjectDetailTop}>
                <View style={[styles.subjectDetailIcon, { backgroundColor: `${activeSubjectData.color}18` }]}>
                  <activeSubjectData.icon color={activeSubjectData.color} size={34} />
                </View>
                <Text style={styles.subjectDetailEyebrow}>GRADE 12 · FULL COURSE</Text>
              </View>
              <Text style={styles.subjectDetailTitle}>{activeSubjectData.id}</Text>
              <Text style={styles.subjectDetailCopy}>{activeSubjectData.copy}</Text>
              <Text style={styles.subjectDetailMeta}>{activeSubjectData.detail}</Text>
              <Pressable onPress={() => onStartDemo()} style={styles.textLink}>
                <Text style={styles.textLinkLabel}>Explore {activeSubjectData.id}</Text>
                <ArrowRight color={palette.blue} size={16} />
              </Pressable>
            </View>
          </View>
        </View>

        <View onLayout={captureSection('pricing')} style={[styles.section, styles.pricingSection]}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionKicker}>ONE PAYMENT · THE FULL ACADEMIC YEAR</Text>
            <Text style={[styles.sectionTitle, compact && styles.sectionTitleCompact]}>
              Choose the access that fits your <Text style={styles.sectionTitleAccent}>study path.</Text>
            </Text>
            <Text style={styles.sectionIntro}>{ACADEMIC_YEAR_ACCESS_MODEL}</Text>
          </View>
          <View style={[styles.pricingGrid, compact && styles.pricingGridCompact]}>
            {pricingPlans.map((plan) => (
              <GlassSurface
                glassStyle={styles.nativeGlassClear}
                key={plan.id}
                style={[
                  styles.pricingCard,
                  plan.id === 'platinum' && styles.pricingCardPlatinum,
                ]}
                tintColor={plan.id === 'platinum' ? 'rgba(7,60,133,0.72)' : 'rgba(255,255,255,0.52)'}
              >
                <View style={styles.pricingCardHeader}>
                  <Text style={[styles.pricingTier, plan.id === 'platinum' && styles.pricingTextLight]}>{plan.tierName}</Text>
                  <View style={[
                    styles.pricingDot,
                    plan.id === 'bronze' && styles.pricingDotBronze,
                    plan.id === 'silver' && styles.pricingDotSilver,
                    plan.id === 'gold' && styles.pricingDotGold,
                    plan.id === 'platinum' && styles.pricingDotPlatinum,
                  ]} />
                </View>
                <Text style={[styles.pricingPrice, plan.id === 'platinum' && styles.pricingTextLight]}>{formatIQD(plan.retailPriceIQD)}</Text>
                <Text style={[styles.pricingFrequency, plan.id === 'platinum' && styles.pricingTextMutedLight]}>One-time purchase</Text>
                <View style={styles.pricingDivider} />
                <View style={styles.pricingBenefit}>
                  <CheckCircle2 color={plan.id === 'platinum' ? '#9fc5f3' : palette.green} size={17} />
                  <Text style={[styles.pricingUnlocks, plan.id === 'platinum' && styles.pricingTextLight]}>{plan.unlocks}</Text>
                </View>
                {plan.allowedPaths.length > 0 ? (
                  <View style={styles.pricingPaths}>
                    {plan.allowedPaths.map((path) => (
                      <View key={pathLabel(path)} style={[styles.pricingPath, plan.id === 'platinum' && styles.pricingPathPlatinum]}>
                        <Text style={[styles.pricingPathText, plan.id === 'platinum' && styles.pricingTextMutedLight]}>{pathLabel(path)}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.pricingPathHint}>Choose Mathematics, Physics, Chemistry, Biology, English, Kurdish, or Arabic.</Text>
                )}
                <Pressable onPress={() => compact ? scrollRef.current?.scrollToEnd({ animated: true }) : onStartDemo(plan.id)} style={[styles.pricingCta, plan.id === 'platinum' && styles.pricingCtaPlatinum]}>
                  <Text style={[styles.pricingCtaText, plan.id === 'platinum' && styles.pricingCtaTextPlatinum]}>Choose {plan.shortName}</Text>
                  <ArrowRight color={plan.id === 'platinum' ? palette.blueDark : palette.white} size={15} />
                </Pressable>
              </GlassSurface>
            ))}
          </View>
          <View style={styles.pricingRuleRow}>
            <LockKeyhole color={palette.blue} size={17} />
            <Text style={styles.pricingRuleText}>Fixed bundle paths only. Custom multi-teacher mixes are not available.</Text>
          </View>
        </View>

        <View onLayout={captureSection('teachers')} style={[styles.section, styles.paperSection]}>
          <View style={[styles.splitHeading, compact && styles.splitHeadingCompact]}>
            <View style={styles.splitHeadingCopy}>
              <Text style={styles.sectionKicker}>LEARN FROM LOCAL EXPERTS</Text>
              <Text style={[styles.sectionTitle, compact && styles.sectionTitleCompact]}>Learn from trusted <Text style={styles.sectionTitleAccent}>teachers.</Text></Text>
            </View>
            <Text style={styles.splitHeadingIntro}>Teachers who know the curriculum, the exams, and how to help you build real confidence.</Text>
          </View>
          <View style={[styles.teacherGrid, compact && styles.teacherGridCompact]}>
            {teachers.map((teacher) => (
              <View key={teacher.name} style={styles.teacherProfile}>
                <MediaSlot compact label={`${teacher.name} portrait`} source={teacher.image} />
                <Text style={styles.teacherName}>{teacher.name}</Text>
                <Text style={styles.teacherSubject}>{teacher.subject}</Text>
                <Text style={styles.teacherCredential}>{teacher.credential}</Text>
              </View>
            ))}
          </View>
        </View>

        <View onLayout={captureSection('how')} style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionKicker}>A CLEAR ROUTE TO RESULTS</Text>
            <Text style={[styles.sectionTitle, compact && styles.sectionTitleCompact]}>Your learning journey, <Text style={styles.sectionTitleAccent}>step by step.</Text></Text>
          </View>
          <View style={[styles.journeyLayout, compact && styles.journeyLayoutCompact]}>
            <View style={styles.journeySteps}>
              {[
                { number: '01', icon: MonitorPlay, title: 'Watch', copy: 'Clear, engaging video lessons from expert local teachers.' },
                { number: '02', icon: BookOpen, title: 'Practice', copy: 'Quizzes, notes, and past questions that build confidence.' },
                { number: '03', icon: TrendingUp, title: 'Succeed', copy: 'Track your progress and focus your revision where it matters.' },
              ].map((step) => (
                <View key={step.number} style={styles.journeyStep}>
                  <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{step.number}</Text></View>
                  <View style={styles.stepIcon}><step.icon color={palette.blue} size={21} /></View>
                  <View style={styles.stepCopy}><Text style={styles.stepTitle}>{step.title}</Text><Text style={styles.stepText}>{step.copy}</Text></View>
                </View>
              ))}
            </View>
            <View style={styles.journeyMedia}><MediaSlot label="Student learning journey" source={landingImages.journey} /></View>
          </View>
        </View>

        <View onLayout={captureSection('parents')} style={[styles.section, styles.parentSection]}>
          <View style={[styles.parentLayout, compact && styles.parentLayoutCompact]}>
            <View style={styles.parentMedia}><MediaSlot label="Parent supporting a student" source={landingImages.parent} /></View>
            <View style={styles.parentCopy}>
              <Text style={styles.sectionKicker}>FOR FAMILIES</Text>
              <Text style={[styles.sectionTitle, compact && styles.sectionTitleCompact]}>Peace of mind for <Text style={styles.sectionTitleAccent}>parents.</Text></Text>
              <Text style={styles.sectionIntro}>A structured learning environment with visible progress and help when students need it.</Text>
              <View style={styles.parentBenefits}>
                {[
                  { icon: LockKeyhole, title: 'Safe and secure', copy: 'Protected access and one active device at a time.' },
                  { icon: ShieldCheck, title: 'Quality you can trust', copy: 'Experienced teachers and proven lesson methods.' },
                  { icon: TrendingUp, title: 'See real progress', copy: 'Track lessons, practice, and course completion.' },
                  { icon: Smartphone, title: 'Support when needed', copy: 'Help for students and parents across every device.' },
                ].map((benefit) => (
                  <View key={benefit.title} style={styles.parentBenefit}>
                    <benefit.icon color={palette.blue} size={20} />
                    <View style={styles.parentBenefitCopy}><Text style={styles.parentBenefitTitle}>{benefit.title}</Text><Text style={styles.parentBenefitText}>{benefit.copy}</Text></View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.testimonialSection}>
          <Text style={styles.quoteMark}>“</Text>
          <View style={styles.testimonialCopy}>
            <Text style={styles.testimonialQuote}>{testimonials[testimonialIndex].quote}</Text>
            <Text style={styles.testimonialName}>{testimonials[testimonialIndex].name}</Text>
            <Text style={styles.testimonialMeta}>{testimonials[testimonialIndex].meta}</Text>
          </View>
          <View style={styles.testimonialControls}>
            <Pressable accessibilityLabel="Previous testimonial" onPress={() => setTestimonialIndex((current) => (current + testimonials.length - 1) % testimonials.length)} style={styles.roundButton}>
              <ArrowLeft color={palette.ink} size={18} />
            </Pressable>
            <Pressable accessibilityLabel="Next testimonial" onPress={() => setTestimonialIndex((current) => (current + 1) % testimonials.length)} style={styles.roundButton}>
              <ArrowRight color={palette.ink} size={18} />
            </Pressable>
          </View>
        </View>

        <View style={[styles.finalCta, compact && styles.finalCtaCompact]}>
          <View style={styles.finalCtaCopy}>
            <Text style={styles.finalCtaKicker}>START WITH ONE FREE LESSON</Text>
            <Text style={[styles.finalCtaTitle, compact && styles.finalCtaTitleCompact]}>Your strongest year starts here.</Text>
            <Text style={styles.finalCtaText}>
              {Platform.OS === 'web'
                ? compact ? 'The website introduces E-Lern; lessons and progress live in the dedicated iOS and Android apps.' : 'Explore E-Lern courses and teachers, or sign in to the desktop administration workspace.'
                : 'Explore the complete E-Lern mobile experience as a student or teacher.'}
            </Text>
          </View>
          <View style={[styles.finalCtaActions, narrow && styles.heroActionsNarrow]}>
            {compact ? <><LandingButton label="Download for iOS" onPress={() => openStore('ios')} /><LandingButton secondary label="Download for Android" onPress={() => openStore('android')} /></> : <LandingButton label="Open E-Lern demo" onPress={() => onStartDemo()} />}
            <LandingButton secondary label="Browse courses" onPress={() => goTo('courses')} />
          </View>
        </View>

        <View style={[styles.footer, compact && styles.footerCompact]}>
          <View style={styles.footerBrand}>
            <View style={styles.logo}><View style={styles.logoMark}><BookOpen color={palette.white} size={18} /></View><Text style={styles.logoName}>E-Lern</Text></View>
            <Text style={styles.footerTag}>Grade 12 learning built for students in the Kurdistan Region of Iraq.</Text>
          </View>
          <View style={styles.footerLinks}>
            {navItems.map((item) => <Pressable key={item.section} onPress={() => goTo(item.section)}><Text style={styles.footerLink}>{item.label}</Text></Pressable>)}
          </View>
          <Text style={styles.copyright}>© 2026 E-Lern. Prototype experience.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const displayFont = Platform.select({ web: 'Georgia, "Times New Roman", serif', default: 'serif' });

const styles = StyleSheet.create({
  screen: { backgroundColor: palette.cream, flex: 1 },
  scrollContent: { backgroundColor: palette.cream },
  header: { backgroundColor: 'rgba(255,253,249,0.98)', borderBottomColor: palette.line, borderBottomWidth: StyleSheet.hairlineWidth, zIndex: 20 },
  headerInner: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 72, paddingHorizontal: 24, width: '100%', maxWidth: 1280 },
  logo: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  logoMark: { alignItems: 'center', backgroundColor: palette.blue, borderRadius: 8, height: 36, justifyContent: 'center', width: 36 },
  logoName: { color: palette.ink, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  logoTag: { color: palette.muted, fontSize: 9, marginTop: 1 },
  desktopNav: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  navLink: { borderRadius: 7, paddingHorizontal: 13, paddingVertical: 10 },
  navLinkText: { color: palette.ink, fontSize: 13, fontWeight: '600' },
  headerActions: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  signInButton: { paddingHorizontal: 12, paddingVertical: 10 },
  signInText: { color: palette.blue, fontSize: 13, fontWeight: '700' },
  headerCta: { backgroundColor: palette.blueDark, borderRadius: 7, minHeight: 40, justifyContent: 'center', paddingHorizontal: 16 },
  headerCtaText: { color: palette.white, fontSize: 13, fontWeight: '700' },
  menuButton: { alignItems: 'center', height: 42, justifyContent: 'center', width: 42 },
  mobileMenu: { backgroundColor: palette.paper, borderTopColor: palette.line, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 20, paddingVertical: 10 },
  mobileNavLink: { alignItems: 'center', borderBottomColor: palette.line, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', minHeight: 48 },
  mobileNavText: { color: palette.ink, fontSize: 14, fontWeight: '700' },
  hero: { alignItems: 'stretch', alignSelf: 'center', flexDirection: 'row', minHeight: 650, width: '100%', maxWidth: 1280 },
  heroCompact: { flexDirection: 'column', minHeight: 0 },
  heroCopy: { flex: 1, justifyContent: 'center', paddingHorizontal: 42, paddingVertical: 72 },
  heroCopyCompact: { paddingHorizontal: 22, paddingVertical: 54 },
  eyebrowRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 20 },
  eyebrow: { color: palette.blue, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  heroTitle: { color: palette.ink, fontFamily: displayFont, fontSize: 70, fontWeight: '700', letterSpacing: -2.3, lineHeight: 75, maxWidth: 600 },
  heroTitleCompact: { fontSize: 46, letterSpacing: -1.4, lineHeight: 51 },
  heroTitleAccent: { color: palette.blue },
  heroSubtitle: { color: palette.muted, fontSize: 18, lineHeight: 29, marginTop: 24, maxWidth: 560 },
  heroActions: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 32 },
  heroActionsNarrow: { alignItems: 'stretch', flexDirection: 'column' },
  button: { alignItems: 'center', borderRadius: 7, flexDirection: 'row', gap: 9, justifyContent: 'center', minHeight: 48, paddingHorizontal: 20 },
  buttonPrimary: { backgroundColor: palette.blue },
  buttonSecondary: { backgroundColor: palette.paper, borderColor: palette.blue, borderWidth: 1 },
  buttonPressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  buttonText: { color: palette.white, fontSize: 14, fontWeight: '800' },
  buttonTextSecondary: { color: palette.blue },
  nativeGlassClear: { backgroundColor: 'transparent', borderColor: 'transparent' },
  heroProof: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginTop: 36 },
  proofItem: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  proofText: { color: palette.ink, fontSize: 11, fontWeight: '600' },
  heroMedia: { flex: 0.95, minHeight: 650, padding: 28, position: 'relative' },
  heroMediaCompact: { minHeight: 500, paddingHorizontal: 22, paddingVertical: 0 },
  mediaSlot: { alignItems: 'center', backgroundColor: palette.sand, borderRadius: 8, flex: 1, justifyContent: 'center', minHeight: 260, overflow: 'hidden' },
  mediaSlotCompact: { minHeight: 270 },
  mediaImage: { height: '100%', width: '100%' },
  mediaSlotIcon: { alignItems: 'center', backgroundColor: palette.paper, borderRadius: 24, height: 48, justifyContent: 'center', marginBottom: 10, width: 48 },
  mediaSlotLabel: { color: palette.ink, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  mediaSlotHint: { color: palette.muted, fontSize: 11, marginTop: 4, textAlign: 'center' },
  floatingProgress: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)', borderColor: palette.line, borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 9, paddingHorizontal: 13, paddingVertical: 11, position: 'absolute', right: 7, top: 118 },
  progressIcon: { alignItems: 'center', backgroundColor: palette.greenSoft, borderRadius: 19, height: 38, justifyContent: 'center', width: 38 },
  floatingPractice: { alignItems: 'center', backgroundColor: 'rgba(237,245,255,0.96)', borderRadius: 9, flexDirection: 'row', gap: 8, left: 6, paddingHorizontal: 13, paddingVertical: 11, position: 'absolute', top: 210 },
  floatingLabel: { color: palette.muted, fontSize: 9, fontWeight: '700' },
  floatingValue: { color: palette.ink, fontSize: 11, fontWeight: '800', marginTop: 2 },
  credibilityStrip: { alignSelf: 'center', backgroundColor: palette.paper, borderBottomColor: palette.line, borderBottomWidth: 1, borderTopColor: palette.line, borderTopWidth: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 34, paddingVertical: 24, width: '100%', maxWidth: 1280 },
  credibilityItem: { alignItems: 'center', flexDirection: 'row', gap: 11, minWidth: 230, padding: 8 },
  credibilityCopy: { maxWidth: 180 },
  credibilityTitle: { color: palette.ink, fontSize: 12, fontWeight: '800' },
  credibilityText: { color: palette.muted, fontSize: 10, lineHeight: 15, marginTop: 2 },
  section: { alignSelf: 'center', paddingHorizontal: 42, paddingVertical: 94, width: '100%', maxWidth: 1280 },
  paperSection: { backgroundColor: palette.paper, borderBottomColor: palette.line, borderBottomWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line, borderTopWidth: StyleSheet.hairlineWidth, maxWidth: 1360 },
  sectionHeading: { alignItems: 'center', alignSelf: 'center', maxWidth: 760 },
  sectionKicker: { color: palette.green, fontSize: 11, fontWeight: '900', letterSpacing: 1.25, marginBottom: 14 },
  sectionTitle: { color: palette.ink, fontFamily: displayFont, fontSize: 45, fontWeight: '700', letterSpacing: -1.25, lineHeight: 52, textAlign: 'center' },
  sectionTitleCompact: { fontSize: 36, lineHeight: 42 },
  sectionTitleAccent: { color: palette.blue, fontStyle: 'italic' },
  sectionIntro: { color: palette.muted, fontSize: 15, lineHeight: 24, marginTop: 16, maxWidth: 620, textAlign: 'center' },
  subjectLayout: { alignItems: 'stretch', alignSelf: 'center', flexDirection: 'row', gap: 24, marginTop: 48, width: '100%', maxWidth: 960 },
  subjectLayoutCompact: { flexDirection: 'column' },
  subjectTabs: { gap: 8, width: 290 },
  subjectTab: { alignItems: 'center', backgroundColor: palette.paper, borderColor: palette.line, borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 12, minHeight: 68, paddingHorizontal: 18 },
  subjectTabSelected: { backgroundColor: palette.blueDark, borderColor: palette.blueDark },
  subjectTabText: { color: palette.ink, flex: 1, fontFamily: displayFont, fontSize: 18, fontWeight: '700' },
  subjectTabTextSelected: { color: palette.white },
  subjectDetail: { backgroundColor: palette.paper, borderColor: palette.line, borderRadius: 8, borderWidth: 1, flex: 1, minHeight: 300, padding: 32 },
  subjectDetailTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  subjectDetailIcon: { alignItems: 'center', borderRadius: 28, height: 56, justifyContent: 'center', width: 56 },
  subjectDetailEyebrow: { color: palette.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  subjectDetailTitle: { color: palette.ink, fontFamily: displayFont, fontSize: 32, fontWeight: '700', marginTop: 24 },
  subjectDetailCopy: { color: palette.muted, fontSize: 15, lineHeight: 24, marginTop: 11, maxWidth: 520 },
  subjectDetailMeta: { color: palette.green, fontSize: 12, fontWeight: '800', marginTop: 18 },
  textLink: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 8, marginTop: 26, paddingVertical: 4 },
  textLinkLabel: { color: palette.blue, fontSize: 13, fontWeight: '800' },
  pricingSection: { maxWidth: 1360 },
  pricingGrid: { alignItems: 'stretch', flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 48 },
  pricingGridCompact: { flexDirection: 'column' },
  pricingCard: { backgroundColor: palette.paper, borderColor: palette.line, borderRadius: 10, borderWidth: 1, flex: 1, minWidth: 250, padding: 24 },
  pricingCardPlatinum: { backgroundColor: palette.blueDark, borderColor: palette.blueDark },
  pricingCardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  pricingTier: { color: palette.ink, fontSize: 12, fontWeight: '900', letterSpacing: 0.55 },
  pricingDot: { borderRadius: 6, height: 12, width: 12 },
  pricingDotBronze: { backgroundColor: '#a96735' },
  pricingDotSilver: { backgroundColor: '#9aa4af' },
  pricingDotGold: { backgroundColor: '#d49b19' },
  pricingDotPlatinum: { backgroundColor: '#d9e8fa' },
  pricingPrice: { color: palette.ink, fontFamily: displayFont, fontSize: 29, fontWeight: '700', marginTop: 20 },
  pricingFrequency: { color: palette.muted, fontSize: 10, fontWeight: '700', marginTop: 4 },
  pricingDivider: { backgroundColor: 'rgba(180, 186, 194, 0.38)', height: 1, marginVertical: 20 },
  pricingBenefit: { alignItems: 'flex-start', flexDirection: 'row', gap: 9 },
  pricingUnlocks: { color: palette.ink, flex: 1, fontSize: 12, fontWeight: '800', lineHeight: 18 },
  pricingPaths: { gap: 7, marginTop: 15 },
  pricingPath: { backgroundColor: palette.blueSoft, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8 },
  pricingPathPlatinum: { backgroundColor: 'rgba(255, 255, 255, 0.09)' },
  pricingPathText: { color: palette.blueDark, fontSize: 10, fontWeight: '800', lineHeight: 15 },
  pricingPathHint: { color: palette.muted, fontSize: 10, lineHeight: 16, marginTop: 15 },
  pricingTextLight: { color: palette.white },
  pricingTextMutedLight: { color: '#cfdef2' },
  pricingCta: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: palette.blue, borderRadius: 7, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 24, minHeight: 44, paddingHorizontal: 14 },
  pricingCtaPlatinum: { backgroundColor: palette.white },
  pricingCtaText: { color: palette.white, fontSize: 12, fontWeight: '900' },
  pricingCtaTextPlatinum: { color: palette.blueDark },
  pricingRuleRow: { alignItems: 'center', alignSelf: 'center', backgroundColor: palette.blueSoft, borderRadius: 8, flexDirection: 'row', gap: 9, marginTop: 40, paddingHorizontal: 16, paddingVertical: 12 },
  pricingRuleText: { color: palette.ink, fontSize: 11, fontWeight: '700' },
  splitHeading: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between' },
  splitHeadingCompact: { alignItems: 'flex-start', flexDirection: 'column', gap: 18 },
  splitHeadingCopy: { alignItems: 'flex-start', flex: 1, maxWidth: 650 },
  splitHeadingIntro: { color: palette.muted, fontSize: 15, lineHeight: 24, maxWidth: 360 },
  teacherGrid: { flexDirection: 'row', gap: 18, marginTop: 48 },
  teacherGridCompact: { flexDirection: 'column' },
  teacherProfile: { flex: 1, minWidth: 0 },
  teacherName: { color: palette.ink, fontFamily: displayFont, fontSize: 20, fontWeight: '700', marginTop: 15 },
  teacherSubject: { color: palette.blue, fontSize: 12, fontWeight: '800', marginTop: 3 },
  teacherCredential: { color: palette.muted, fontSize: 11, lineHeight: 17, marginTop: 4 },
  journeyLayout: { alignItems: 'stretch', flexDirection: 'row', gap: 42, marginTop: 48 },
  journeyLayoutCompact: { flexDirection: 'column' },
  journeySteps: { flex: 1, gap: 5 },
  journeyStep: { alignItems: 'center', borderBottomColor: palette.line, borderBottomWidth: 1, flexDirection: 'row', gap: 15, minHeight: 112, paddingVertical: 16 },
  stepNumber: { width: 32 },
  stepNumberText: { color: palette.green, fontSize: 11, fontWeight: '900' },
  stepIcon: { alignItems: 'center', backgroundColor: palette.blueSoft, borderRadius: 23, height: 46, justifyContent: 'center', width: 46 },
  stepCopy: { flex: 1 },
  stepTitle: { color: palette.ink, fontFamily: displayFont, fontSize: 21, fontWeight: '700' },
  stepText: { color: palette.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  journeyMedia: { flex: 0.9, minHeight: 360 },
  parentSection: { backgroundColor: palette.paper, maxWidth: 1360 },
  parentLayout: { alignItems: 'stretch', flexDirection: 'row', gap: 52 },
  parentLayoutCompact: { flexDirection: 'column' },
  parentMedia: { flex: 1, minHeight: 420 },
  parentCopy: { alignItems: 'flex-start', flex: 1, justifyContent: 'center' },
  parentBenefits: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginTop: 32 },
  parentBenefit: { alignItems: 'flex-start', flexDirection: 'row', gap: 11, minWidth: 210, width: '46%' },
  parentBenefitCopy: { flex: 1 },
  parentBenefitTitle: { color: palette.ink, fontSize: 12, fontWeight: '800' },
  parentBenefitText: { color: palette.muted, fontSize: 10, lineHeight: 16, marginTop: 3 },
  testimonialSection: { alignItems: 'center', alignSelf: 'center', backgroundColor: palette.blueSoft, flexDirection: 'row', gap: 24, paddingHorizontal: 50, paddingVertical: 44, width: '100%', maxWidth: 1280 },
  quoteMark: { color: palette.blue, fontFamily: displayFont, fontSize: 72, lineHeight: 74 },
  testimonialCopy: { flex: 1 },
  testimonialQuote: { color: palette.ink, fontFamily: displayFont, fontSize: 23, fontStyle: 'italic', lineHeight: 33, maxWidth: 750 },
  testimonialName: { color: palette.ink, fontSize: 12, fontWeight: '900', marginTop: 15 },
  testimonialMeta: { color: palette.muted, fontSize: 10, marginTop: 3 },
  testimonialControls: { flexDirection: 'row', gap: 8 },
  roundButton: { alignItems: 'center', backgroundColor: palette.paper, borderColor: palette.line, borderRadius: 21, borderWidth: 1, height: 42, justifyContent: 'center', width: 42 },
  finalCta: { alignItems: 'center', alignSelf: 'center', backgroundColor: palette.blueDark, flexDirection: 'row', justifyContent: 'space-between', marginTop: 80, minHeight: 250, paddingHorizontal: 58, paddingVertical: 48, width: '100%', maxWidth: 1280 },
  finalCtaCompact: { alignItems: 'flex-start', flexDirection: 'column', gap: 28, marginTop: 42, paddingHorizontal: 24 },
  finalCtaCopy: { maxWidth: 680 },
  finalCtaKicker: { color: '#9fc5f3', fontSize: 10, fontWeight: '900', letterSpacing: 1.15 },
  finalCtaTitle: { color: palette.white, fontFamily: displayFont, fontSize: 44, fontWeight: '700', letterSpacing: -1, marginTop: 11 },
  finalCtaTitleCompact: { fontSize: 35 },
  finalCtaText: { color: '#cfdef2', fontSize: 14, lineHeight: 22, marginTop: 12 },
  finalCtaActions: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  footer: { alignItems: 'flex-start', alignSelf: 'center', flexDirection: 'row', gap: 36, justifyContent: 'space-between', paddingHorizontal: 42, paddingVertical: 54, width: '100%', maxWidth: 1280 },
  footerCompact: { flexDirection: 'column' },
  footerBrand: { maxWidth: 310 },
  footerTag: { color: palette.muted, fontSize: 11, lineHeight: 17, marginTop: 14 },
  footerLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  footerLink: { color: palette.ink, fontSize: 11, fontWeight: '700' },
  copyright: { color: palette.muted, fontSize: 10 },
});
