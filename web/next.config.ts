import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Built to plain files in web/out; the backend serves them, so no Node process is needed to run it.
  output: "export",
  // /devices becomes devices/index.html, which the backend's static handler can find.
  trailingSlash: true,
};

export default nextConfig;
