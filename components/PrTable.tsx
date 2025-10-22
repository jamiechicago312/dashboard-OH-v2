import { PR } from '@/lib/types';
import Badge from './Badge';

interface PrTableProps {
  prs: PR[];
  loading?: boolean;
}

export default function PrTable({ prs, loading = false }: PrTableProps) {
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (prs.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-500">No PRs found matching the current filters.</p>
      </div>
    );
  }

  const formatAge = (ageHours: number) => {
    if (ageHours < 24) {
      return `${Math.round(ageHours)}h`;
    }
    return `${Math.round(ageHours / 24)}d`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          Community PRs ({prs.length})
        </h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                PR
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Author
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Age
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reviewers
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {prs.map((pr) => (
              <tr key={`${pr.repo}-${pr.number}`} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <a
                      href={pr.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate max-w-xs"
                      title={pr.title}
                    >
                      {pr.title}
                    </a>
                    <div className="text-xs text-gray-500 mt-1">
                      {pr.repo}#{pr.number}
                    </div>
                    {pr.labels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {pr.labels.slice(0, 3).map((label) => (
                          <Badge key={label} variant="default" className="text-xs">
                            {label}
                          </Badge>
                        ))}
                        {pr.labels.length > 3 && (
                          <Badge variant="default" className="text-xs">
                            +{pr.labels.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="text-sm text-gray-900">{pr.authorLogin}</div>
                    {!pr.isEmployeeAuthor && (
                      <Badge variant="community" className="ml-2">
                        Community
                      </Badge>
                    )}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatAge(pr.ageHours)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(pr.createdAt)}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    {pr.isDraft && (
                      <Badge variant="default">Draft</Badge>
                    )}
                    {pr.needsFirstResponse && (
                      <Badge variant={pr.overdueFirstResponse ? 'overdue' : 'needs-response'}>
                        Needs Response
                      </Badge>
                    )}
                    {!pr.firstReviewAt && pr.overdueFirstReview && (
                      <Badge variant="overdue">
                        Overdue Review
                      </Badge>
                    )}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {pr.requestedReviewers.users.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {pr.requestedReviewers.users.slice(0, 2).map((reviewer) => (
                          <Badge key={reviewer} variant="default">
                            {reviewer}
                          </Badge>
                        ))}
                        {pr.requestedReviewers.users.length > 2 && (
                          <Badge variant="default">
                            +{pr.requestedReviewers.users.length - 2}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">No reviewers</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}