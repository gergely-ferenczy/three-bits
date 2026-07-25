// We need to import React for three-bit-docs integration, otherwise the build
// output becomes corrupted. Should check on this periodically to see if it's
// still necessary.
// eslint-disable-next-line import-x/default
import React from 'react';

import { addons, types } from 'storybook/manager-api';

const ADDON_ID = 'docs-link';
const TOOL_ID = `${ADDON_ID}/tool`;

addons.register(ADDON_ID, () => {
  addons.add(TOOL_ID, {
    type: types.TOOL,
    title: 'Back to Docs',
    render: () => {
      if (!window.location.pathname.includes('/playground')) {
        return null;
      }
      const docsUrl = window.location.href.replace(/\/playground.*$/, '/');
      return (
        <a
          href={docsUrl}
          title="Back to Docs"
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 8px',
            height: '28px',
            borderRadius: '4px',
            textDecoration: 'none',
            fontSize: '13px',
            color: 'inherit',
            border: '1px solid rgba(128,128,128,0.3)',
            gap: '4px',
            whiteSpace: 'nowrap',
          }}
        >
          ← Back to Docs
        </a>
      );
    },
  });
});
