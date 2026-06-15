const { withAppBuildGradle } = require('@expo/config-plugins');

const NINJA_CMAKE_ARGS = `
        externalNativeBuild {
            cmake {
                arguments "-DCMAKE_MAKE_PROGRAM=C:\\\\ninja-win\\\\ninja.exe", "-DCMAKE_OBJECT_PATH_MAX=240"
            }
        }`;

/**
 * Windows: React Native New Architecture CMake builds can exceed MAX_PATH (260).
 * Requires Ninja >= 1.12 at C:\\ninja-win\\ninja.exe — run scripts/setup-windows-ninja.ps1
 */
module.exports = function withNinjaLongPaths(config) {
  return withAppBuildGradle(config, (config) => {
    if (process.platform !== 'win32') {
      return config;
    }

    if (!config.modResults.contents.includes('DCMAKE_MAKE_PROGRAM')) {
      config.modResults.contents = config.modResults.contents.replace(
        /(defaultConfig\s*\{[\s\S]*?versionName[^\n]*\n)/,
        `$1${NINJA_CMAKE_ARGS}\n`,
      );
    }

    return config;
  });
};
