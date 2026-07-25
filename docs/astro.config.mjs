// @ts-check
import { defineConfig } from 'astro/config';
import UnoCSS from 'unocss/astro';
import Icons from 'starlight-plugin-icons';
import starlightTypeDoc, { typeDocSidebarGroup } from 'starlight-typedoc';
import starlightVersions from 'starlight-versions';

const gitRemote = 'https://github.com/gergely-ferenczy/three-bits';

// https://astro.build/config
export default defineConfig({
  integrations: [
    UnoCSS(),
    Icons({
      sidebar: true,
      extractSafelist: true,
      starlight: {
        title: 'three-bits',
        logo: {
          src: './src/assets/tb-logo.png',
        },
        social: [
          {
            icon: 'github',
            label: 'GitHub',
            href: gitRemote,
          },
        ],
        plugins: [
          // starlightVersions({
          //   versions: [],
          // }),
          starlightTypeDoc({
            entryPoints: ['../lib/index.ts'],
            tsconfig: '../lib/tsconfig.json',
            output: 'reference',
            sidebar: { label: 'Reference', collapsed: true },
            typeDoc: { parametersFormat: 'table', cleanOutputDir: true, gitRevision: 'main' },
          }),
        ],
        sidebar: [
          {
            label: 'Guides',
            items: [
              { label: 'Getting Started', slug: 'guides/getting-started' },
              {
                label: 'Controls',
                items: [
                  { label: 'Overview', slug: 'guides/controls' },
                  { label: 'OrbitControl', slug: 'guides/controls/orbit-control' },
                  { label: 'FpvControl', slug: 'guides/controls/fpv-control' },
                  { label: 'TrackballControl', slug: 'guides/controls/trackball-control' },
                ],
              },
              { label: 'Event Handling', slug: 'guides/event-handling' },
              { label: 'Transform Tool', slug: 'guides/transform-tool' },
              { label: 'Utils', slug: 'guides/utils' },
            ],
          },
          {
            label: 'Playground',
            link: '/playground/',
            icon: 'i-mdi:external-link',
          },
          typeDocSidebarGroup,
        ],
      },
    }),
  ],
});
