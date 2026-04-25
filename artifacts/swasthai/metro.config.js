const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Ignore transient pnpm temp dirs that can be created/removed during installs
// and break Metro's file watcher.
const ignorePatterns = [
  /node_modules\/.*_tmp_.*/,
  /\.pnpm\/.*_tmp_.*/,
];

config.resolver = config.resolver || {};
config.resolver.blockList = ignorePatterns;

config.watcher = config.watcher || {};
config.watcher.additionalExts = config.watcher.additionalExts || [];
config.watcher.healthCheck = { enabled: false };
config.watcher.watchman = config.watcher.watchman || {};
config.watcher.unstable_autoSaveCache = { enabled: true };

module.exports = config;
