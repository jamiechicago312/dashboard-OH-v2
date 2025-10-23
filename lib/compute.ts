import { PR, Review, KPIs, ReviewStatsResponse } from './types';
import { config } from './config';
import { isEmployee } from './employees';

export function computeFirsts(pr: any, employeesSet: Set<string>): {
  firstHumanResponseAt?: string;
  firstReviewAt?: string;
} {
  const reviews = pr.reviews?.nodes || [];
  
  // Sort reviews by submission time
  const sortedReviews = reviews
    .filter((review: any) => review.submittedAt)
    .sort((a: any, b: any) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
  
  // First review by anyone
  const firstReviewAt = sortedReviews.length > 0 ? sortedReviews[0].submittedAt : undefined;
  
  // First review by an employee (human response)
  const firstEmployeeReview = sortedReviews.find((review: any) => 
    review.author?.login && isEmployee(review.author.login, employeesSet)
  );
  const firstHumanResponseAt = firstEmployeeReview?.submittedAt;
  
  return { firstHumanResponseAt, firstReviewAt };
}

export function computeFlags(
  pr: any,
  firstHumanResponseAt?: string,
  firstReviewAt?: string
): {
  ageHours: number;
  needsFirstResponse: boolean;
  overdueFirstResponse: boolean;
  overdueFirstReview: boolean;
} {
  const now = new Date();
  const createdAt = new Date(pr.createdAt);
  const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  
  const needsFirstResponse = !firstHumanResponseAt;
  const overdueFirstResponse = needsFirstResponse && ageHours > config.sla.firstResponseHours;
  const overdueFirstReview = !firstReviewAt && ageHours > config.sla.firstReviewHours;
  
  return {
    ageHours: Math.round(ageHours * 10) / 10, // Round to 1 decimal
    needsFirstResponse,
    overdueFirstResponse,
    overdueFirstReview,
  };
}

export function transformPR(rawPR: any, employeesSet: Set<string>): PR {
  const { firstHumanResponseAt, firstReviewAt } = computeFirsts(rawPR, employeesSet);
  const flags = computeFlags(rawPR, firstHumanResponseAt, firstReviewAt);
  
  // Extract requested reviewers
  const requestedReviewers = {
    users: rawPR.reviewRequests?.nodes
      ?.filter((req: any) => req.requestedReviewer?.__typename === 'User')
      ?.map((req: any) => req.requestedReviewer.login) || [],
    teams: rawPR.reviewRequests?.nodes
      ?.filter((req: any) => req.requestedReviewer?.__typename === 'Team')
      ?.map((req: any) => req.requestedReviewer.slug) || [],
  };
  
  // Transform reviews
  const reviews: Review[] = rawPR.reviews?.nodes?.map((review: any) => ({
    authorLogin: review.author?.login || 'unknown',
    state: review.state,
    submittedAt: review.submittedAt,
  })) || [];
  
  return {
    repo: `${rawPR.repository?.owner?.login || 'unknown'}/${rawPR.repository?.name || 'unknown'}`,
    number: rawPR.number,
    title: rawPR.title,
    url: rawPR.url,
    authorLogin: rawPR.author?.login || 'unknown',
    authorAssociation: rawPR.authorAssociation,
    isEmployeeAuthor: isEmployee(rawPR.author?.login || '', employeesSet),
    isDraft: rawPR.isDraft,
    createdAt: rawPR.createdAt,
    updatedAt: rawPR.updatedAt,
    labels: rawPR.labels?.nodes?.map((label: any) => label.name) || [],
    requestedReviewers,
    reviews,
    firstHumanResponseAt,
    firstReviewAt,
    ...flags,
  };
}

export function computeKpis(allPrs: PR[]): KPIs {
  const communityPrs = allPrs.filter(pr => !pr.isEmployeeAuthor);
  const nonDraftPrs = allPrs.filter(pr => !pr.isDraft);
  
  // Calculate medians
  const communityPrsWithResponse = communityPrs.filter(pr => pr.firstHumanResponseAt);
  const communityPrsWithReview = communityPrs.filter(pr => pr.firstReviewAt);
  
  const tffrTimes = communityPrsWithResponse.map(pr => {
    const created = new Date(pr.createdAt).getTime();
    const responded = new Date(pr.firstHumanResponseAt!).getTime();
    return (responded - created) / (1000 * 60 * 60); // hours
  }).sort((a, b) => a - b);
  
  const ttfrTimes = communityPrsWithReview.map(pr => {
    const created = new Date(pr.createdAt).getTime();
    const reviewed = new Date(pr.firstReviewAt!).getTime();
    return (reviewed - created) / (1000 * 60 * 60); // hours
  }).sort((a, b) => a - b);
  
  const median = (arr: number[]) => {
    if (arr.length === 0) return undefined;
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 === 0 ? (arr[mid - 1] + arr[mid]) / 2 : arr[mid];
  };
  
  // Calculate reviewer load
  const reviewerLoad: Record<string, number> = {};
  allPrs.forEach(pr => {
    pr.requestedReviewers.users.forEach(reviewer => {
      reviewerLoad[reviewer] = (reviewerLoad[reviewer] || 0) + 1;
    });
  });
  
  // Calculate compliance
  const prsWithAssignedReviewers = nonDraftPrs.filter(pr => pr.requestedReviewers.users.length > 0);
  const assignedReviewerCompliancePct = nonDraftPrs.length > 0 
    ? prsWithAssignedReviewers.length / nonDraftPrs.length 
    : 0;
  
  return {
    openCommunityPrs: communityPrs.length,
    pctCommunityPrs: allPrs.length > 0 ? communityPrs.length / allPrs.length : 0,
    medianTffrHours: median(tffrTimes),
    medianTtfrHours: median(ttfrTimes),
    assignedReviewerCompliancePct,
    reviewerLoad,
  };
}

export function computeDashboardData(allPrs: PR[]): import('./types').DashboardData {
  const communityPrs = allPrs.filter(pr => !pr.isEmployeeAuthor);
  const nonDraftPrs = allPrs.filter(pr => !pr.isDraft);
  
  // Calculate medians
  const communityPrsWithResponse = communityPrs.filter(pr => pr.firstHumanResponseAt);
  const communityPrsWithReview = communityPrs.filter(pr => pr.firstReviewAt);
  
  const tffrTimes = communityPrsWithResponse.map(pr => {
    const created = new Date(pr.createdAt).getTime();
    const responded = new Date(pr.firstHumanResponseAt!).getTime();
    return (responded - created) / (1000 * 60 * 60); // hours
  }).sort((a, b) => a - b);
  
  const ttfrTimes = communityPrsWithReview.map(pr => {
    const created = new Date(pr.createdAt).getTime();
    const reviewed = new Date(pr.firstReviewAt!).getTime();
    return (reviewed - created) / (1000 * 60 * 60); // hours
  }).sort((a, b) => a - b);
  
  const median = (arr: number[]) => {
    if (arr.length === 0) return undefined;
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 === 0 ? (arr[mid - 1] + arr[mid]) / 2 : arr[mid];
  };
  
  const formatTime = (hours?: number) => {
    if (!hours) return 'N/A';
    if (hours < 24) return `${Math.round(hours)}h`;
    return `${Math.round(hours / 24)}d`;
  };
  
  // Calculate reviewer load
  const reviewerCounts: Record<string, number> = {};
  allPrs.forEach(pr => {
    pr.requestedReviewers.users.forEach(reviewer => {
      reviewerCounts[reviewer] = (reviewerCounts[reviewer] || 0) + 1;
    });
  });
  
  const reviewers = Object.entries(reviewerCounts)
    .map(([name, pendingCount]) => ({ name, pendingCount }))
    .sort((a, b) => b.pendingCount - a.pendingCount);
  
  // Calculate compliance
  const prsWithAssignedReviewers = nonDraftPrs.filter(pr => pr.requestedReviewers.users.length > 0);
  const assignedReviewerCompliancePct = nonDraftPrs.length > 0 
    ? (prsWithAssignedReviewers.length / nonDraftPrs.length) * 100
    : 0;
  
  const prsWithoutReviewers = nonDraftPrs.filter(pr => pr.requestedReviewers.users.length === 0);
  const totalPendingReviews = Object.values(reviewerCounts).reduce((sum, count) => sum + count, 0);
  const activeReviewers = Object.keys(reviewerCounts).length;
  
  return {
    kpis: {
      openCommunityPrs: communityPrs.length,
      communityPrPercentage: allPrs.length > 0 ? `${Math.round((communityPrs.length / allPrs.length) * 100)}%` : '0%',
      medianResponseTime: formatTime(median(tffrTimes)),
      medianReviewTime: formatTime(median(ttfrTimes)),
      reviewerCompliance: `${Math.round(assignedReviewerCompliancePct)}%`,
      pendingReviews: totalPendingReviews,
      activeReviewers: activeReviewers,
      prsWithoutReviewers: prsWithoutReviewers.length,
    },
    prs: allPrs,
    reviewers: reviewers,
    lastUpdated: new Date().toISOString(),
  };
}

export function computeReviewStats(allPrs: PR[]): ReviewStatsResponse {
  const nonDraftPrs = allPrs.filter(pr => !pr.isDraft);
  const prsWithoutReviewers = nonDraftPrs.filter(pr => pr.requestedReviewers.users.length === 0);
  
  // Count pending review requests
  const reviewerCounts: Record<string, number> = {};
  allPrs.forEach(pr => {
    pr.requestedReviewers.users.forEach(reviewer => {
      reviewerCounts[reviewer] = (reviewerCounts[reviewer] || 0) + 1;
    });
  });
  
  const pendingReviewRequests = Object.values(reviewerCounts).reduce((sum, count) => sum + count, 0);
  const uniqueReviewersWithPending = Object.keys(reviewerCounts).length;
  
  // Top pending reviewers
  const topPendingReviewers = Object.entries(reviewerCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  return {
    totalOpenPRs: allPrs.length,
    pendingReviewRequests,
    nonDraftPRsWithoutReviewers: prsWithoutReviewers.length,
    topPendingReviewers,
    uniqueReviewersWithPending,
  };
}