import { generateText, Output } from 'ai'
import { z } from 'zod'

export const maxDuration = 60

const input = z.object({
  title: z.string().min(1).max(200),
  kind: z.string().max(40),
  problem: z.string().min(1).max(4000),
  solution: z.string().min(1).max(4000),
  targetCustomer: z.string().min(1).max(500),
  geography: z.string().max(200).default(''),
  industry: z.string().max(200).default(''),
  benefit: z.string().max(2000).default(''),
  marketingPlan: z.string().max(4000).default(''),
  budgetDev: z.number().nonnegative().optional(),
  timeline: z.string().max(200).default(''),
  company: z
    .object({
      name: z.string().max(200),
      products: z.array(z.object({ name: z.string().max(200), targetCustomers: z.string().max(500), clients: z.number().int().nonnegative(), activeUsers: z.number().int().nonnegative() })).max(30),
    })
    .optional(),
})

const range = z.object({ low: z.number().int().nonnegative(), base: z.number().int().nonnegative(), high: z.number().int().nonnegative(), assumption: z.string() })

const report = z.object({
  summary: z.string().describe('Two or three sentence verdict on the proposal'),
  market: z.string().describe('Market size, demand signals and trends for the target customer, geography and industry'),
  currentCustomers: z.object({ count: z.number().int().nonnegative().describe('Existing customers of the company this proposal can be offered to'), description: z.string().describe('Who those existing customers are') }),
  users: range.describe('How many customers in total the proposal can realistically reach in the first year'),
  newCustomers: range.describe('Net-new customers acquired in the first year, driven by the marketing plan'),
  marketingImpact: z.string().describe('How the marketing plan drives acquisition, which channels work best, and gaps in the plan'),
  competitors: z.array(z.object({ name: z.string(), note: z.string() })).max(5),
  adoption: z.string(),
  pricing: z.string(),
  steps: z.string().describe('Suggested delivery steps'),
  staffing: z.string(),
  budget: z.string().describe('Assessment of the development budget against the scope'),
  risks: z.string(),
  recommendation: z.string().describe('Concrete recommendation for the approvers'),
})

export async function POST(req: Request) {
  const parsed = input.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'Fill in title, problem, solution and target customer first.' }, { status: 400 })
  const p = parsed.data

  try {
    const { output } = await generateText({
      model: 'openai/gpt-4.1-mini',
      output: Output.object({ schema: report }),
      system:
        'You are a market analyst reviewing internal product and service proposals for a board. Use your knowledge of the market for the stated customer, geography and industry. Estimate numbers conservatively, state assumptions, and say clearly when data is thin. Customer counts must satisfy low <= base <= high. Write in plain business English.',
      prompt: [
        `Proposal: ${p.title} (${p.kind})`,
        `Problem: ${p.problem}`,
        `Proposed solution: ${p.solution}`,
        `Target customer: ${p.targetCustomer}`,
        p.geography && `Geography: ${p.geography}`,
        p.industry && `Industry: ${p.industry}`,
        p.benefit && `Expected benefit: ${p.benefit}`,
        `Marketing plan: ${p.marketingPlan || 'None provided — point out that acquisition estimates are weak without one.'}`,
        p.budgetDev !== undefined && `Development budget: EUR ${p.budgetDev}`,
        p.timeline && `Timeline: ${p.timeline}`,
        p.company && `Company: ${p.company.name}. Current products: ${p.company.products.map((x) => `${x.name} (targets ${x.targetCustomers}; ${x.clients} clients, ${x.activeUsers} active users)`).join('; ') || 'none'}`,
      ]
        .filter(Boolean)
        .join('\n'),
    })
    return Response.json({ report: output })
  } catch (e) {
    console.error('[v0] proposal analysis failed', e)
    return Response.json({ error: 'The AI analysis could not be generated. Try again in a moment.' }, { status: 502 })
  }
}
