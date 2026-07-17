/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep development artifacts separate from production builds. Running
  // `next build` while the local site is open must not invalidate `next dev`.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  reactStrictMode: true,
  transpilePackages: ["@mikconnect/ui"],
};

export default nextConfig;
