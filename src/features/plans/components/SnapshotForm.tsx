import type { SnapshotFormProps, SnapshotValues } from '../types/plan.type';

import { nameSchema } from '../schema/plan.schema';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field } from '../../../components/ui/Field';
import { FormActions } from '../../../components/ui/FormActions';
import { useFormSave } from '../../../hooks/useFormSave';

export function SnapshotForm({ save, cancel }: SnapshotFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SnapshotValues>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: '' },
  });
  const { submit, error } = useFormSave(async (value: SnapshotValues) =>
    save(value.name),
  );

  return (
    <form onSubmit={handleSubmit(submit)}>
      <Field label="Plan name" error={errors.name?.message}>
        <input placeholder="What if I get a raise?" {...register('name')} />
      </Field>
      <p className="notice">
        Copies the selected plan’s entire timeline. Later changes to either plan
        stay independent.
      </p>
      <FormActions
        busy={isSubmitting}
        error={error}
        cancel={cancel}
        label="Create snapshot"
      />
    </form>
  );
}
