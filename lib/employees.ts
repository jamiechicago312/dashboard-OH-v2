import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from './config';
import { cache } from './cache';
import { getOrgMembersGraphQL, getOrgMembersREST } from './github';
import { EmployeeOverrides } from './types';

function loadEmployeeOverrides(): EmployeeOverrides {
  try {
    const filePath = join(process.cwd(), 'config', 'employees.json');
    const fileContent = readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    // If file doesn't exist or is invalid, return empty overrides
    return { allowlist: [], denylist: [] };
  }
}

export async function buildEmployeesSet(): Promise<Set<string>> {
  const cacheKey = `employees:${config.orgs.join(',')}`;
  
  return cache.withCache(cacheKey, config.cache.ttlSeconds, async () => {
    const employees = new Set<string>();
    
    // Fetch org members for each organization
    for (const org of config.orgs) {
      try {
        // Try GraphQL first, fallback to REST
        let members: string[];
        try {
          members = await getOrgMembersGraphQL(org);
        } catch (error) {
          console.warn(`GraphQL failed for org ${org}, falling back to REST:`, error);
          members = await getOrgMembersREST(org);
        }
        
        members.forEach(member => employees.add(member));
      } catch (error) {
        console.error(`Failed to fetch members for org ${org}:`, error);
        // Continue with other orgs
      }
    }
    
    // Apply overrides from config file
    const overrides = loadEmployeeOverrides();
    
    // Add allowlist members
    overrides.allowlist.forEach(login => employees.add(login));
    
    // Remove denylist members
    overrides.denylist.forEach(login => employees.delete(login));
    
    return employees;
  });
}

export function isEmployee(login: string, employeesSet: Set<string>): boolean {
  return employeesSet.has(login);
}

export function isCommunityPR(authorLogin: string, employeesSet: Set<string>): boolean {
  // Exclude bots and employees
  const isBot = authorLogin.includes('[bot]') || authorLogin.endsWith('-bot');
  return !isBot && !isEmployee(authorLogin, employeesSet);
}

export async function getEmployeeStats(): Promise<{
  totalEmployees: number;
  orgs: string[];
  sampleEmployees: string[];
}> {
  const employeesSet = await buildEmployeesSet();
  const employees = Array.from(employeesSet);
  
  return {
    totalEmployees: employees.length,
    orgs: config.orgs,
    sampleEmployees: employees.slice(0, 10), // First 10 for debugging
  };
}