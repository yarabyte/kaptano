/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@kaptano/db", "@kaptano/shared"],
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
};

module.exports = nextConfig;
