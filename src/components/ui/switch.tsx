import * as React from "react"
import { View } from "@tarojs/components"
import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof View>,
  React.ComponentPropsWithoutRef<typeof View> & {
    checked?: boolean
    defaultChecked?: boolean
    onCheckedChange?: (checked: boolean) => void
    disabled?: boolean
  }
>(({ className, checked, defaultChecked, onCheckedChange, disabled, ...props }, ref) => {
  const [localChecked, setLocalChecked] = React.useState(defaultChecked || false)
  const isControlled = checked !== undefined
  const currentChecked = isControlled ? checked : localChecked

  return (
    <View
      className={cn(
        "inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background [-webkit-tap-highlight-color:transparent]",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      style={{
        backgroundColor: currentChecked ? '#F59E0B' : '#D1D5DB',
      }}
      data-state={currentChecked ? "checked" : "unchecked"}
      hoverClass={
        disabled
          ? undefined
          : "border-ring ring-2 ring-ring ring-offset-2 ring-offset-background"
      }
      {...props}
      ref={ref}
      onClick={(e) => {
        if (disabled) return
        e.stopPropagation()
        const newChecked = !currentChecked
        if (!isControlled) {
            setLocalChecked(newChecked)
        }
        onCheckedChange?.(newChecked)
      }}
    >
      <View
        style={{
          height: '20px',
          width: '20px',
          borderRadius: '50%',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          transform: currentChecked ? 'translateX(20px)' : 'translateX(0)',
          // WeApp 不支持 CSS transition；动画由 Taro hoverClass + 即时 transform 切换完成
        }}
      />
    </View>
  )
})
Switch.displayName = "Switch"

export { Switch }
