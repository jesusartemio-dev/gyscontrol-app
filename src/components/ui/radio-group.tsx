"use client"

import * as React from "react"
import { Circle } from "lucide-react"

import { cn } from "@/lib/utils"

interface RadioGroupProps {
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  children: React.ReactNode
}

interface RadioGroupItemProps {
  value: string
  id?: string
  className?: string
  children: React.ReactNode
  onClick?: () => void
}

const RadioGroupContext = React.createContext<{
  value?: string
  onValueChange?: (value: string) => void
}>({})

const RadioGroup: React.FC<RadioGroupProps> = ({ 
  value, 
  onValueChange, 
  className, 
  children 
}) => {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      <div className={cn("grid gap-2", className)}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  )
}

const RadioGroupItem: React.FC<RadioGroupItemProps> = ({ 
  value, 
  id, 
  className, 
  children, 
  onClick 
}) => {
  const { value: selectedValue, onValueChange } = React.useContext(RadioGroupContext)
  const isSelected = selectedValue === value

  const handleClick = () => {
    onValueChange?.(value)
    onClick?.()
  }

  return (
    <div
      className={cn(
        "flex items-center space-x-2 cursor-pointer",
        className
      )}
      onClick={handleClick}
    >
      <div
        className={cn(
          "aspect-square h-4 w-4 rounded-full border border-primary flex items-center justify-center",
          isSelected ? "bg-primary text-primary-foreground" : "bg-background"
        )}
      >
        {isSelected && <Circle className="h-2.5 w-2.5 fill-current" />}
      </div>
      {children}
    </div>
  )
}

export { RadioGroup, RadioGroupItem }