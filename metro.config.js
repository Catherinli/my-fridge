const { getDefaultConfig } = require("expo/metro-config");
const { resolve } = require("metro-resolver");

const config = getDefaultConfig(__dirname);
const defaultResolveRequest = config.resolver.resolveRequest ?? resolve;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react-native-reanimated") {
    return defaultResolveRequest(context, "react-native-reanimated/lib/module/index", platform);
  }
  if (moduleName === "react-native-draggable-flatlist") {
    return defaultResolveRequest(context, "react-native-draggable-flatlist/lib/module/index", platform);
  }
  return defaultResolveRequest(context, moduleName, platform);
};

module.exports = config;
