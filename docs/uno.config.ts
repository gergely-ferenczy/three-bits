import { defineConfig } from 'unocss';
import { presetStarlightIcons } from 'starlight-plugin-icons/uno';

export default defineConfig({
  presets: [presetStarlightIcons()],
  safelist: ['i-mdi:external-link'],
});
