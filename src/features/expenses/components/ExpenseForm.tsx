import type { ExpenseFormProps, Expense } from '../types/expense.type';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field } from '../../../components/ui/Field';
import { FormActions } from '../../../components/ui/FormActions';
import { useFormSave } from '../../../hooks/useFormSave';

import { expenseSchema, labels } from '../schema/expense.schema';

import { id } from '../../../lib/id';
import { currentMonth, today } from '../../../lib/dates';
import { AppIcon } from '../../../components/ui/AppIcon';

export function ExpenseForm({
  expense,
  start,
  month,
  save,
  cancel,
}: ExpenseFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Expense>({
    resolver: zodResolver(expenseSchema),
    defaultValues: expense ?? {
      id: id(),
      amount: undefined,
      date: month === currentMonth() ? today() : month + '-01',
      label: 'Food & drinks',
      source: 'budget',
      note: '',
    },
  });
  const { submit, error } = useFormSave(async (values: Expense) => {
    if (values.date.slice(0, 7) < start) {
      throw new Error('Choose a date on or after your savings start month.');
    }
    await save(values);
  });
  const label = watch('label'),
    source = watch('source');

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <fieldset disabled={isSubmitting}>
        <Field label="Amount (MMK)" error={errors.amount?.message}>
          <input
            className="amount-input"
            type="number"
            inputMode="numeric"
            placeholder="0"
            min="1"
            max={1_000_000_000_000}
            step={1}
            {...register('amount', { valueAsNumber: true })}
          />
        </Field>
        <div className="form-grid">
          <Field label="Date" error={errors.date?.message}>
            <input
              type="date"
              min={start + '-01'}
              max="2099-12-31"
              {...register('date')}
            />
          </Field>
          <Field label="Label" error={errors.label?.message}>
            <select {...register('label')}>
              {labels.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Paid from" error={errors.source?.message}>
          <select {...register('source')}>
            <option value="budget">This month’s budget</option>
            <option value="savings">Savings</option>
          </select>
        </Field>
        <Field label="Note (optional)" error={errors.note?.message}>
          <input
            placeholder="What was this for?"
            {...register('note')}
            maxLength={160}
          />
        </Field>
        <div className="notice">
          <AppIcon
            name={label === 'Saving' || source === 'savings' ? 'link' : 'info'}
          />
          <span>
            {label === 'Saving'
              ? 'Saving records replace this month’s automatic contribution. They are shown separately from spending.'
              : source === 'savings'
                ? 'This also creates a connected withdrawal in Main savings. Editing or deleting this record updates both.'
                : 'This record counts toward your monthly spending budget.'}
          </span>
        </div>
        <p className="muted">
          Future-dated records are marked Planned and included in this month’s
          totals. Connected savings entries count toward today’s balance when
          their date arrives.
        </p>
      </fieldset>
      <FormActions busy={isSubmitting} error={error} cancel={cancel} />
    </form>
  );
}
