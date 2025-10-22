import { NextRequest, NextResponse } from 'next/server';
import { config, validateConfig } from '@/lib/config';
import { cache } from '@/lib/cache';
import { buildEmployeesSet, isCommunityPR } from '@/lib/employees';
import { getOpenPRsGraphQL } from '@/lib/github';
import { transformPR, computeKpis, computeDashboardData } from '@/lib/compute';
import { DashboardResponse, PR } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('=== Dashboard API called ===');
  try {
    // Debug: Check if GitHub token is available
    console.log('GitHub token available:', !!process.env.GITHUB_TOKEN);
    console.log('Config orgs:', config.orgs);
    // validateConfig(); // Temporarily disabled for debugging
    
    const { searchParams } = new URL(request.url);
    console.log('Search params:', Object.fromEntries(searchParams.entries()));
    const debug = searchParams.get('debug') === 'true';
    const reposParam = searchParams.get('repos');
    const labelsParam = searchParams.get('labels');
    const ageParam = searchParams.get('age');
    const statusParam = searchParams.get('status');
    
    // Parse filters
    const targetRepos = reposParam 
      ? reposParam.split(',').map(r => r.trim())
      : config.repos.include.length > 0 
        ? config.repos.include 
        : []; // Will auto-discover if empty
    
    const labelFilters = labelsParam 
      ? labelsParam.split(',').map(l => l.trim().toLowerCase())
      : [];
    
    // Create cache key based on filters
    const cacheKey = `dashboard:${JSON.stringify({ 
      orgs: config.orgs, 
      repos: targetRepos, 
      labels: labelFilters, 
      age: ageParam,
      status: statusParam
    })}`;
    
    // Temporarily bypass cache for debugging
    const result = await (async () => {
      // Build employees set
      console.log('Building employees set...');
      const employeesSet = await buildEmployeesSet();
      console.log(`Found ${employeesSet.size} employees`);
      
      // Get all PRs from target repositories
      const allPrs: PR[] = [];
      
      // If no specific repos provided, we need to discover repos from orgs
      // For MVP, we'll use a hardcoded list of common repos
      const reposToFetch = targetRepos.length > 0 ? targetRepos : [
        'All-Hands-AI/OpenHands',
        'All-Hands-AI/agent-sdk',
      ];
      
      console.log('Target repos:', targetRepos);
      console.log('Repos to fetch:', reposToFetch);
      
      for (const repoPath of reposToFetch) {
        const [owner, repo] = repoPath.split('/');
        if (!owner || !repo) continue;
        
        try {
          console.log(`Fetching PRs for ${repoPath}...`);
          const rawPrs = await getOpenPRsGraphQL(owner, repo);
          console.log(`Found ${rawPrs.length} PRs for ${repoPath}`);
          const transformedPrs = rawPrs.map(rawPr => {
            // Add repo info to raw PR for transformation
            rawPr.repository = { owner: { login: owner }, name: repo };
            return transformPR(rawPr, employeesSet);
          });
          
          allPrs.push(...transformedPrs);
        } catch (error) {
          console.error(`Failed to fetch PRs for ${repoPath}:`, error);
          // Continue with other repos
        }
      }
      
      // Apply filters
      let filteredPrs = allPrs;
      
      // Don't filter to community PRs by default - show all PRs
      // Community PR filtering is handled in the compute functions
      
      // Apply label filters if provided
      if (labelFilters.length > 0) {
        filteredPrs = filteredPrs.filter(pr => 
          pr.labels.some(label => labelFilters.includes(label.toLowerCase()))
        );
      }
      
      // Apply age filter if provided
      if (ageParam) {
        const ageRanges = {
          '0-24': [0, 24],
          '24-48': [24, 48],
          '48-96': [48, 96],
          '96+': [96, Infinity],
        };
        
        const range = ageRanges[ageParam as keyof typeof ageRanges];
        if (range) {
          filteredPrs = filteredPrs.filter(pr => 
            pr.ageHours >= range[0] && pr.ageHours < range[1]
          );
        }
      }
      
      // Apply status filter if provided
      if (statusParam && statusParam !== 'all') {
        filteredPrs = filteredPrs.filter(pr => {
          switch (statusParam) {
            case 'needs-review':
              return pr.needsFirstResponse || (!pr.firstReviewAt && !pr.isDraft);
            case 'changes-requested':
              return pr.reviews.some(review => review.state === 'CHANGES_REQUESTED');
            case 'approved':
              return pr.reviews.some(review => review.state === 'APPROVED');
            default:
              return true;
          }
        });
      }
      
      // Compute dashboard data based on all PRs (not just filtered ones)
      const dashboardData = computeDashboardData(allPrs);
      
      // But return filtered PRs for the table
      return {
        ...dashboardData,
        prs: filteredPrs,
        totalPrs: allPrs.length,
        employeeCount: employeesSet.size,
      };
    })();
    
    const response = result;
    
    // Add debug info if requested
    if (debug) {
      (response as any).rateLimit = { remaining: 5000, resetAt: new Date().toISOString() }; // Placeholder
      (response as any).debug = {
        totalPrs: result.totalPrs,
        employeeCount: result.employeeCount,
        cacheKey,
        filters: { repos: targetRepos, labels: labelFilters, age: ageParam },
      };
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('=== Dashboard API error ===', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard data',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack',
      },
      { status: 500 }
    );
  }
}