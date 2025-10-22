#!/usr/bin/env python3
"""
Script to analyze pending reviews and PRs without reviewers in the OpenHands repository.

This script:
1. Finds people with the most pending review requests
2. Identifies non-draft PRs that have no reviewers assigned

Usage:
    python pr_review_analysis.py [--repo OWNER/REPO] [--token TOKEN]

    Or set the GITHUB_TOKEN environment variable:
    export GITHUB_TOKEN=your_token_here
    python pr_review_analysis.py

Requirements:
    pip install requests
"""

import argparse
import os
import sys
from collections import defaultdict
from typing import Dict, List, Optional

import requests


def get_headers(token: Optional[str] = None) -> Dict[str, str]:
    """
    Get headers for GitHub API requests.

    Args:
        token: Optional GitHub personal access token

    Returns:
        Dictionary of headers
    """
    headers = {"Accept": "application/vnd.github.v3+json"}
    if token:
        headers["Authorization"] = f"token {token}"
    return headers


def get_open_prs(repo_owner: str, repo_name: str, token: Optional[str] = None) -> List[Dict]:
    """
    Fetch all open pull requests from the repository.

    Args:
        repo_owner: GitHub repository owner
        repo_name: GitHub repository name
        token: Optional GitHub personal access token

    Returns:
        List of pull request dictionaries
    """
    base_url = f"https://api.github.com/repos/{repo_owner}/{repo_name}"
    prs = []
    page = 1
    per_page = 100
    headers = get_headers(token)

    print(f"Fetching open pull requests from {repo_owner}/{repo_name}...")

    while True:
        url = f"{base_url}/pulls?state=open&per_page={per_page}&page={page}"
        response = requests.get(url, headers=headers)

        if response.status_code != 200:
            print(f"Error fetching PRs: {response.status_code}")
            print(f"Response: {response.text}")
            sys.exit(1)

        page_prs = response.json()
        if not page_prs:
            break

        prs.extend(page_prs)
        page += 1

    print(f"Found {len(prs)} open pull requests\n")
    return prs


def analyze_pending_reviews(
    repo_owner: str, repo_name: str, open_prs: List[Dict], token: Optional[str] = None
) -> tuple[Dict[str, List[Dict]], List[Dict]]:
    """
    Analyze pending reviews and find PRs without reviewers.

    Args:
        repo_owner: GitHub repository owner
        repo_name: GitHub repository name
        open_prs: List of open pull requests
        token: Optional GitHub personal access token

    Returns:
        Tuple of (pending_reviews_by_user, prs_without_reviewers)
    """
    pending_reviews_by_user = defaultdict(list)
    prs_without_reviewers = []

    print("Analyzing review requests...")

    for i, pr in enumerate(open_prs):
        pr_number = pr["number"]
        pr_title = pr["title"]
        pr_author = pr["user"]["login"]
        pr_url = pr["html_url"]
        pr_is_draft = pr.get("draft", False)

        # Get requested reviewers from the initial PR data
        requested_reviewers = pr.get("requested_reviewers", [])
        requested_teams = pr.get("requested_teams", [])

        # Track individual reviewers
        for reviewer in requested_reviewers:
            pending_reviews_by_user[reviewer["login"]].append(
                {
                    "pr_number": pr_number,
                    "pr_title": pr_title,
                    "pr_author": pr_author,
                    "pr_url": pr_url,
                    "pr_is_draft": pr_is_draft,
                }
            )

        # Track team reviewers
        for team in requested_teams:
            team_name = f"team:{team['name']}"
            pending_reviews_by_user[team_name].append(
                {
                    "pr_number": pr_number,
                    "pr_title": pr_title,
                    "pr_author": pr_author,
                    "pr_url": pr_url,
                    "pr_is_draft": pr_is_draft,
                }
            )

        # Check if PR has no reviewers and is not a draft
        if not requested_reviewers and not requested_teams and not pr_is_draft:
            prs_without_reviewers.append(
                {
                    "pr_number": pr_number,
                    "pr_title": pr_title,
                    "pr_author": pr_author,
                    "pr_url": pr_url,
                    "created_at": pr["created_at"],
                }
            )

        if (i + 1) % 50 == 0:
            print(f"Processed {i + 1}/{len(open_prs)} PRs...")

    print(f"Processed all {len(open_prs)} PRs\n")
    return pending_reviews_by_user, prs_without_reviewers


