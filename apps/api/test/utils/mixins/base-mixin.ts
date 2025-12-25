/**
 * Base mixin class for mixins that require a host implementing a capability interface
 */
export abstract class BaseMixin<THost> {
  constructor(protected readonly host: THost) {}
}
