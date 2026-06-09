const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@kaptano/db", "@kaptano/shared"],
  outputFileTracingRoot: path.join(__dirname, "../../"),
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
};

module.exports = nextConfig;
