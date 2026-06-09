import * as React from "react"
import { View, Image } from "@tarojs/components"
import { cn } from "@/lib/utils"

const AvatarContext = React.createContext<{
  status: "loading" | "error" | "loaded"
  setStatus: (status: "loading" | "error" | "loaded") => void
} | null>(null)

const Avatar = React.forwardRef<
  React.ElementRef<typeof View>,
  React.ComponentPropsWithoutRef<typeof View>
>(({ className, ...props }, ref) => {
  const [status, setStatus] = React.useState<"loading" | "error" | "loaded">("loading")
  return (
    <AvatarContext.Provider value={{ status, setStatus }}>
      <View
        ref={ref}
        className={cn(
          "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
          className
        )}
        {...props}
      />
    </AvatarContext.Provider>
  )
})
Avatar.displayName = "Avatar"

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof Image>,
  React.ComponentPropsWithoutRef<typeof Image>
>(({ className, src, ...props }, ref) => {
  const context = React.useContext(AvatarContext)
  
  // 用 Taro Image 自身的 onLoad/onError prop 类型直接推导 handler 参数类型
  // ——避免硬编码 `BaseEventOrig<onLoadEventDetail>` 这种容易被 weapp-tw 升级打碎的类型
  const handleLoad: NonNullable<React.ComponentPropsWithoutRef<typeof Image>['onLoad']> = (e) => {
      context?.setStatus("loaded")
      props.onLoad?.(e)
  }

  const handleError: NonNullable<React.ComponentPropsWithoutRef<typeof Image>['onError']> = (e) => {
      context?.setStatus("error")
      props.onError?.(e)
  }

  return (
    <Image
      ref={ref}
      src={src}
      className={cn(
        "aspect-square h-full w-full", 
        className, 
        context?.status !== "loaded" && "w-0 h-0 opacity-0 absolute"
      )}
      onLoad={handleLoad}
      onError={handleError}
      {...props}
    />
  )
})
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof View>,
  React.ComponentPropsWithoutRef<typeof View>
>(({ className, ...props }, ref) => {
  const context = React.useContext(AvatarContext)
  
  if (context?.status === "loaded") return null

  return (
    <View
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted",
        className
      )}
      {...props}
    />
  )
})
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }
