import PrototypeApp from '../prototype/PrototypeApp';
import { I18nProvider } from '../i18n/I18nProvider';

export default function DemoApp() {
  return (
    <I18nProvider>
      <PrototypeApp />
    </I18nProvider>
  );
}
