import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { connectionRouter, getSupabase } from '../../../lib/supabase';
import type { ConnectionSnapshot } from '../types/connectionTypes';
import { WorkspaceShell } from '../../workspace/components/WorkspaceShell';
import { Modal } from '../../../components/ui/Modal';

const idle: ConnectionSnapshot = { phase: 'ready', route: null, message: '' };
const idleSubscribe = () => () => {};
const getIdle = () => idle;

export function ConnectionBoundary({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(
    connectionRouter?.subscribe ?? idleSubscribe,
    connectionRouter?.getSnapshot ?? getIdle,
  );
  const [initialized, setInitialized] = useState(!connectionRouter);
  const [initializationError, setInitializationError] = useState('');

  useEffect(() => {
    if (!connectionRouter) {
      return;
    }
    let active = true;
    void getSupabase()
      .then(() => {
        if (active) {
          setInitialized(true);
        }
      })
      .catch(() => {
        if (active) {
          setInitializationError(
            'Could not initialize your connection. Please retry.',
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const retry = () => {
    setInitializationError('');
    void connectionRouter
      ?.initialize()
      .then(() => getSupabase())
      .then(() => {
        setInitialized(true);
        // SWR revalidates failed reads. Financial writes are never replayed.
        window.dispatchEvent(new Event('online'));
      })
      .catch(() => {
        setInitializationError(
          'Could not initialize your connection. Please retry.',
        );
      });
  };
  const failed = snapshot.phase === 'error' || Boolean(initializationError);
  const status = (
    <div role={failed ? 'alert' : 'status'}>
      <p>
        {snapshot.message ||
          initializationError ||
          'Preparing your connection…'}
      </p>
      {failed && (
        <button className="button" onClick={retry}>
          Retry connection
        </button>
      )}
    </div>
  );
  if (!initialized) {
    return (
      <WorkspaceShell>
        <section className="panel">
          <h1>Connecting to Saving</h1>
          {status}
        </section>
      </WorkspaceShell>
    );
  }
  const blocked = snapshot.phase !== 'ready';

  return (
    <>
      <div inert={blocked}>{children}</div>
      {blocked && (
        <Modal title="Saving connection" dismissible={false} close={() => {}}>
          {status}
        </Modal>
      )}
    </>
  );
}
