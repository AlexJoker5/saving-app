export class WorkspaceConflictError extends Error {
  constructor() {
    super(
      'This workspace changed in another tab or device. The latest data has been loaded. Review your changes and save again.',
    );
    this.name = 'WorkspaceConflictError';
  }
}
