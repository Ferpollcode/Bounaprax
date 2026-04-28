import type { NextConfig } from "next";

// Fija el timezone del proceso Node.js antes de que arranquen los server components
process.env.TZ = 'America/Argentina/Buenos_Aires';

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
