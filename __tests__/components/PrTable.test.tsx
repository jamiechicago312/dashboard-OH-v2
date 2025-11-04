import { render, screen } from '@testing-library/react'
import PrTable from '@/components/PrTable'
import { PR } from '@/lib/types'

// Mock PR data for testing
const mockPRs: PR[] = [
  {
    repo: 'test-repo',
    number: 1,
    title: 'Test PR 1',
    url: 'https://github.com/test/test-repo/pull/1',
    authorLogin: 'testuser1',
    authorAssociation: 'CONTRIBUTOR',
    authorType: 'community',
    isEmployeeAuthor: false,
    isDraft: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    labels: ['bug'],
    requestedReviewers: { users: ['reviewer1'], teams: [] },
    reviews: [],
    ageHours: 24,
    needsFirstResponse: true,
    overdueFirstResponse: false,
    overdueFirstReview: false,
  },
  {
    repo: 'test-repo',
    number: 2,
    title: 'Test PR 2',
    url: 'https://github.com/test/test-repo/pull/2',
    authorLogin: 'testuser2',
    authorAssociation: 'CONTRIBUTOR',
    authorType: 'community',
    isEmployeeAuthor: false,
    isDraft: false,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    labels: ['feature'],
    requestedReviewers: { users: [], teams: [] },
    reviews: [],
    ageHours: 48,
    needsFirstResponse: false,
    overdueFirstResponse: false,
    overdueFirstReview: false,
  },
]

describe('PrTable', () => {
  it('displays correct row count when no filtering is applied', () => {
    render(<PrTable prs={mockPRs} />)
    
    expect(screen.getByText('2 rows total')).toBeInTheDocument()
  })

  it('displays correct row count with singular form for one row', () => {
    render(<PrTable prs={[mockPRs[0]]} />)
    
    expect(screen.getByText('1 row total')).toBeInTheDocument()
  })

  it('displays filtered vs total count when totalPrs is provided and different from displayed', () => {
    render(<PrTable prs={[mockPRs[0]]} totalPrs={5} />)
    
    expect(screen.getByText('Showing 1 of 5 rows')).toBeInTheDocument()
  })

  it('displays total count when totalPrs equals displayed count', () => {
    render(<PrTable prs={mockPRs} totalPrs={2} />)
    
    expect(screen.getByText('2 rows total')).toBeInTheDocument()
  })

  it('displays empty state message when no PRs are provided', () => {
    render(<PrTable prs={[]} />)
    
    expect(screen.getByText('No PRs found matching the current filters.')).toBeInTheDocument()
  })

  it('displays loading state when loading prop is true', () => {
    render(<PrTable prs={[]} loading={true} />)
    
    // Check for loading animation elements
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('displays PR data correctly in the table', () => {
    render(<PrTable prs={mockPRs} />)
    
    // Check that PR titles are displayed
    expect(screen.getByText('Test PR 1')).toBeInTheDocument()
    expect(screen.getByText('Test PR 2')).toBeInTheDocument()
    
    // Check that authors are displayed
    expect(screen.getByText('testuser1')).toBeInTheDocument()
    expect(screen.getByText('testuser2')).toBeInTheDocument()
  })

  it('applies dark mode styling when darkMode prop is true', () => {
    render(<PrTable prs={mockPRs} darkMode={true} />)
    
    // Check for dark mode classes in the row count display
    const rowCountElement = screen.getByText('2 rows total')
    expect(rowCountElement).toHaveClass('text-gray-400')
  })

  it('applies light mode styling when darkMode prop is false', () => {
    render(<PrTable prs={mockPRs} darkMode={false} />)
    
    // Check for light mode classes in the row count display
    const rowCountElement = screen.getByText('2 rows total')
    expect(rowCountElement).toHaveClass('text-gray-600')
  })
})