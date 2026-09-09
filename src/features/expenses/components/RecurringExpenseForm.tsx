import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field } from '../../../components/ui/Field';
import { FormActions } from '../../../components/ui/FormActions';
import { useFormSave } from '../../../hooks/useFormSave';
import {
  recurringFormSchema,
  recurringLabels,
} from '../schema/recurring-expense.schema';
import type {
  RecurringExpense,
  RecurringValues,
} from '../types/recurring-expense.type';
import type { Plan } from '../../plans/types/plan.type';
import {
  recurringDefault,
  recurringTerms,
  recurringOccurrences,
  saveRecurringExpense,
} from '../utils/recurring-expense.utils';
import { useWorkspaceContext } from '../../workspace/hooks/useWorkspaceContext';
import { projectedMonth } from '../../plans/utils/projection.utils';
import { monthName } from '../../../lib/dates';
import { shiftMonth } from '../../../lib/display-month';
import { money } from '../../../lib/money';

export function RecurringExpenseForm({
  plan,
  rule,
  ruleId,
  month,
  save,
  cancel,
}: {
  plan: Plan;
  rule?: RecurringExpense;
  ruleId: string;
  month: string;
  save: (values: RecurringValues) => Promise<void>;
  cancel: () => void;
}) {
  const { state } = useWorkspaceContext();
  const initialMonth =
    month < (rule?.start ?? plan.start) ? (rule?.start ?? plan.start) : month;
  const initial = rule ? recurringTerms(rule, initialMonth) : undefined;
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RecurringValues>({
    resolver: zodResolver(recurringFormSchema),
    defaultValues: {
      name: initial?.name ?? '',
      amount: initial?.amount ?? 0,
      day: initial?.day ?? 1,
      label: initial?.label ?? 'Bills',
      source: initial?.source ?? 'budget',
      month: initialMonth,
      scope: rule ? 'month' : 'ongoing',
    },
  });
  const values = watch();
  const { submit, error } = useFormSave(save);
  const loadTerms = (month: string, scope: RecurringValues['scope']) => {
    if (!rule) {
      return;
    }
    const terms =
      scope === 'month'
        ? recurringTerms(rule, month)
        : recurringDefault(rule, month);
    if (terms) {
      setValue('name', terms.name);
      setValue('amount', terms.amount);
      setValue('day', terms.day);
      setValue('label', terms.label);
      setValue('source', terms.source);
    }
  };
  let preview: Plan | undefined;
  const parsed = recurringFormSchema.safeParse(values);
  if (parsed.success) {
    try {
      preview = saveRecurringExpense(
        state,
        plan.id,
        ruleId,
        parsed.data,
        Boolean(rule),
      ).plans.find((item) => item.id === plan.id);
    } catch {
      /* Invalid drafts have no financial preview. */
    }
  }
  const hasOverride = Boolean(
    rule && Object.hasOwn(rule.overrides, values.month),
  );
  const futureExceptions = rule
    ? Object.keys(rule.overrides).filter((month) => month >= values.month)
        .length
    : 0;

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <p className="notice">
        {plan.name} ·{' '}
        {plan.id === state.mainId
          ? 'Main expenses and balances update together.'
          : 'Changes stay in this independent plan.'}
      </p>
      {!rule && (
        <p className="muted">
          Existing one-off expenses stay separate. Start after months you
          already recorded to avoid counting the same expense twice.
        </p>
      )}
      <fieldset disabled={isSubmitting}>
        {rule && (
          <Field label="Apply change">
            <select
              {...register('scope', {
                onChange: (event) =>
                  loadTerms(values.month, event.target.value),
              })}
            >
              <option value="month">This month only</option>
              <option value="ongoing">From this month onward</option>
              <option value="reset">Use monthly default again</option>
            </select>
          </Field>
        )}
        <Field
          label={rule ? 'Month' : 'Starts in'}
          error={errors.month?.message}
        >
          <input
            type="month"
            min={rule?.start ?? plan.start}
            max="2099-12"
            {...register('month', {
              onChange: (event) => loadTerms(event.target.value, values.scope),
            })}
          />
        </Field>
        <fieldset disabled={values.scope === 'reset'}>
          <Field label="Expense name" error={errors.name?.message}>
            <input
              maxLength={80}
              placeholder="e.g. Rent"
              {...register('name')}
            />
          </Field>
          <Field
            label="Monthly amount · MMK"
            error={errors.amount?.message}
            hint={
              rule
                ? 'Use 0 to skip this month, or pause from this month onward.'
                : undefined
            }
          >
            <input
              className="amount-input"
              type="number"
              inputMode="numeric"
              min={0}
              max={1_000_000_000_000}
              step={1}
              {...register('amount', { valueAsNumber: true })}
            />
          </Field>
          <div className="form-grid">
            <Field label="Paid from" error={errors.source?.message}>
              <select {...register('source')}>
                <option value="budget">Monthly budget</option>
                <option value="savings">Savings in this plan</option>
              </select>
            </Field>
            <Field label="Label" error={errors.label?.message}>
              <select {...register('label')}>
                {recurringLabels.map((label) => (
                  <option key={label}>{label}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field
            label="Day of month"
            error={errors.day?.message}
            hint="For shorter months, use the last day of the month."
          >
            <input
              type="number"
              min={1}
              max={31}
              step={1}
              {...register('day', { valueAsNumber: true })}
            />
          </Field>
        </fieldset>
        <p className="notice">
          {values.scope === 'reset'
            ? 'Removes this month’s exception. The monthly default applies again.'
            : values.scope === 'month'
              ? 'Changes only this month. Later balances recalculate; other months keep their expense amounts.'
              : 'Replaces defaults from this month onward, including later scheduled defaults. Earlier months stay unchanged.'}
        </p>
        {values.scope === 'ongoing' && futureExceptions > 0 && (
          <p className="notice">
            {futureExceptions} month-only exception
            {futureExceptions === 1 ? '' : 's'} remain in place, including
            skipped months. Reset an exception to apply the new default there.
          </p>
        )}
        {values.scope === 'reset' && !hasOverride && (
          <p className="muted">This month already uses the default.</p>
        )}
        {preview && (
          <section
            className="panel recurring-preview"
            aria-label="Recurring expense preview"
          >
            <h2>Preview</h2>
            <dl className="breakdown">
              <div>
                <dt>{monthName(values.month)} recurring budget spending</dt>
                <dd>
                  {money(
                    recurringOccurrences(preview, values.month)
                      .filter((expense) => expense.source === 'budget')
                      .reduce((sum, expense) => sum + expense.amount, 0),
                  )}{' '}
                  MMK
                </dd>
              </div>
              {[values.month, shiftMonth(values.month, 1)].map((month) => (
                <div key={month}>
                  <dt>{monthName(month)} closing balance</dt>
                  <dd>
                    {money(
                      projectedMonth(plan, month)?.closing ?? plan.opening,
                    )}{' '}
                    →{' '}
                    {money(
                      projectedMonth(preview, month)?.closing ?? plan.opening,
                    )}{' '}
                    MMK
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </fieldset>
      <FormActions
        busy={isSubmitting}
        disabled={values.scope === 'reset' && !hasOverride}
        error={error}
        cancel={cancel}
        label={rule ? 'Save adjustment' : 'Save recurring expense'}
      />
    </form>
  );
}
