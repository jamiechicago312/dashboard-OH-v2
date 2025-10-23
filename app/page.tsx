'use client'

import { useState, useEffect } from 'react'
import PrTable from '@/components/PrTable'
import RepositorySelector from '@/components/RepositorySelector'
import LoadingSpinner from '@/components/LoadingSpinner'
import { DashboardData, FilterState } from '@/lib/types'

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    repositories: [],
    labels: [],
    ageRange: 'all',
    status: 'all',
    noReviewers: false,
    limit: 'all',
    draftStatus: 'all'
  })
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({
    repositories: [],
    labels: [],
    ageRange: 'all',
    status: 'all',
    noReviewers: false,
    limit: 'all',
    draftStatus: 'all'
  })

  const fetchData = async (filtersToApply = appliedFilters) => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (filtersToApply.repositories.length > 0) {
        params.append('repos', filtersToApply.repositories.join(','))
      }
      if (filtersToApply.labels.length > 0) {
        params.append('labels', filtersToApply.labels.join(','))
      }
      if (filtersToApply.ageRange !== 'all') {
        params.append('age', filtersToApply.ageRange)
      }
      if (filtersToApply.status && filtersToApply.status !== 'all') {
        params.append('status', filtersToApply.status)
      }
      if (filtersToApply.noReviewers) {
        params.append('noReviewers', 'true')
      }
      if (filtersToApply.limit && filtersToApply.limit !== 'all') {
        params.append('limit', filtersToApply.limit)
      }
      if (filtersToApply.draftStatus && filtersToApply.draftStatus !== 'all') {
        params.append('draftStatus', filtersToApply.draftStatus)
      }

      const response = await fetch(`/api/dashboard?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleClearFilters = () => {
    const clearedFilters = {
      repositories: [],
      labels: [],
      ageRange: 'all',
      status: 'all',
      noReviewers: false,
      limit: 'all',
      draftStatus: 'all'
    }
    setFilters(clearedFilters)
    setAppliedFilters(clearedFilters)
    fetchData(clearedFilters)
  }

  const handleRefresh = () => {
    fetchData()
  }

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header - Matching wireframe exactly */}
      <header className={`${darkMode ? 'bg-gray-800' : 'bg-white'} border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-5">
          <div className="flex justify-between items-center py-4">
            <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              OpenHands PR Review Dashboard
            </div>
            <div className="flex items-center gap-4">
              <RepositorySelector
                value={filters.repositories}
                onChange={(repos) => {
                  const newFilters = { ...filters, repositories: repos }
                  setFilters(newFilters)
                  setAppliedFilters(newFilters)
                  fetchData(newFilters)
                }}
                className="min-w-[200px]"
                darkMode={darkMode}
              />
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className={`px-3 py-1 text-sm ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'} rounded border transition-colors`}
              >
                {darkMode ? '☀️ Light' : '🌙 Dark'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-5">
        {/* KPI Section - Matching wireframe layout */}
        <section className="py-6">
          <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Key Performance Indicators
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-5 shadow-sm`}>
              <h3 className={`text-xs font-semibold uppercase tracking-wide mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Community PRs Open
              </h3>
              <div className={`text-3xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {data?.kpis.openCommunityPrs || 0}
              </div>
              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Non-employee authored</div>
            </div>
            
            <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-5 shadow-sm`}>
              <h3 className={`text-xs font-semibold uppercase tracking-wide mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                % Community PRs
              </h3>
              <div className={`text-3xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {data?.kpis.communityPrPercentage || '0%'}
              </div>
              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Of all open PRs</div>
            </div>
            
            <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-5 shadow-sm`}>
              <h3 className={`text-xs font-semibold uppercase tracking-wide mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Median Time to First Response
              </h3>
              <div className={`text-3xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {data?.kpis.medianResponseTime || 'N/A'}
              </div>
              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Target: ≤24h</div>
            </div>
            
            <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-5 shadow-sm`}>
              <h3 className={`text-xs font-semibold uppercase tracking-wide mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Assigned Reviewer Compliance
              </h3>
              <div className={`text-3xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {data?.kpis.reviewerCompliance || '0%'}
              </div>
              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>PRs with assigned reviewers</div>
            </div>
          </div>
        </section>

        {/* Review Accountability Section - Matching wireframe */}
        <section className="py-6">
          <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Review Accountability
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-5 shadow-sm`}>
              <h3 className={`text-sm font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Current Review Load</h3>
              <div className={`text-3xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {data?.kpis.pendingReviews || 0}
              </div>
              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total pending review requests</div>
            </div>
            
            <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-5 shadow-sm`}>
              <h3 className={`text-sm font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Top Pending Reviewers</h3>
              <ul className="space-y-2 mt-3">
                {data?.reviewers?.slice(0, 4).map((reviewer, index) => (
                  <li key={index} className={`flex justify-between items-center py-2 border-b last:border-b-0 ${darkMode ? 'border-gray-600' : 'border-gray-100'}`}>
                    <span className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{reviewer.name}</span>
                    <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                      {reviewer.pendingCount}
                    </span>
                  </li>
                )) || (
                  <li className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No pending reviewers</li>
                )}
              </ul>
            </div>
            
            <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-5 shadow-sm`}>
              <h3 className={`text-sm font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>PRs Without Reviewers</h3>
              <div className={`text-3xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {data?.kpis.prsWithoutReviewers || 0}
              </div>
              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Need reviewer assignment</div>
            </div>
          </div>
        </section>

        {/* Review Load Distribution Section - Matching wireframe exactly */}
        <section className="py-6">
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-5 shadow-sm`}>
            <h3 className={`text-sm font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Review Load Distribution</h3>
            <div className={`text-xs mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Current assignment fairness across team members</div>
            <div className="space-y-3">
              {data?.reviewers?.slice(0, 5).map((reviewer, index) => {
                const maxCount = Math.max(...(data?.reviewers?.map(r => r.pendingCount) || [1]))
                const percentage = Math.min((reviewer.pendingCount / maxCount) * 100, 100)
                return (
                  <div key={index} className="flex items-center">
                    <div className={`w-24 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{reviewer.name}</div>
                    <div className={`flex-1 mx-3 h-5 rounded-full overflow-hidden relative ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <div 
                        className="h-full rounded-full transition-all duration-300"
                        style={{ 
                          width: `${percentage}%`,
                          background: 'linear-gradient(90deg, #10b981, #f59e0b, #ef4444)'
                        }}
                      ></div>
                    </div>
                    <div className={`text-sm font-semibold min-w-[30px] ${darkMode ? 'text-white' : 'text-gray-900'}`}>{reviewer.pendingCount}</div>
                  </div>
                )
              }) || (
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No reviewer data available</div>
              )}
            </div>
          </div>
        </section>

        {/* Filters Section - Matching wireframe exactly */}
        <section className="py-6">
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-5 shadow-sm`}>
            <h3 className={`text-sm font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-4">
              <div className="flex flex-col">
                <label className={`text-sm font-medium mb-1.5 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Repository</label>
                <RepositorySelector
                  value={filters.repositories}
                  onChange={(repos) => {
                    const newFilters = { ...filters, repositories: repos }
                    setFilters(newFilters)
                    setAppliedFilters(newFilters)
                    fetchData(newFilters)
                  }}
                  className="w-full"
                  darkMode={darkMode}
                />
              </div>
              
              <div className="flex flex-col">
                <label className={`text-sm font-medium mb-1.5 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Age</label>
                <select 
                  className={`px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  value={filters.ageRange}
                  onChange={(e) => {
                    const newFilters = { ...filters, ageRange: e.target.value }
                    setFilters(newFilters)
                    setAppliedFilters(newFilters)
                    fetchData(newFilters)
                  }}
                >
                  <option value="all">All Ages</option>
                  <option value="0-24">0-24 hours</option>
                  <option value="24-48">24-48 hours</option>
                  <option value="48-96">48-96 hours</option>
                  <option value="96+">96+ hours</option>
                </select>
              </div>
              
              <div className="flex flex-col">
                <label className={`text-sm font-medium mb-1.5 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Labels</label>
                <input 
                  type="text" 
                  className={`px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  placeholder="needs-review, bug, feature"
                  value={filters.labels.join(', ')}
                  onChange={(e) => {
                    const labels = e.target.value.split(',').map(l => l.trim()).filter(l => l)
                    const newFilters = { ...filters, labels }
                    setFilters(newFilters)
                    setAppliedFilters(newFilters)
                    fetchData(newFilters)
                  }}
                />
              </div>
              
              <div className="flex flex-col">
                <label className={`text-sm font-medium mb-1.5 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Status</label>
                <select 
                  className={`px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  value={filters.status || 'all'}
                  onChange={(e) => {
                    const newFilters = { ...filters, status: e.target.value }
                    setFilters(newFilters)
                    setAppliedFilters(newFilters)
                    fetchData(newFilters)
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="needs-review">Needs Review</option>
                  <option value="changes-requested">Changes Requested</option>
                  <option value="approved">Approved</option>
                </select>
              </div>
              
              <div className="flex flex-col">
                <label className={`text-sm font-medium mb-1.5 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Draft Status</label>
                <select 
                  className={`px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  value={filters.draftStatus || 'all'}
                  onChange={(e) => {
                    const newFilters = { ...filters, draftStatus: e.target.value }
                    setFilters(newFilters)
                    setAppliedFilters(newFilters)
                    fetchData(newFilters)
                  }}
                >
                  <option value="all">All PRs</option>
                  <option value="drafts">Only Drafts</option>
                  <option value="final">No Drafts (Final)</option>
                </select>
              </div>
              
              <div className="flex flex-col">
                <label className={`text-sm font-medium mb-1.5 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Reviewers</label>
                <div className="flex items-center h-[38px]">
                  <input
                    type="checkbox"
                    id="noReviewers"
                    checked={filters.noReviewers || false}
                    onChange={(e) => {
                      const newFilters = { ...filters, noReviewers: e.target.checked }
                      setFilters(newFilters)
                      setAppliedFilters(newFilters)
                      fetchData(newFilters)
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label 
                    htmlFor="noReviewers" 
                    className={`ml-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
                  >
                    No reviewers assigned
                  </label>
                </div>
              </div>
            </div>
            
            {/* Filter Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleClearFilters}
                className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                  darkMode
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              >
                Clear All
              </button>
            </div>
          </div>
        </section>

        {/* PR Table Section */}
        <section className="py-6">
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg shadow-sm overflow-hidden`}>
            <div className={`px-5 py-4 border-b ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} flex justify-between items-center`}>
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Community Pull Requests</h3>
              <div className="flex items-center gap-2">
                <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Limit:</label>
                <select 
                  className={`px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    darkMode 
                      ? 'bg-gray-600 border-gray-500 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  value={filters.limit || 'all'}
                  onChange={(e) => {
                    const newFilters = { ...filters, limit: e.target.value }
                    setFilters(newFilters)
                    setAppliedFilters(newFilters)
                    fetchData(newFilters)
                  }}
                >
                  <option value="all">All PRs</option>
                  <option value="12">12 PRs</option>
                  <option value="36">36 PRs</option>
                  <option value="96">96 PRs</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <PrTable prs={data?.prs || []} darkMode={darkMode} />
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className={`py-6 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Data refreshed every 2 minutes • 
          <span className="ml-1">
            Last updated: {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : 'Never'}
          </span>
        </footer>
      </div>
    </div>
  )
}