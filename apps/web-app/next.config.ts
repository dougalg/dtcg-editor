import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	turbopack: {
		root: path.resolve(import.meta.dirname, "../.."),
	},
	transpilePackages: ["@dtcg-editor/design-system"],
};

export default nextConfig;
