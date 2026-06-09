import fs from 'node:fs';
import path from 'node:path';

import tailwindcss from 'tailwindcss';
import { UnifiedViteWeappTailwindcssPlugin } from 'weapp-tailwindcss/vite';
import { defineConfig, type UserConfigExport } from '@tarojs/cli';
import type { PluginItem } from '@tarojs/taro/types/compile/config/project';
import dotenv from 'dotenv';
import devConfig from './dev';
import prodConfig from './prod';
import pkg from '../package.json';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const generateTTProjectConfig = (outputRoot: string) => {
  const config = {
    miniprogramRoot: './',
    projectname: 'venus-mate',
    appid: process.env.TARO_APP_TT_APPID || '',
    setting: {
      urlCheck: false,
      es6: false,
      postcss: false,
      minified: false,
    },
  };
  const outputDir = path.resolve(__dirname, '..', outputRoot);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(
    path.resolve(outputDir, 'project.config.json'),
    JSON.stringify(config, null, 2),
  );
};

// https://taro-docs.jd.com/docs/next/config#defineconfig-辅助函数
export default defineConfig<'vite'>(async (merge, _env) => {
  const outputRootMap: Record<string, string> = {
    weapp: 'dist',
    tt: 'dist-tt',
    h5: 'dist-web',
  };
  const defaultOutputRoot = outputRootMap[process.env.TARO_ENV || ''] || 'dist';
  const outputRoot = process.env.OUTPUT_ROOT?.trim() || defaultOutputRoot;
  const isH5 = process.env.TARO_ENV === 'h5';

  const buildMiniCIPluginConfig = () => {
    const hasWeappConfig = !!process.env.TARO_APP_WEAPP_APPID;
    const hasTTConfig = !!process.env.TARO_APP_TT_EMAIL;
    if (!hasWeappConfig && !hasTTConfig) {
      return [];
    }
    const miniCIConfig: Record<string, any> = {
      version: pkg.version,
      desc: pkg.description,
    };
    if (hasWeappConfig) {
      miniCIConfig.weapp = {
        appid: process.env.TARO_APP_WEAPP_APPID,
        privateKeyPath: 'key/private.appid.key',
      };
    }
    if (hasTTConfig) {
      miniCIConfig.tt = {
        email: process.env.TARO_APP_TT_EMAIL,
        password: process.env.TARO_APP_TT_PASSWORD,
        setting: {
          skipDomainCheck: true,
        },
      };
    }
    return [['@tarojs/plugin-mini-ci', miniCIConfig]] as PluginItem[];
  };

  const baseConfig: UserConfigExport<'vite'> = {
    projectName: 'venus-mate',
    date: '2026-1-13',
    alias: {
      '@': path.resolve(__dirname, '..', 'src'),
    },
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      375: 2,
      828: 1.81 / 2,
    },
    sourceRoot: 'src',
    outputRoot,
    plugins: ['@tarojs/plugin-generator', ...buildMiniCIPluginConfig()],
    defineConstants: {
      PROJECT_DOMAIN: JSON.stringify(
        process.env.PROJECT_DOMAIN || '',
      ),
      TARO_ENV: JSON.stringify(process.env.TARO_ENV),
    },
    copy: {
      patterns: [],
      options: {},
    },
    ...(process.env.TARO_ENV === 'tt' && {
      tt: {
        appid: process.env.TARO_APP_TT_APPID,
        projectName: 'venus-mate',
      },
    }),
    jsMinimizer: 'esbuild',
    framework: 'react',
    compiler: {
      type: 'vite',
      vitePlugins: [
        {
          name: 'postcss-config-loader-plugin',
          config(config: any) {
            // 通过 postcss 配置注册 tailwindcss 插件
            if (typeof config.css?.postcss === 'object') {
              config.css?.postcss.plugins?.unshift(tailwindcss());
            }
          },
        },
        {
          // 注意（2026-06-07）：WXSS :has() 规则的处理改在独立 watcher 中做（见
          // server/scripts/watch-strip-wxss.mjs）。原本想用 postcss 插件 / Vite transform /
          // Vite writeBundle 三种方式，但都因为 Taro 4 + WXSS 流水线的特殊性而失效。
          // 详细原因见该脚本注释。
          name: 'hmr-config-plugin',
          config() {
            if (!process.env.PROJECT_DOMAIN) {
              return;
            }
            // Only set clientPort for reverse-proxy (HTTPS) scenarios;
            // for local dev, Vite auto-infers from the page URL (port 5000).
            const isLocalDev = /localhost|127\.0\.0\.1|192\.168\.|10\.\d+/.test(
              process.env.PROJECT_DOMAIN,
            );
            return {
              server: {
                hmr: {
                  overlay: true,
                  path: '/hot/vite-hmr',
                  timeout: 30000,
                  ...(isLocalDev
                    ? {}
                    : { clientPort: 443, port: 6000 }),
                },
              },
            };
          },
        },
        ...(isH5
          ? []
          : [
              UnifiedViteWeappTailwindcssPlugin({
                rem2rpx: true,
                cssEntries: [path.resolve(__dirname, '../src/app.css')],
              }),
            ]),
        ...(process.env.TARO_ENV === 'tt'
          ? [
              {
                name: 'generate-tt-project-config',
                closeBundle() {
                  generateTTProjectConfig(outputRoot);
                },
              },
            ]
          : []),
        ...(isH5
          ? [
              {
                name: 'h5-favicon-plugin',
                transformIndexHtml(html: string) {
                  return html
                    .replace(
                      '</head>',
                      '  <link rel="icon" href="./favicon.ico" type="image/x-icon">\n</head>'
                    )
                    .replace(
                      /<title>.*?<\/title>/,
                      '<title>学习助手</title>'
                    );
                },
                closeBundle() {
                  // Copy favicon.ico to H5 output directory
                  const src = path.resolve(__dirname, '../public/favicon.ico');
                  const destDir = path.resolve(__dirname, '../dist-web');
                  if (fs.existsSync(src) && fs.existsSync(destDir)) {
                    fs.copyFileSync(src, path.join(destDir, 'favicon.ico'));
                  }
                },
              },
            ]
          : []),
      ],
    },
    mini: {
      postcss: {
        pxtransform: {
          enable: true,
          config: {},
        },
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
          config: {
            namingPattern: 'module', // 转换模式，取值为 global/module
            generateScopedName: '[name]__[local]___[hash:base64:5]',
          },
        },
      },
    },
    h5: {
      publicPath: './',
      staticDirectory: 'static',
      router: {
        mode: 'hash',
      },
      devServer: {
        port: 5000,
        host: '0.0.0.0',
        open: false,
        proxy: {
          '/api': {
            target: 'http://localhost:3000',
            changeOrigin: true,
          },
        },
      },
      miniCssExtractPluginOption: {
        ignoreOrder: true,
        filename: 'css/[name].[hash].css',
        chunkFilename: 'css/[name].[chunkhash].css',
      },
      postcss: {
        autoprefixer: {
          enable: true,
          config: {},
        },
        pxtransform: {
          enable: true,
          config: {
            platform: 'h5',
          },
        },
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
          config: {
            namingPattern: 'module', // 转换模式，取值为 global/module
            generateScopedName: '[name]__[local]___[hash:base64:5]',
          },
        },
      },
    },
    rn: {
      appName: 'venus-mate',
      postcss: {
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
        },
      },
    },
  };

  process.env.BROWSERSLIST_ENV = process.env.NODE_ENV;

  if (process.env.NODE_ENV === 'development') {
    // 本地开发构建配置（不混淆压缩）
    return merge({}, baseConfig, devConfig);
  }
  // 生产构建配置（默认开启压缩混淆等）
  return merge({}, baseConfig, prodConfig);
});
