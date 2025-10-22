import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { config, validateConfig } from '@/lib/config';
import { cache } from '@/lib/cache';
import { buildEmployeesSet, isCommunityPR } from '@/lib/employees';
import { getOpenPRsGraphQL } from '@/lib/github';
import { transformPR, computeKpis, computeDashboardData } from '@/lib/compute';
import { DashboardResponse, PR } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    validateConfig();
    
    const { searchParams } = new URL(request.url);
    const debug = searchParams.get('debug') === 'true';
    const reposParam = searchParams.get('repos');
    const labelsParam = searchParams.get('labels');
    const ageParam = searchParams.get('age');
    
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
      age: ageParam 
    })}`;
    
    const result = await cache.withCache(cacheKey, config.cache.ttlSeconds, async () => {
      // Build employees set
      const employeesSet = await buildEmployeesSet();
      
      // Get all PRs from target repositories
      const allPrs: PR[] = [];
      
      // If no specific repos provided, we need to discover repos from orgs
      // For MVP, we'll use a hardcoded list of common repos
      const reposToFetch = targetRepos.length > 0 ? targetRepos : [
        'All-Hands-AI/OpenHands',
        'All-Hands-AI/agent-sdk',
      ];
      
      for (const repoPath of reposToFetch) {
        const [owner, repo] = repoPath.split('/');
        if (!owner || !repo) continue;
        
        try {
          const rawPrs = await getOpenPRsGraphQL(owner, repo);
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
      
      // Filter to community PRs by default
      filteredPrs = filteredPrs.filter(pr => isCommunityPR(pr.authorLogin, employeesSet));
      
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
      
      // Compute dashboard data based on all PRs (not just filtered ones)
      const dashboardData = computeDashboardData(allPrs);
      
      // But return filtered PRs for the table
      return {
        ...dashboardData,
        prs: filteredPrs,
        totalPrs: allPrs.length,
        employeeCount: employeesSet.size,
      };
    });
    
    const response = result;
    
    // Add debug info if requested
    if (debug) {
      response.rateLimit = { remaining: 5000, resetAt: new Date().toISOString() }; // Placeholder
      (response as any).debug = {
        totalPrs: result.totalPrs,
        employeeCount: result.employeeCount,
        cacheKey,
        filters: { repos: targetRepos, labels: labelFilters, age: ageParam },
      };
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Dashboard API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}