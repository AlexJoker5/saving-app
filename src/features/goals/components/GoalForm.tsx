import type { GoalFormProps, Goal } from '../types/goal.type';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field } from '../../../components/ui/Field';
import { FormActions } from '../../../components/ui/FormActions';
import { useFormSave } from '../../../hooks/useFormSave';

import { goalSchema } from '../schema/goal.schema';

import { id } from '../../../lib/id';
import { currentMonth } from '../../../lib/dates';

export function GoalForm({ goal, save, cancel }: GoalFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Goal>({
    resolver: zodResolver(goalSchema),
    defaultValues: goal ?? {
      id: id(),
      name: '',
      start: currentMonth(),
      note: '',
    },
  });
  const { submit, error } = useFormSave(save);

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <fieldset disabled={isSubmitting}>
        <Field label="What are you saving for?" error={errors.name?.message}>
          <input
            maxLength={60}
            placeholder="A new phone, a trip, a fresh start…"
            {...register('name')}
          />
        </Field>
        <div className="form-grid">
          <Field label="Target amount (MMK)" error={errors.amount?.message}>
            <input
              type="number"
              min={1}
              max={1_000_000_000_000}
              step={1}
              placeholder="3000000"
              {...register('amount', { valueAsNumber: true })}
            />
          </Field>
          <Field label="Start month" error={errors.start?.message}>
            <input
              type="month"
              min="2000-01"
              max="2099-12"
              {...register('start')}
            />
          </Field>
        </div>
        <Field
          label="A note to yourself (optional)"
          error={errors.note?.message}
        >
          <textarea rows={2} maxLength={160} {...register('note')} />
        </Field>
        <p className="notice">
          Goals compare monthly closing balances. Each goal is independent and
          does not reserve or deduct any money.
        </p>
      </fieldset>
      <FormActions busy={isSubmitting} error={error} cancel={cancel} />
    </form>
  );
}
