import { RuleConfigSeverity } from '@commitlint/types';

import type { UserConfig } from '@commitlint/types';

const Configuration: UserConfig = {
  extends: ['@commitlint/config-conventional'],

  rules: {
    'type-enum': [
      RuleConfigSeverity.Error,
      'always',
      ['chore', 'ci', 'docs', 'feat', 'fix', 'perf', 'refactor', 'revert', 'style', 'test'],
    ],
  },

  defaultIgnores: false,
};

export default Configuration;
