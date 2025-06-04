import type { UserConfig } from '@commitlint/types';
import { RuleConfigSeverity } from '@commitlint/types';

const Configuration: UserConfig = {
  extends: ['@commitlint/config-conventional'],

  rules: {
    'type-enum': [
      RuleConfigSeverity.Error,
      'always',
      ['chore', 'ci', 'docs', 'feat', 'fix', 'perf', 'refactor', 'revert', 'style', 'test'],
    ],
    'subject-case': [
      RuleConfigSeverity.Error,
      'always',
      ['lower-case']
    ]
  },

  defaultIgnores: false,
};

export default Configuration;
