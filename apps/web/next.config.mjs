import createNextIntlPlugin from "next-intl/plugin";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep development artifacts separate from production builds. Running
  // `next build` while the local site is open must not invalidate `next dev`.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  reactStrictMode: true,
  transpilePackages: ["@mikconnect/ui"],
  experimental: {
    // Le design system expose composants + icônes via un barrel. Sans cette
    // optimisation, chaque route de développement compile tout le package.
    optimizePackageImports: ["@mikconnect/ui"],
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
