import { NextRequest, NextResponse } from 'next/server'
import { Octokit } from '@octokit/rest'

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const org = searchParams.get('org') || 'All-Hands-AI'

    // Fetch repositories for the organization
    const { data: repositories } = await octokit.rest.repos.listForOrg({
      org,
      type: 'public',
      sort: 'updated',
      per_page: 50,
    })

    // Filter and format repositories
    const formattedRepos = repositories
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
      .sort((a, b) => b.stargazers_count - a.stargazers_count) // Sort by stars

    return NextResponse.json({
      repositories: formattedRepos,
      total: formattedRepos.length,
    })
  } catch (error) {
    console.error('Error fetching repositories:', error)
    
    // Return fallback data if API fails
    const fallbackRepos = [
      {
        id: 1,
        name: 'OpenHands',
        full_name: 'All-Hands-AI/OpenHands',
        description: 'OpenHands: Code Less, Make More',
        stargazers_count: 35000,
        language: 'Python',
        updated_at: new Date().toISOString(),
        html_url: 'https://github.com/All-Hands-AI/OpenHands',
      },
      {
        id: 2,
        name: 'agent-sdk',
        full_name: 'All-Hands-AI/agent-sdk',
        description: 'SDK for building AI agents',
        stargazers_count: 500,
        language: 'TypeScript',
        updated_at: new Date().toISOString(),
        html_url: 'https://github.com/All-Hands-AI/agent-sdk',
      },
    ]

    return NextResponse.json({
      repositories: fallbackRepos,
      total: fallbackRepos.length,
      error: 'Using fallback data due to API error',
    })
  }
}

export const dynamic = 'force-dynamic'