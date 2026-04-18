import type { NextConfig } from "next";
import path from "path";
import webpack from "webpack";
import { withTamagui } from '@tamagui/next-plugin';

const nextConfig: NextConfig = {
  serverExternalPackages: ['tesseract.js', 'pdf-parse', 'pdfjs-dist'],
  transpilePackages: [
    "react-native-svg",
    "lucide-react-native",
    "@stashflow/theme",
    "@stashflow/core",
    "@stashflow/api",
    "tamagui",
    "@tamagui/core",
    "@tamagui/shorthands",
    "@tamagui/themes",
    "@tamagui/font-inter",
    "@expo/html-elements",
    "react-native-web",
    "react-native",
  ],
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "react-native$": "react-native-web",
      // Use require.resolve() at config-load time so webpack never intercepts this as an alias target,
      // preventing the circular recursion / ENOTDIR that occurs when the alias target itself
      // contains a require('react-native-svg/...') call.
      "react-native-svg": require.resolve("react-native-svg/lib/commonjs/elements.web"),
      // Deduplicate React to prevent hook resolution issues
      // resolving React from a different location than the main app.
      "react$": require.resolve("react"),
      "react-dom$": require.resolve("react-dom"),
      "react-native/Libraries/Utilities/codegenNativeComponent": path.resolve(__dirname, "./utils/stubs/codegenNativeComponent.js"),
    };
    config.plugins.push(
      new webpack.DefinePlugin({
        __DEV__: JSON.stringify(process.env.NODE_ENV !== "production"),
      })
    );
    return config;
  },
};

export default withTamagui({
  config: './tamagui.config.ts',
  components: ['tamagui'],
  appDir: true,
  disableExtraction: process.env.NODE_ENV === 'development',
})(nextConfig);
