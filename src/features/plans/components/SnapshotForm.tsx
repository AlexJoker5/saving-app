import type { SnapshotFormProps, SnapshotValues } from '../types/plan.type';

import { nameSchema } from '../schema/plan.schema';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field } from '../../../components/ui/Field';
import { FormActions } from '../../../components/ui/FormActions';
import { useFormSave } from '../../../hooks/useFormSave';

export function SnapshotForm({
  save,
  cancel,
  mode = 'snapshot',
  initialName = '',
}: SnapshotFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SnapshotValues>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: initialName },
  });
  const { submit, error } = useFormSave(async (value: SnapshotValues) =>
    save(value.name),
  );

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <fieldset disabled={isSubmitting}>
        <Field label="Plan name" error={errors.name?.message}>
          <input
            maxLength={40}
            placeholder="What if I get a raise?"
            {...register('name')}
          />
        </Field>
        <p className="notice">
          {mode === 'snapshot'
            ? 'Copies the selected plan’s entire timeline. Later changes to either plan stay independent.'
            : 'Changes the name only. Balances, records, and schedules stay the same.'}
        </p>
      </fieldset>
      <FormActions
        busy={isSubmitting}
        error={error}
        cancel={cancel}
        label={mode === 'snapshot' ? 'Create snapshot' : 'Save name'}
      />
    </form>
  );
}
