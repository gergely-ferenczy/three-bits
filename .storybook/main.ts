import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['./stories/**/*.stories.@(ts|tsx)', './stories/**/*.mdx'],
  addons: ['@storybook/addon-docs', 'storybook-dark-mode'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {},
  staticDirs: ['./assets'],
};

export default config;
