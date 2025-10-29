/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: [],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    },
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion'],
  },

  // Production optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Performance optimizations
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  webpack: (config, { isServer, dev }) => {
    // OneDrive sorunları için
    config.resolve.symlinks = false;

    // Development'ta daha az modül yükle
    if (dev) {
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };
    }

    // Production optimizations
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true
            },
            supabase: {
              test: /[\\/]node_modules[\\/](@supabase)[\\/]/,
              name: 'supabase',
              chunks: 'all',
              priority: 30,
            },
            ui: {
              test: /[\\/]node_modules[\\/](lucide-react|recharts|framer-motion)[\\/]/,
              name: 'ui-libs',
              chunks: 'all',
              priority: 25,
            }
          }
        }
      };
    }

    return config;
  },
}

module.exports = nextConfig