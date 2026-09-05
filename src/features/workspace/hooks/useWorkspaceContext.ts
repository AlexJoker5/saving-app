import { useOutletContext } from 'react-router';
import type { WorkspaceContext } from '../types/workspace.type';

export function useWorkspaceContext() {
  return useOutletContext<WorkspaceContext>();
}
