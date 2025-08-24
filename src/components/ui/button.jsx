import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import buttonVariants from './buttonVariants'
import { cn } from "@/lib/utils"

const Button = React.forwardRef(function Button(
  { className, variant, size, asChild = false, ...props },
  ref
) {
  const Comp = asChild ? Slot : "button"

  const classes = cn(buttonVariants({ variant, size }), className)

  return (
    <Comp
      ref={ref}
      data-slot="button"
      className={classes}
      {...props} />
  )
})

Button.displayName = 'Button'

export { Button }
