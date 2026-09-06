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

import { nextSchedule, scheduled } from '../utils/saving.utils';
import { addMonths, currentMonth, monthName } from '../../../lib/dates';
import { money } from '../../../lib/money';
import { AppIcon } from '../../../components/ui/AppIcon';

export function ContributionForm({
  plan,
  month,
  initialScope,
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
      amount:
        initialScope === 'ongoing'
          ? scheduled(plan, month)
          : (plan.overrides[month] ?? scheduled(plan, month)),
      scope: initialScope,
    },
  });
  const { submit, error } = useFormSave(save);
  const chosen = watch('month'),
    scope = watch('scope');
  const hasRecords = plan.entries.some(
    (e) => e.kind === 'contribution' && e.date.startsWith(chosen),
  );

  const upcoming = nextSchedule(plan, chosen);

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <fieldset disabled={isSubmitting}>
        <Field label="Starting month" error={errors.month?.message}>
          <input
            type="month"
            readOnly
            min={plan.start}
            max="2099-12"
            {...register('month')}
          />
        </Field>
        <Field label="Apply change to">
          <select
            {...register('scope', {
              onChange: (event) => {
                if (
                  event.target.value === 'reset' ||
                  event.target.value === 'ongoing'
                ) {
                  setValue('amount', scheduled(plan, chosen), {
                    shouldValidate: true,
                  });
                }
              },
            })}
          >
            <option value="month">This month only</option>
            <option value="ongoing">From this month onward</option>
            <option value="reset">Remove this month’s adjustment</option>
          </select>
        </Field>
        <Field
          label="Monthly saving (MMK)"
          error={errors.amount?.message}
          hint="Use a whole MMK amount. Zero is allowed to pause saving."
        >
          <input
            type="number"
            min={0}
            max={1_000_000_000_000}
            step={1}
            disabled={scope === 'reset'}
            {...register('amount', { valueAsNumber: true })}
          />
        </Field>
        <div className="notice">
          <AppIcon name="info" />
          <span>
            {scope === 'ongoing'
              ? `Applies from ${monthName(chosen)}${upcoming ? ` through ${monthName(addMonths(upcoming.month, -1))}. The existing ${money(upcoming.amount)} MMK schedule starts in ${monthName(upcoming.month)}.` : ' onward, until another schedule change.'} Month adjustments and Saving records still take precedence.`
              : hasRecords
                ? 'This month has Saving records. They take precedence; edit those records to change its contribution.'
                : scope === 'reset'
                  ? 'The scheduled amount will apply again unless Saving records exist.'
                  : `Scheduled contribution: ${money(scheduled(plan, chosen))} MMK. Only this month’s contribution will change.`}
          </span>
        </div>
        {scope === 'ongoing' &&
          (hasRecords || Object.hasOwn(plan.overrides, chosen)) && (
            <p className="notice">
              {hasRecords
                ? 'Saving records will still determine this month’s contribution.'
                : `This month’s ${money(plan.overrides[chosen])} MMK adjustment will stay in place. Remove that adjustment separately to use the new schedule this month.`}
            </p>
          )}
        {scope === 'ongoing' && chosen < currentMonth() && (
          <p className="notice">
            This starts in a past month. Saving will recalculate balances from
            that month onward.
          </p>
        )}
      </fieldset>
      <FormActions
        busy={isSubmitting}
        error={error}
        cancel={cancel}
        disabled={hasRecords && scope !== 'ongoing'}
      />
    </form>
  );
}
