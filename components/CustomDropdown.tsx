'use client'

import { useState, useRef, useEffect } from 'react'

interface DropdownOption {
  value: string
  label: string
}

interface CustomDropdownProps {
  options: DropdownOption[]
  value: string | string[]
  onChange: (value: string | string[]) => void
  placeholder?: string
  multiSelect?: boolean
  darkMode?: boolean
  className?: string
}

export default function CustomDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  multiSelect = false,
  darkMode = false,
  className = ''
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleOptionClick = (optionValue: string) => {
    if (multiSelect) {
      const currentValues = Array.isArray(value) ? value : []
      const newValues = currentValues.includes(optionValue)
        ? currentValues.filter(v => v !== optionValue)
        : [...currentValues, optionValue]
      onChange(newValues)
      // Don't close dropdown for multi-select
    } else {
      onChange(optionValue)
      setIsOpen(false) // Close dropdown for single-select
    }
  }

  const getDisplayText = () => {
    if (multiSelect) {
      const currentValues = Array.isArray(value) ? value : []
      if (currentValues.length === 0) return placeholder
      if (currentValues.length === 1) {
        const option = options.find(opt => opt.value === currentValues[0])
        return option?.label || currentValues[0]
      }
      return `${currentValues.length} selected`
    } else {
      const stringValue = Array.isArray(value) ? value[0] || '' : value
      const option = options.find(opt => opt.value === stringValue)
      return option?.label || placeholder
    }
  }

  const isSelected = (optionValue: string) => {
    if (multiSelect) {
      const currentValues = Array.isArray(value) ? value : []
      return currentValues.includes(optionValue)
    } else {
      const stringValue = Array.isArray(value) ? value[0] || '' : value
      return stringValue === optionValue
    }
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full border rounded-md px-3 py-2 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between ${
          darkMode 
            ? 'bg-gray-700 border-gray-600 text-white' 
            : 'bg-white border-gray-300 text-gray-900'
        }`}
      >
        <span className="block truncate text-sm">
          {getDisplayText()}
        </span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''} ${
            darkMode ? 'text-gray-400' : 'text-gray-400'
          }`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className={`absolute z-10 mt-1 w-full shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-opacity-5 overflow-auto focus:outline-none ${
          darkMode 
            ? 'bg-gray-800 ring-gray-600' 
            : 'bg-white ring-black'
        }`}>
          {options.map((option) => (
            <div
              key={option.value}
              className={`cursor-pointer select-none relative py-2 pl-3 pr-9 text-sm ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
              }`}
              onClick={() => handleOptionClick(option.value)}
            >
              <div className="flex items-center">
                <span className={`font-normal block truncate ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {option.label}
                </span>
                {isSelected(option.value) && (
                  <span className="text-blue-600 absolute inset-y-0 right-0 flex items-center pr-4">
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}