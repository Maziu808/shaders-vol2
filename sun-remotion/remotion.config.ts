import { Config } from "@remotion/cli/config";
import { enableTailwind } from "@remotion/tailwind-v4";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(100);
Config.setOverwriteOutput(true);
// Hardware GPU for renders: the default software GL is 20-40x slower.
Config.setChromiumOpenGlRenderer("angle");
Config.setCachingEnabled(false);
Config.overrideWebpackConfig((config) => ({
  ...enableTailwind(config),
  cache: false,
}));
