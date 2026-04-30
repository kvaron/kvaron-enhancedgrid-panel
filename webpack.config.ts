import type { Configuration } from 'webpack';
import { merge } from 'webpack-merge';
import grafanaConfig, { Env } from './.config/webpack/webpack.config';

const config = async (env: Env): Promise<Configuration> => {
  const baseConfig = await grafanaConfig(env);

  return merge(baseConfig, {
    externals: ['react/jsx-runtime', 'react/jsx-dev-runtime'],
    optimization: {
      splitChunks: {
        chunks: 'async',
        cacheGroups: {
          // Separate chunk specifically for emoji data
          emojiData: {
            test: /[\\/]node_modules[\\/]emojibase-data[\\/]/,
            name: 'emoji-data',
            priority: 20,
            enforce: true,
          },
          // Default vendors chunk for other node_modules
          defaultVendors: {
            test: /[\\/]node_modules[\\/]/,
            priority: -10,
            reuseExistingChunk: true,
          },
        },
      },
    },
  });
};

export default config;