def print_pending_reviews_report(pending_reviews_by_user: Dict[str, List[Dict]]):
    """Print report of people with pending reviews."""
    sorted_users = sorted(
        pending_reviews_by_user.items(), key=lambda x: len(x[1]), reverse=True
    )

    print("=" * 80)
    print("PEOPLE WITH THE MOST PENDING REVIEWS")
    print("=" * 80)
    print()

    if not sorted_users:
        print("No pending review requests found.")
        return

    # Show all users with pending reviews
    for i, (user, prs) in enumerate(sorted_users, 1):
        print(f"{i:2d}. {user:30s}: {len(prs)} pending review(s)")

    print()
    print("=" * 80)

    # Show detailed information for top 5 users
    print("\nDETAILED BREAKDOWN OF TOP 5 REVIEWERS\n")
    print("=" * 80)

    for i, (user, prs) in enumerate(sorted_users[:5], 1):
        print(f"\n{i}. {user} - {len(prs)} pending reviews:")
        print("-" * 80)
        for pr in prs[:10]:  # Limit to 10 PRs per user for readability
            draft_marker = " [DRAFT]" if pr["pr_is_draft"] else ""
            print(f"   PR #{pr['pr_number']}: {pr['pr_title'][:65]}{draft_marker}")
            print(f"   Author: {pr['pr_author']}")
            print(f"   URL: {pr['pr_url']}")
            print()
        if len(prs) > 10:
            print(f"   ... and {len(prs) - 10} more PRs")
            print()


def print_prs_without_reviewers_report(prs_without_reviewers: List[Dict]):
    """Print report of non-draft PRs without reviewers."""
    print("\n" + "=" * 80)
    print("NON-DRAFT PRS WITHOUT REVIEWERS")
    print("=" * 80)
    print()

    if not prs_without_reviewers:
        print("All non-draft PRs have reviewers assigned! 🎉")
        return

    print(f"Found {len(prs_without_reviewers)} non-draft PR(s) without reviewers:\n")

    for pr in prs_without_reviewers:
        print(f"PR #{pr['pr_number']}: {pr['pr_title'][:70]}")
        print(f"   Author: {pr['pr_author']}")
        print(f"   Created: {pr['created_at']}")
        print(f"   URL: {pr['pr_url']}")
        print()


def print_summary(
    open_prs: List[Dict],
    pending_reviews_by_user: Dict[str, List[Dict]],
    prs_without_reviewers: List[Dict],
):
    """Print summary statistics."""
    sorted_users = sorted(
        pending_reviews_by_user.items(), key=lambda x: len(x[1]), reverse=True
    )

    print("\n" + "=" * 80)
    print("SUMMARY STATISTICS")
    print("=" * 80)
    print(f"Total open PRs: {len(open_prs)}")
    print(f"Total pending review requests: {sum(len(prs) for prs in pending_reviews_by_user.values())}")
    print(f"Total unique reviewers with pending requests: {len(pending_reviews_by_user)}")
    print(f"Non-draft PRs without reviewers: {len(prs_without_reviewers)}")
    print()

    if sorted_users:
        print("Top 3 people with most pending reviews:")
        for i, (user, prs) in enumerate(sorted_users[:3], 1):
            print(f"  {i}. {user}: {len(prs)} pending review(s)")
    print()


def main():
    """Main function to run the PR review analysis."""
    parser = argparse.ArgumentParser(
        description="Analyze pending reviews and PRs without reviewers"
    )
    parser.add_argument(
        "--repo",
        default="All-Hands-AI/OpenHands",
        help="GitHub repository in format OWNER/REPO (default: All-Hands-AI/OpenHands)",
    )
    parser.add_argument(
        "--token",
        default=None,
        help="GitHub personal access token (can also use GITHUB_TOKEN env var)",
    )
    args = parser.parse_args()

    # Parse repository owner and name
    try:
        repo_owner, repo_name = args.repo.split("/")
    except ValueError:
        print("Error: Repository must be in format OWNER/REPO")
        sys.exit(1)

    # Get GitHub token from args or environment
    token = args.token or os.environ.get("GITHUB_TOKEN")
    if token:
        print("Using authenticated GitHub API requests")
    else:
        print("Warning: No GitHub token provided. Rate limits may apply.")
        print("Set GITHUB_TOKEN environment variable or use --token for higher limits.\n")

    # Fetch open PRs
    open_prs = get_open_prs(repo_owner, repo_name, token)

    # Analyze pending reviews
    pending_reviews_by_user, prs_without_reviewers = analyze_pending_reviews(
        repo_owner, repo_name, open_prs, token
    )

    # Print reports
    print_pending_reviews_report(pending_reviews_by_user)
    print_prs_without_reviewers_report(prs_without_reviewers)
    print_summary(open_prs, pending_reviews_by_user, prs_without_reviewers)


if __name__ == "__main__":
    main()
