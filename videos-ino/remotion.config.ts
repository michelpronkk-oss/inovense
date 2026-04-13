// See all configuration options: https://remotion.dev/docs/config
// Each option also is available as a CLI flag: https://remotion.dev/docs/cli

// Note: When using the Node.JS APIs, the config file doesn't apply. Instead, pass options directly to the APIs

import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

// Keep Tailwind support when available, without hard-failing composition listing/rendering.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { enableTailwind } = require("@remotion/tailwind-v4");
  Config.overrideWebpackConfig(enableTailwind);
} catch {
  // No-op: The video templates do not depend on Tailwind to render.
}
