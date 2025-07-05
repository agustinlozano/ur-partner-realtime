import { build } from "esbuild";
import { resolve } from "path";

await build({
  entryPoints: [
    "src/handlers/connect.ts",
    "src/handlers/disconnect.ts",
    "src/handlers/message.ts",
  ],
  outdir: "dist/handlers",
  bundle: true,
  platform: "node",
  target: "node18",
  sourcemap: true,
  tsconfig: "tsconfig.json",
  alias: {
    "@": resolve("src"),
  },
});
