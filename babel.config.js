module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    overrides: [
      {
        test: /\/(App\.tsx|index\.ts|screens\/|components\/|hooks\/|services\/|src\/)/,
        plugins: ["react-native-reanimated/plugin"],
      },
    ],
  };
};
