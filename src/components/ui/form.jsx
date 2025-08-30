import React, { createContext, useContext, useId } from 'react'
import { cn } from '@/lib/utils'
import { Label as BaseLabel } from './input'

const FieldContext = createContext(null)

export function useFormField() {
  const ctx = useContext(FieldContext)
  if (!ctx) throw new Error('useFormField must be used within <FormField> or wrap with <FieldContext.Provider>')
  return ctx
}

export function Form({ className, ...props }) {
  return <form className={cn('space-y-6', className)} {...props} />
}

export function FormItem({ className, ...props }) {
  return <div className={cn('space-y-2', className)} {...props} />
}

export function FormLabel({ className, required, ...props }) {
  // Prefer our Input Label styling, with required asterisk
  return (
    <BaseLabel
      className={cn('text-foreground/90', className)}
      {...props}
    >
      {props.children}
      {required ? <span className="text-destructive ml-0.5">*</span> : null}
    </BaseLabel>
  )
}

export function FormControl({ className, children, ...props }) {
  const { invalid, describedBy, id } = useFormField()
  // Clone children to add aria-* props without forcing a specific input component
  const child = React.isValidElement(children)
    ? React.cloneElement(children, {
        id: children.props.id || id,
        'aria-invalid': invalid || undefined,
        'aria-describedby': [children.props['aria-describedby'], describedBy].filter(Boolean).join(' ') || undefined,
      })
    : children
  return (
    <div className={cn('relative', className)} {...props}>
      {child}
    </div>
  )
}

export function FormDescription({ className, id, ...props }) {
  return (
    <p
      id={id}
      className={cn('text-muted-foreground text-[13px] leading-5', className)}
      {...props}
    />
  )
}

export function FormMessage({ className, id, ...props }) {
  return (
    <p
      id={id}
      role="alert"
      className={cn('text-destructive text-[13px] leading-5', className)}
      {...props}
    />
  )
}

// Convenience wrapper to wire a field with label/description/message
export function FormField({
  name,
  label,
  description,
  message,
  required,
  id: idProp,
  children,
  className,
}) {
  const reactId = useId()
  const id = idProp || `${name || 'field'}-${reactId}`
  const descriptionId = description ? `${id}-description` : undefined
  const messageId = message ? `${id}-message` : undefined
  const describedBy = [descriptionId, messageId].filter(Boolean).join(' ') || undefined
  const invalid = Boolean(message)

  return (
    <FieldContext.Provider value={{ id, name, invalid, describedBy }}>
      <FormItem className={className}>
        {label ? (
          <FormLabel htmlFor={id} required={required}>{label}</FormLabel>
        ) : null}
        <FormControl>
          {/* children should render an input/select/etc. */}
          {typeof children === 'function' ? children({ id, describedBy, invalid }) : children}
        </FormControl>
        {description ? (
          <FormDescription id={descriptionId}>{description}</FormDescription>
        ) : null}
        {message ? (
          <FormMessage id={messageId}>{message}</FormMessage>
        ) : null}
      </FormItem>
    </FieldContext.Provider>
  )
}

export default Form
