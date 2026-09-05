import type { BudgetFormProps, BudgetValues } from '../types/settings.type';

import { budgetSchema } from '../schema/settings.schema';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field } from '../../../components/ui/Field';
import { FormActions } from '../../../components/ui/FormActions';
import { useFormSave } from '../../../hooks/useFormSave';

export function BudgetForm({ budget, save, cancel }: BudgetFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BudgetValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { budget },
  });
  const { submit, error } = useFormSave(async (v: BudgetValues) =>
    save(v.budget),
  );

  return (
    <form onSubmit={handleSubmit(submit)}>
      <Field
        label="Monthly spending budget (MMK)"
        error={errors.budget?.message}
      >
        <input type="number" {...register('budget', { valueAsNumber: true })} />
      </Field>
      <p className="notice">
        Applies to every month. Going over budget will never withdraw money from
        savings automatically.
      </p>
      <FormActions busy={isSubmitting} error={error} cancel={cancel} />
    </form>
  );
}
