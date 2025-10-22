export type ReviewState = 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED';

export type Review = {
  authorLogin: string;
  state: ReviewState;
  submittedAt: string;
};

export type RequestedReviewers = {
  users: string[];
  teams: string[];
};

export type PR = {
  repo: string;
  number: number;
  title: string;
  url: string;
  authorLogin: string;
  authorAssociation: string;
  isEmployeeAuthor: boolean;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  labels: string[];
  requestedReviewers: RequestedReviewers;
  reviews: Review[];
  firstHumanResponseAt?: string;
  firstReviewAt?: string;
  ageHours: number;
  needsFirstResponse: boolean;
  overdueFirstResponse: boolean;
  overdueFirstReview: boolean;
};

export type KPIs = {
  openCommunityPrs: number;
  pctCommunityPrs: number;
  medianTffrHours?: number;
  medianTtfrHours?: number;
  assignedReviewerCompliancePct: number;
  reviewerLoad: Record<string, number>;
};

export type DashboardResponse = {
  kpis: KPIs;
  prs: PR[];
  rateLimit?: { remaining: number; resetAt: string };
};

export type ReviewStatsResponse = {
  totalOpenPRs: number;
  pendingReviewRequests: number;
  nonDraftPRsWithoutReviewers: number;
  topPendingReviewers: Array<{ name: string; count: number }>;
  uniqueReviewersWithPending: number;
};

export type EmployeeOverrides = {
  allowlist: string[];
  denylist: string[];
};

export type GitHubRateLimit = {
  remaining: number;
  resetAt: string;
};