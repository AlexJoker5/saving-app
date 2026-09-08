import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Plus, Repeat2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { routePaths } from '../../routes/routePaths';
import { currentMonth } from '../../lib/dates';
export function RecurringExpensesPage() {
  const [adding, setAdding] = useState(false);

  return (
    <>
      <Link className="back-link" to={routePaths.expenses}>
        <ArrowLeft size={19} />
        Expenses
      </Link>
      <div className="page-heading">
        <h1>Recurring expenses</h1>
        <p className="muted">
          Your monthly defaults for rent, bills, and more.
        </p>
      </div>
      <section className="panel empty-panel">
        <span className="icon-tile">
          <Repeat2 size={24} />
        </span>
        <h2>Make room for your regular expenses</h2>
        <p className="muted">
          Set a monthly amount once, then adjust one month or change the
          schedule going forward.
        </p>
        <p className="notice">
          Recurring expenses are not available yet. You can explore the form; no
          recurring entries will be saved.
        </p>
        <button className="button" onClick={() => setAdding(true)}>
          <Plus size={18} />
          View recurring expense form
        </button>
      </section>
      {adding && (
        <Modal
          title="New recurring expense"
          presentation="form"
          close={() => setAdding(false)}
        >
          <form onSubmit={(event) => event.preventDefault()}>
            <label className="field">
              <span>Expense name</span>
              <input placeholder="e.g. Rent" />
            </label>
            <label className="field">
              <span>Monthly amount · MMK</span>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="200,000"
              />
            </label>
            <label className="field">
              <span>Paid from</span>
              <select>
                <option>Monthly budget</option>
                <option>Main savings</option>
              </select>
            </label>
            <label className="field">
              <span>Label</span>
              <select>
                <option>Housing</option>
                <option>Bills</option>
                <option>Transport</option>
                <option>Other</option>
              </select>
            </label>
            <label className="field">
              <span>Starts in</span>
              <input type="month" defaultValue={currentMonth()} />
            </label>
            <label className="field">
              <span>Day of month</span>
              <input type="number" min="1" max="31" defaultValue="1" />
            </label>
            <p className="muted">
              For shorter months, use the last day of the month.
            </p>
            <p id="recurring-unavailable" className="notice">
              This form is a design preview. Recurring schedules cannot be saved
              yet.
            </p>
            <button
              className="button full-width"
              disabled
              aria-describedby="recurring-unavailable"
            >
              Save recurring expense
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
