import React from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from './form'

export function RHFTextField({ name, label, description, rules, children, required, ...rest }) {
  const { register, formState: { errors } } = useFormContext()
  const error = errors?.[name]?.message
  return (
    <FormField name={name} label={label} description={description} required={required} message={error}>
      {React.cloneElement(children, { ...register(name, rules), ...rest })}
    </FormField>
  )
}

export function RHFControllerField({ name, label, description, rules, required, render }) {
  const { control, formState: { errors } } = useFormContext()
  const error = errors?.[name]?.message
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field }) => (
        <FormField name={name} label={label} description={description} required={required} message={error}>
          {render(field)}
        </FormField>
      )}
    />
  )
}

export function RHFSelectField(props) {
  // expects render with Select primitives wired to field.onChange/value
  return <RHFControllerField {...props} />
}

export function RHFDatePickerField(props) {
  // wrap DatePicker as a controlled component
  return <RHFControllerField {...props} />
}

export default RHFControllerField
