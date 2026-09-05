import type {
  ContributionFormProps,
  ContributionValues,
} from '../types/saving.type';

import { adjustSchema } from '../schema/saving.schema';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field } from '../../../components/ui/Field';
import { FormActions } from '../../../components/ui/FormActions';
import { useFormSave } from '../../../hooks/useFormSave';

import { scheduled } from '../utils/saving.utils';
import { money } from '../../../lib/money';
import { AppIcon } from '../../../components/ui/AppIcon';

export function ContributionForm({
  plan,
  month,
  save,
  cancel,
}: ContributionFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ContributionValues>({
    resolver: zodResolver(adjustSchema),
    defaultValues: {
      month,
      amount: plan.overrides[month] ?? scheduled(plan, month),
      scope: 'month',
    },
  });
  const { submit, error } = useFormSave(save);
  const chosen = watch('month'),
    scope = watch('scope');
  const hasRecords = plan.entries.some(
    (e) => e.kind === 'contribution' && e.date.startsWith(chosen),
  );

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <Field label="Starting month" error={errors.month?.message}>
        <input type="month" readOnly min={plan.start} {...register('month')} />
      </Field>
      <Field label="Apply change to">
        <select
          {...register('scope', {
            onChange: (event) => {
              if (event.target.value === 'reset') {
                setValue('amount', scheduled(plan, chosen), {
                  shouldValidate: true,
                });
              }
            },
          })}
        >
          <option value="month">This month only</option>
          <option value="reset">Remove this month’s adjustment</option>
        </select>
      </Field>
      <Field
        label="Monthly saving (MMK)"
        error={errors.amount?.message}
        hint="Zero is allowed if you did not save this month."
      >
        <input
          type="number"
          disabled={scope === 'reset'}
          {...register('amount', { valueAsNumber: true })}
        />
      </Field>
      <div className="notice">
        <AppIcon name="info" />
        <span>
          {hasRecords
            ? 'This month has Saving records. They take precedence; edit those records to change its contribution.'
            : scope === 'reset'
              ? 'The scheduled amount will apply again unless Saving records exist.'
              : `Scheduled contribution: ${money(scheduled(plan, chosen))} MMK. Only this month’s contribution will change.`}
        </span>
      </div>
      <FormActions
        busy={isSubmitting}
        error={error}
        cancel={cancel}
        disabled={hasRecords}
      />
    </form>
  );
}
