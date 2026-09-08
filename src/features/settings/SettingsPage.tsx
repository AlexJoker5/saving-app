import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { UserRound, Cloud, Wallet, Download, ChevronRight } from 'lucide-react';
import { BudgetForm } from './components/BudgetForm';
import { WorkspaceBackup } from '../workspace/components/WorkspaceBackup';
import { WorkspaceRestore } from '../workspace/components/WorkspaceRestore';
import { useWorkspaceContext } from '../workspace/hooks/useWorkspaceContext';
import { routePaths } from '../../routes/routePaths';
import { Modal } from '../../components/ui/Modal';
import { money } from '../../lib/money';
export function SettingsPage() {
  const workspace = useWorkspaceContext();
  const { state, revision, commit } = workspace;
  const [expectedRevision, setExpectedRevision] = useState(revision);
  const [search, setSearch] = useSearchParams();
  const section = search.get('section');
  const close = () => setSearch({});

  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">Make room for tomorrow</p>
        <h1>Settings</h1>
        <p className="muted">Make Saving work for you.</p>
      </div>
      <h2>Your account</h2>
      <div className="list-panel">
        <Link className="navigation-row" to={routePaths.account}>
          <span className="icon-tile">
            <UserRound size={20} />
          </span>
          <span>
            <strong>Account & security</strong>
            <small>Password and Google Authenticator</small>
          </span>
          <ChevronRight size={18} />
        </Link>
        <button
          className="navigation-row"
          onClick={() => setSearch({ section: 'data' })}
        >
          <span className="icon-tile">
            <Cloud size={20} />
          </span>
          <span>
            <strong>Data & connection</strong>
            <small>Your data belongs to your account</small>
          </span>
          <ChevronRight size={18} />
        </button>
      </div>
      <h2>Preferences</h2>
      <div className="list-panel">
        <button
          className="navigation-row"
          onClick={() => setSearch({ section: 'budget' })}
        >
          <span className="icon-tile">
            <Wallet size={20} />
          </span>
          <span>
            <strong>Monthly budget</strong>
            <small>Applies to every month</small>
          </span>
          <b>{money(state.budget)}</b>
          <ChevronRight size={18} />
        </button>
        <button
          className="navigation-row"
          onClick={() => setSearch({ section: 'backups' })}
        >
          <span className="icon-tile">
            <Download size={20} />
          </span>
          <span>
            <strong>Backups & recovery</strong>
            <small>Export or restore your account data</small>
          </span>
          <ChevronRight size={18} />
        </button>
      </div>
      <p className="muted">MMK · Dates use Myanmar time</p>
      {section === 'data' && (
        <Modal title="Data & connection" close={close}>
          <p>
            Your savings, expenses, plans, and goals are saved to your signed-in
            account.
          </p>
          <p className="muted">
            An internet connection is required to load and save your data. If a
            save fails, your form stays open so you can retry.
          </p>
          <button className="button full-width" onClick={close}>
            Done
          </button>
        </Modal>
      )}
      {section === 'budget' && (
        <Modal title="Monthly budget" presentation="form" close={close}>
          <p className="muted">Applies to past, current, and future months.</p>
          <BudgetForm
            budget={state.budget}
            cancel={close}
            save={async (budget) => {
              await commit(
                (current) => ({ ...current, budget }),
                expectedRevision,
                setExpectedRevision,
              );
              close();
            }}
          />
        </Modal>
      )}
      {section === 'backups' && (
        <Modal title="Backups & recovery" presentation="form" close={close}>
          <WorkspaceBackup />
          <WorkspaceRestore workspace={workspace} onRestored={close} />
        </Modal>
      )}
    </>
  );
}
