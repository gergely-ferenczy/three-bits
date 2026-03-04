// prettier-ignore
export type InternalOptions<TOptions, TOptionalKeys extends keyof TOptions = never> =
  Required<Omit<TOptions, TOptionalKeys>> &
  Pick<TOptions, TOptionalKeys>;
