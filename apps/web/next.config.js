const path = require("path");
const { PrismaPlugin } = require("@prisma/nextjs-monorepo-workaround-plugin");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@kaptano/db", "@kaptano/shared"],
  outputFileTracingRoot: path.join(__dirname, "../../"),
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "wasenderapi"],
    outputFileTracingIncludes: {
      "/api/**/*": [
        "node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/**",
        "node_modules/.pnpm/@prisma+client@*/node_modules/@prisma/client/**",
      ],
      "/*": [
        "node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/**",
        "node_modules/.pnpm/@prisma+client@*/node_modules/@prisma/client/**",
      ],
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins.push(new PrismaPlugin());
    }
    return config;
  },
};

module.exports = nextConfig;
