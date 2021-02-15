const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.NODE_ENV === 'production' && !process.env.VERCEL,
})

module.exports = withBundleAnalyzer({
  images: {
    deviceSizes: [375, 425, 640, 768],
  },
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  // async headers() {
  //   return [
  //     {
  //       source: '/figma/:slug*',
  //       headers: [
  //         {
  //           key: 'X-FIGMA-TOKEN',
  //           value: '159060-baa471f1-8047-4830-9fd1-34158e13f20a',
  //         },
  //       ],
  //     },
  //   ]
  // },
  // async rewrites() {
  //   return [
  //     {
  //       source: '/figma/:slug*',
  //       destination: 'https://api.figma.com/v1/:slug*',
  //     },
  //   ]
  // },
  webpack(config, { dev }) {
    const options = {
      publicPath: '/_next/',
    }

    if (dev) {
      options.name = 'static/[hash]'
    } else {
      config.optimization.moduleIds = 'total-size'

      options.name = 'static/built-[1].[hash:6]'
      options.regExp = '(\\w+).worker.(js|ts)$'
    }

    config.module.rules.push({
      test: /\.worker\.(js|ts)$/,
      use: { loader: 'workerize-loader', options },
    })

    config.output.globalObject = 'self'

    return config
  },
})
