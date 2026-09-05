import type { SetupFormProps, SetupValues } from '../types/settings.type';

import { setupSchema } from '../schema/settings.schema';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field } from '../../../components/ui/Field';
import { FormActions } from '../../../components/ui/FormActions';
import { useFormSave } from '../../../hooks/useFormSave';

import { createBlank } from '../../workspace/utils/workspace.utils';
import { currentMonth } from '../../../lib/dates';

export function SetupForm({ save, cancel }: SetupFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetupValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: { start: currentMonth(), opening: 0, monthly: 0, budget: 0 },
  });
  const { submit, error } = useFormSave(async (value: SetupValues) =>
    save(createBlank(value.start, value.opening, value.monthly, value.budget)),
  );

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <Field label="Start month" error={errors.start?.message}>
        <input type="month" {...register('start')} />
      </Field>
      <Field
        label="Already saved before this month (MMK)"
        error={errors.opening?.message}
      >
        <input
          type="number"
          {...register('opening', { valueAsNumber: true })}
        />
      </Field>
      <Field
        label="Regular monthly saving (MMK)"
        error={errors.monthly?.message}
      >
        <input
          type="number"
          {...register('monthly', { valueAsNumber: true })}
        />
      </Field>
      <Field
        label="Monthly spending budget (MMK)"
        error={errors.budget?.message}
      >
        <input type="number" {...register('budget', { valueAsNumber: true })} />
      </Field>
      <p className="notice">
        This replaces the example workspace with your own empty one. Monthly
        savings apply automatically at the start of each month in Myanmar time.
      </p>
      <FormActions
        busy={isSubmitting}
        error={error}
        cancel={cancel}
        label="Start my savings"
      />
    </form>
  );
}
