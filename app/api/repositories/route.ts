import { NextRequest, NextResponse } from 'next/server'
import { Octokit } from '@octokit/rest'

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
})

// Organizations to fetch repositories from
const TARGET_ORGS = ['all-hands-ai', 'openhands']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const specificOrg = searchParams.get('org')

    // Determine which organizations to fetch from
    const orgsToFetch = specificOrg ? [specificOrg] : TARGET_ORGS

    console.log('Fetching repositories from organizations:', orgsToFetch)

    // Fetch repositories from all target organizations
    const allRepositories = []
    
    for (const org of orgsToFetch) {
      try {
        console.log(`Fetching repositories for org: ${org}`)
        const { data: repositories } = await octokit.rest.repos.listForOrg({
          org,
          type: 'public',
          sort: 'updated',
          per_page: 100, // Increased to get more repos
        })

        console.log(`Found ${repositories.length} repositories for ${org}`)
        allRepositories.push(...repositories)
      } catch (orgError) {
        console.error(`Error fetching repositories for org ${org}:`, orgError)
        // Continue with other orgs even if one fails
      }
    }

    // Filter and format repositories
    const formattedRepos = allRepositories
      .filter(repo => !repo.archived && !repo.disabled)
      .map(repo => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        stargazers_count: repo.stargazers_count,
        language: repo.language,
        updated_at: repo.updated_at,
        html_url: repo.html_url,
      }))
      .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0)) // Sort by stars

    console.log(`Total formatted repositories: ${formattedRepos.length}`)

    return NextResponse.json({
      repositories: formattedRepos,
      total: formattedRepos.length,
      organizations: orgsToFetch,
    })
  } catch (error) {
    console.error('Error fetching repositories:', error)
    
    // Return fallback data if API fails
    const fallbackRepos = [
      {
        id: 1,
        name: 'OpenHands',
        full_name: 'all-hands-ai/OpenHands',
        description: 'OpenHands: Code Less, Make More',
        stargazers_count: 35000,
        language: 'Python',
        updated_at: new Date().toISOString(),
        html_url: 'https://github.com/all-hands-ai/OpenHands',
      },
      {
        id: 2,
        name: 'agent-sdk',
        full_name: 'all-hands-ai/agent-sdk',
        description: 'SDK for building AI agents',
        stargazers_count: 500,
        language: 'TypeScript',
        updated_at: new Date().toISOString(),
        html_url: 'https://github.com/all-hands-ai/agent-sdk',
      },
      {
        id: 3,
        name: 'SWE-bench',
        full_name: 'all-hands-ai/SWE-bench',
        description: 'Enhanced fork of SWE-bench, tailored for OpenHands ecosystem',
        stargazers_count: 1000,
        language: 'Python',
        updated_at: new Date().toISOString(),
        html_url: 'https://github.com/all-hands-ai/SWE-bench',
      },
      {
        id: 4,
        name: 'OpenHands-Cloud',
        full_name: 'all-hands-ai/OpenHands-Cloud',
        description: 'All Hands AI OpenHands Self-hosted Cloud',
        stargazers_count: 200,
        language: 'Smarty',
        updated_at: new Date().toISOString(),
        html_url: 'https://github.com/all-hands-ai/OpenHands-Cloud',
      },
    ]

    return NextResponse.json({
      repositories: fallbackRepos,
      total: fallbackRepos.length,
      organizations: TARGET_ORGS,
      error: 'Using fallback data due to API error',
    })
  }
}

export const dynamic = 'force-dynamic'