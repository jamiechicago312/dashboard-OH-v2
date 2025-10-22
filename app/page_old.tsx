'use client';

import { useState, useEffect } from 'react';
import KpiCard from '@/components/KpiCard';
import PrTable from '@/components/PrTable';
import Filters from '@/components/Filters';
import LoadingSpinner from '@/components/LoadingSpinner';
import { DashboardResponse, ReviewStatsResponse } from '@/lib/types';

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [reviewStats, setReviewStats] = useState<ReviewStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [repos, setRepos] = useState('');
  const [labels, setLabels] = useState('');
  const [age, setAge] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (repos) params.set('repos', repos);
      if (labels) params.set('labels', labels);
      if (age) params.set('age', age);
      
      // Fetch dashboard data
      const dashboardResponse = await fetch(`/api/dashboard?${params}`);
      if (!dashboardResponse.ok) {
        throw new Error(`Dashboard API error: ${dashboardResponse.status}`);
      }
      const dashboardResult = await dashboardResponse.json();
      
      // Fetch review stats
      const reviewResponse = await fetch('/api/review-stats');
      if (!reviewResponse.ok) {
        throw new Error(`Review stats API error: ${reviewResponse.status}`);
      }
      const reviewResult = await reviewResponse.json();
      
      setDashboardData(dashboardResult);
      setReviewStats(reviewResult);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [repos, labels, age]);

  const formatHours = (hours?: number) => {
    if (hours === undefined) return 'N/A';
    if (hours < 24) return `${Math.round(hours)}h`;
    return `${Math.round(hours / 24)}d`;
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value * 100)}%`;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white border border-red-200 rounded-lg p-6 max-w-md">
          <div className="text-red-600 text-center">
            <h2 className="text-lg font-semibold mb-2">Error Loading Dashboard</h2>
            <p className="text-sm mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                OpenHands PR Review Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Monitor community PRs and review accountability
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {loading && <LoadingSpinner size="sm" />}
              <button
                onClick={fetchData}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Filters
          repos={repos}
          labels={labels}
          age={age}
          onRepoChange={setRepos}
          onLabelChange={setLabels}
          onAgeChange={setAge}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KpiCard
            title="Open Community PRs"
            value={dashboardData?.kpis.openCommunityPrs ?? 0}
            subtitle="PRs from external contributors"
          />
          <KpiCard
            title="Community PR %"
            value={formatPercentage(dashboardData?.kpis.pctCommunityPrs ?? 0)}
            subtitle="Percentage of all open PRs"
          />
          <KpiCard
            title="Median Response Time"
            value={formatHours(dashboardData?.kpis.medianTffrHours)}
            subtitle="Time to first human response"
          />
          <KpiCard
            title="Median Review Time"
            value={formatHours(dashboardData?.kpis.medianTtfrHours)}
            subtitle="Time to first review"
          />
        </div>

        {/* Review Accountability Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <KpiCard
            title="Reviewer Compliance"
            value={formatPercentage(dashboardData?.kpis.assignedReviewerCompliancePct ?? 0)}
            subtitle="Non-draft PRs with assigned reviewers"
          />
          <KpiCard
            title="Pending Reviews"
            value={reviewStats?.pendingReviewRequests ?? 0}
            subtitle="Total review requests awaiting action"
          />
          <KpiCard
            title="Active Reviewers"
            value={reviewStats?.uniqueReviewersWithPending ?? 0}
            subtitle="Reviewers with pending requests"
          />
        </div>

        {/* Top Reviewers by Load */}
        {reviewStats?.topPendingReviewers && reviewStats.topPendingReviewers.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Top Reviewers by Pending Load
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reviewStats.topPendingReviewers.slice(0, 6).map((reviewer) => (
                <div key={reviewer.name} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                  <span className="font-medium text-gray-900">{reviewer.name}</span>
                  <span className="text-sm text-gray-600">{reviewer.count} PRs</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PR Table */}
        <PrTable 
          prs={dashboardData?.prs ?? []} 
          loading={loading}
        />

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-gray-500">
          <p>
            Data refreshed every 2 minutes • 
            {dashboardData?.rateLimit && (
              <span className="ml-1">
                GitHub API: {dashboardData.rateLimit.remaining} requests remaining
              </span>
            )}
          </p>
        </footer>
      </main>
    </div>
  );
}