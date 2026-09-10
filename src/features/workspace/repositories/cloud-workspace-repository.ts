import { getSupabase } from '../../../lib/supabase';
import { exampleState } from '../data/example-workspace';
import { snapshotSchema, stateSchema } from '../schema/workspace.schema';
import type {
  AppState,
  WorkspaceRepository,
  WorkspaceSnapshot,
} from '../types/workspace.type';
import { WorkspaceConflictError } from './workspace-repository';

export class CloudWorkspaceRepository implements WorkspaceRepository {
  readonly key: string;
  constructor(private readonly userId: string) {
    this.key = `saving.cloud.workspace.v1:${userId}`;
  }
  private async client() {
    const client = await getSupabase();
    const { data, error } = await client.auth.getSession();
    if (error || data.session?.user.id !== this.userId) {
      throw new Error(
        'Your account changed. Sign in again before accessing this workspace.',
      );
    }
    const [assurance, factors] = await Promise.all([
      client.auth.mfa.getAuthenticatorAssuranceLevel(),
      client.auth.mfa.listFactors(),
    ]);
    if (assurance.error || factors.error) {
      throw new Error('Could not check account security. Please retry.');
    }
    if (
      assurance.data.currentLevel !== 'aal2' &&
      (assurance.data.nextLevel === 'aal2' ||
        factors.data.all.some((factor) => factor.status === 'verified'))
    ) {
      throw new Error(
        'Verify your authenticator in Account before accessing cloud savings.',
      );
    }

    return client;
  }
  async read(): Promise<WorkspaceSnapshot> {
    const client = await this.client();
    const { data, error } = await client
      .from('workspaces')
      .select('state, revision')
      .eq('user_id', this.userId)
      .maybeSingle();
    if (error) {
      throw new Error(
        'Cloud savings could not be loaded. Check your connection and retry.',
      );
    }
    if (!data) {
      // Revision zero is only an unsaved placeholder, never a persisted cloud row.
      return { state: exampleState(), revision: 0 };
    }
    const parsed = snapshotSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(
        'Cloud savings could not be read. Existing cloud data has been preserved.',
      );
    }

    return parsed.data;
  }
  async save(
    state: AppState,
    expectedRevision: number,
  ): Promise<WorkspaceSnapshot> {
    const next = stateSchema.parse({ ...state, version: 2 });
    const client = await this.client();
    const query =
      expectedRevision === 0
        ? client
            .from('workspaces')
            .insert({ user_id: this.userId, state: next })
        : client
            .from('workspaces')
            .update({ state: next })
            .eq('user_id', this.userId)
            .eq('revision', expectedRevision);
    const { data, error } = await query.select('state, revision').maybeSingle();
    if (error?.code === '23505' || (!error && !data)) {
      throw new WorkspaceConflictError();
    }
    if (error) {
      throw new Error(
        error.code === '23514'
          ? 'The workspace exceeds cloud storage limits or has an unsupported format. Your draft has been kept.'
          : 'Cloud save could not be confirmed. Check your connection and retry; your draft has been kept.',
      );
    }

    return snapshotSchema.parse(data);
  }
}
