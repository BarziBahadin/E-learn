'use strict';

const isProductionBuild = process.env.EAS_BUILD_PROFILE === 'production';
const demoRequested =
  process.env.EXPO_PUBLIC_APP_MODE === 'demo' ||
  process.env.EXPO_PUBLIC_ENABLE_DEMO_APP === 'true';

if (isProductionBuild && demoRequested) {
  console.error(
    'Production builds cannot enable the demo application. Set ' +
      'EXPO_PUBLIC_APP_MODE=production and EXPO_PUBLIC_ENABLE_DEMO_APP=false.',
  );
  process.exit(1);
}

if (isProductionBuild) {
  console.log('Production environment validated: demo application is disabled.');
}
