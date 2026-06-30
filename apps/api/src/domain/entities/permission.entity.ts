export class PermissionEntity {
  constructor(
    public readonly id: string,
    public readonly resource: string,
    public readonly action: string,
  ) {}

  get key(): string {
    return `${this.resource}.${this.action}`;
  }

  static create(props: { id: string; resource: string; action: string }): PermissionEntity {
    return new PermissionEntity(props.id, props.resource, props.action);
  }

  static parseKey(key: string): { resource: string; action: string } {
    const [resource, action] = key.split('.');
    return { resource, action };
  }
}
