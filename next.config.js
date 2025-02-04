/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    HEYGEN_API_KEY: process.env.HEYGEN_API_KEY,
  },
};

module.exports = nextConfig;
