import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    loader: 'custom',
    loaderFile: './src/lib/cloudinary-loader.ts',
  },
};

export default nextConfig;
