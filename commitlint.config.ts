import { RuleConfigSeverity } from '@commitlint/types';
import type { UserConfig } from '@commitlint/types';
// import type { Options } from 'conventional-commits-parser';

const Configuration: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  // parserPreset: {
  //   parserOpts: {
  //     headerPattern: /^([A-Z]{2,}-[0-9]+)? ?(\w*)(?:\(([\w$.*\- ]*)\))?: (.*)$/,
  //     headerCorrespondence: ['workItem', 'type', 'scope', 'subject'],
  //   } satisfies Options,
  // },
  rules: {
    'type-enum': [
      RuleConfigSeverity.Error,
      'always',
      ['chore', 'ci', 'docs', 'feat', 'fix', 'perf', 'refactor', 'revert', 'style', 'test'],
    ],
    'subject-case': [RuleConfigSeverity.Disabled],
    // 'subject-work-item-id-empty': [RuleConfigSeverity.Error, 'always'],
    // 'subject-work-item-id-prefix': [RuleConfigSeverity.Error, 'always', 'PRD'],
    // 'hello-world': [RuleConfigSeverity.Error, 'always'],
  },

  // plugins: [
  //   {
  //     rules: {
  //       'subject-work-item-id-empty': (parsed, when, value) => {
  //         const workItem = parsed.workItem;
  //         return [
  //           !!parsed.merge || !!workItem,
  //           `commit message must start with a work item ID, e.g.: '${value}-XXXX feat: Example commit message'`,
  //         ];
  //       },
  //       'subject-work-item-id-prefix': (parsed, when, value) => {
  //         const workItem = parsed.workItem;

  //         return [
  //           !!parsed.merge || !workItem || typeof value !== 'string' || workItem.startsWith(value),
  //           `work item ID prefix must be '${value}'`,
  //         ];
  //       },
  //       // 'hello-world': (parsed, when, value) => {
  //       //   console.log(parsed, when, value);
  //       //   return [true, ''];
  //       // },
  //     },
  //   },
  // ],

  defaultIgnores: false,
};

export default Configuration;
