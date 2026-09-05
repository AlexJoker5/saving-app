import type {
  MoneyEntryFormProps,
  MoneyEntryValues,
} from '../types/saving.type';

import { moneyEntrySchema } from '../schema/saving.schema';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field } from '../../../components/ui/Field';
import { FormActions } from '../../../components/ui/FormActions';
import { useFormSave } from '../../../hooks/useFormSave';

import { currentMonth, today } from '../../../lib/dates';
import { id } from '../../../lib/id';

export function MoneyEntryForm({
  entry,
  month,
  start,
  kind,
  save,
  cancel,
}: MoneyEntryFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MoneyEntryValues>({
    resolver: zodResolver(moneyEntrySchema),
    defaultValues: entry ?? {
      date: month === currentMonth() ? today() : month + '-01',
      note: '',
    },
  });
  const { submit, error } = useFormSave(async (value: MoneyEntryValues) => {
    if (value.date.slice(0, 7) < start) {
      throw new Error('This date is before the plan starts.');
    }
    await save({
      ...value,
      id: entry?.id ?? id(),
      kind,
      ...(entry?.expenseId ? { expenseId: entry.expenseId } : {}),
    });
  });

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <Field label="Amount (MMK)" error={errors.amount?.message}>
        <input
          className="amount-input"
          type="number"
          placeholder="0"
          {...register('amount', { valueAsNumber: true })}
        />
      </Field>
      <Field label="Date" error={errors.date?.message}>
        <input type="date" min={start + '-01'} {...register('date')} />
      </Field>
      <Field label="Reason" error={errors.note?.message}>
        <input
          placeholder={
            kind === 'extra'
              ? 'A gift, bonus, or something unexpected'
              : 'What are you using this money for?'
          }
          {...register('note')}
        />
      </Field>
      <FormActions busy={isSubmitting} error={error} cancel={cancel} />
    </form>
  );
}
