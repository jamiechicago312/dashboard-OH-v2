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
    ageRange: 'all'
  })

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (filters.repositories.length > 0) {
        params.append('repositories', filters.repositories.join(','))
      }
      if (filters.labels.length > 0) {
        params.append('labels', filters.labels.join(','))
      }
      if (filters.ageRange !== 'all') {
        params.append('ageRange', filters.ageRange)
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
  }, [filters])

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
                onChange={(repos) => setFilters(prev => ({ ...prev, repositories: repos }))}
                className="min-w-[200px]"
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4 uppercase tracking-wide text-sm">
            Key Performance Indicators
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Community PRs Open
              </h3>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {data?.kpis.openCommunityPrs || 0}
              </div>
              <div className="text-xs text-gray-500">Non-employee authored</div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                % Community PRs
              </h3>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {data?.kpis.communityPrPercentage || '0%'}
              </div>
              <div className="text-xs text-gray-500">Of all open PRs</div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Median Time to First Response
              </h3>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {data?.kpis.medianResponseTime || 'N/A'}
              </div>
              <div className="text-xs text-gray-500">Target: ≤24h</div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Assigned Reviewer Compliance
              </h3>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {data?.kpis.reviewerCompliance || '0%'}
              </div>
              <div className="text-xs text-gray-500">PRs with assigned reviewers</div>
            </div>
          </div>
        </section>

        {/* Review Accountability Section - Matching wireframe */}
        <section className="py-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 uppercase tracking-wide text-sm">
            Review Accountability
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Current Review Load</h3>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {data?.kpis.pendingReviews || 0}
              </div>
              <div className="text-xs text-gray-500">Total pending review requests</div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Top Pending Reviewers</h3>
              <ul className="space-y-2 mt-3">
                {data?.reviewers?.slice(0, 4).map((reviewer, index) => (
                  <li key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="font-medium text-sm">{reviewer.name}</span>
                    <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                      {reviewer.pendingCount}
                    </span>
                  </li>
                )) || (
                  <li className="text-gray-500 text-sm">No pending reviewers</li>
                )}
              </ul>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">PRs Without Reviewers</h3>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {data?.kpis.prsWithoutReviewers || 0}
              </div>
              <div className="text-xs text-gray-500">Need reviewer assignment</div>
            </div>
          </div>
        </section>

        {/* Fairness Indicator Section - From wireframe */}
        <section className="py-6">
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Review Load Fairness</h3>
            <div className="space-y-3">
              {data?.reviewers?.slice(0, 5).map((reviewer, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-24 text-sm font-medium text-gray-700">{reviewer.name}</div>
                  <div className="flex-1 mx-3 h-5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((reviewer.pendingCount / Math.max(...(data?.reviewers?.map(r => r.pendingCount) || [1]))) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">{reviewer.pendingCount}</div>
                </div>
              )) || (
                <div className="text-gray-500 text-sm">No reviewer data available</div>
              )}
            </div>
          </div>
        </section>

        {/* PR Table Section */}
        <section className="py-6">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-5 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Community Pull Requests</h3>
            </div>
            <div className="overflow-x-auto">
              <PrTable prs={data?.prs || []} />
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-6 text-center text-sm text-gray-500">
          Data refreshed every 2 minutes • 
          <span className="ml-1">
            Last updated: {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : 'Never'}
          </span>
        </footer>
      </div>
    </div>
  )
}