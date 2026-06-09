import * as React from "react"
import { Input as TaroInput, View } from "@tarojs/components"
import { cn } from "@/lib/utils"

export interface InputProps {
  className?: string
  type?: string
  value?: string
  placeholder?: string
  disabled?: boolean
  autoFocus?: boolean
  focus?: boolean
  onInput?: (e: { detail: { value: string } }) => void
  onChange?: (e: { detail: { value: string } }) => void
  onFocus?: (e: unknown) => void
  onBlur?: (e: unknown) => void
  onConfirm?: (e: { detail: { value: string } }) => void
}

const Input = React.forwardRef<unknown, InputProps>(
  (props, ref) => {
    const {
      className,
      type,
      autoFocus,
      focus,
      onFocus,
      onBlur,
      onChange,
      disabled: disabledProp,
      ...rest
    } = props as InputProps & { disabled?: boolean }
    const [isFocused, setIsFocused] = React.useState(false)
    const disabled = !!disabledProp

    React.useEffect(() => {
      if (autoFocus || focus) setIsFocused(true)
    }, [autoFocus, focus])

    return (
      <View
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:border-ring focus-within:ring-4 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
          isFocused &&
            "border-ring ring-4 ring-ring ring-offset-2 ring-offset-background",
          className
        )}
        onTouchStart={() => {
          if (disabled) return
          setIsFocused(true)
        }}
      >
        <TaroInput
          {...({ type, ref, focus: autoFocus || focus } as any)}
          className="w-full flex-1 bg-transparent text-sm text-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 selection:bg-selection selection:text-selection-foreground"
          placeholderClass="text-muted-foreground"
          onFocus={(e: unknown) => {
            setIsFocused(true)
            onFocus?.(e)
          }}
          onBlur={(e: unknown) => {
            setIsFocused(false)
            onBlur?.(e)
          }}
          onChange={onChange as any}
          {...(rest as any)}
        />
      </View>
    )
  }
)
Input.displayName = "Input"

export { Input }
