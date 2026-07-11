const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const defaultResolveRequest = config.resolver.resolveRequest;
const demoModeEnabled =
  process.env.EXPO_PUBLIC_APP_MODE === 'demo' &&
  process.env.EXPO_PUBLIC_ENABLE_DEMO_APP === 'true';

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@e-lern/demo-app') {
    return {
      filePath: path.resolve(
        __dirname,
        demoModeEnabled ? 'src/app/DemoApp.tsx' : 'src/app/DemoApp.disabled.tsx',
      ),
      type: 'sourceFile',
    };
  }

  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
