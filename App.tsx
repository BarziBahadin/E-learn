import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import PrototypeApp from './src/prototype/PrototypeApp';
import { I18nProvider } from './src/i18n/I18nProvider';
import { useFonts } from 'expo-font';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    NotoSansArabic_400Regular: require('@expo-google-fonts/noto-sans-arabic/400Regular/NotoSansArabic_400Regular.ttf'),
    NotoSansArabic_600SemiBold: require('@expo-google-fonts/noto-sans-arabic/600SemiBold/NotoSansArabic_600SemiBold.ttf'),
    NotoSansArabic_700Bold: require('@expo-google-fonts/noto-sans-arabic/700Bold/NotoSansArabic_700Bold.ttf'),
    NotoSansArabic_800ExtraBold: require('@expo-google-fonts/noto-sans-arabic/800ExtraBold/NotoSansArabic_800ExtraBold.ttf'),
  });
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <I18nProvider>
        <StatusBar hidden={false} style="dark" />
        <PrototypeApp />
      </I18nProvider>
    </SafeAreaProvider>
  );
}
