'use client'

import { useState, useEffect, useRef } from 'react'

interface Repository {
  id: number
  name: string
  full_name: string
  description: string | null
  stargazers_count: number
  language: string | null
}

interface RepositorySelectorProps {
  value: string[]
  onChange: (repos: string[]) => void
  className?: string
  darkMode?: boolean
}

export default function RepositorySelector({ value, onChange, className = '', darkMode = false }: RepositorySelectorProps) {
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchRepositories()
  }, [])

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

  const fetchRepositories = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch OpenHands organization repositories
      const response = await fetch('/api/repositories')
      if (!response.ok) {
        throw new Error('Failed to fetch repositories')
      }
      
      const data = await response.json()
      setRepositories(data.repositories || [])
    } catch (err) {
      console.error('Error fetching repositories:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch repositories')
      // Fallback to default repositories
      setRepositories([
        {
          id: 1,
          name: 'OpenHands',
          full_name: 'All-Hands-AI/OpenHands',
          description: 'OpenHands: Code Less, Make More',
          stargazers_count: 35000,
          language: 'Python'
        },
        {
          id: 2,
          name: 'agent-sdk',
          full_name: 'All-Hands-AI/agent-sdk',
          description: 'SDK for building AI agents',
          stargazers_count: 500,
          language: 'TypeScript'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleRepositoryToggle = (repoFullName: string) => {
    const newValue = value.includes(repoFullName)
      ? value.filter(repo => repo !== repoFullName)
      : [...value, repoFullName]
    onChange(newValue)
    // Don't close dropdown for multi-select - let user select multiple items
  }

  const getDisplayText = () => {
    if (value.length === 0) return 'All Repositories'
    if (value.length === 1) return value[0]
    return `${value.length} repositories selected`
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full border rounded-md px-3 py-2 text-left shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between ${
          darkMode 
            ? 'bg-gray-700 border-gray-600 text-white' 
            : 'bg-white border-gray-300 text-gray-900'
        }`}
      >
        <span className="block truncate">
          {getDisplayText()}
        </span>
        <svg
          className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''} ${
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
          {loading ? (
            <div className={`px-3 py-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Loading repositories...</div>
          ) : error ? (
            <div className="px-3 py-2 text-red-600">Error: {error}</div>
          ) : (
            <>
              <div
                className={`cursor-pointer select-none relative py-2 pl-3 pr-9 ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                }`}
                onClick={() => {
                  onChange([])
                  setIsOpen(false)
                }}
              >
                <div className="flex items-center">
                  <span className={`font-normal block truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>All Repositories</span>
                  {value.length === 0 && (
                    <span className="text-blue-600 absolute inset-y-0 right-0 flex items-center pr-4">
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </div>
              </div>
              
              {repositories.map((repo) => (
                <div
                  key={repo.id}
                  className={`cursor-pointer select-none relative py-2 pl-3 pr-9 ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleRepositoryToggle(repo.full_name)}
                >
                  <div className="flex items-center">
                    <div className="flex-1 min-w-0">
                      <span className={`font-medium block truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{repo.full_name}</span>
                      {repo.description && (
                        <span className={`text-sm block truncate ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{repo.description}</span>
                      )}
                      <div className={`flex items-center gap-2 text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        {repo.language && (
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            {repo.language}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          {repo.stargazers_count.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {value.includes(repo.full_name) && (
                      <span className="text-blue-600 absolute inset-y-0 right-0 flex items-center pr-4">
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}