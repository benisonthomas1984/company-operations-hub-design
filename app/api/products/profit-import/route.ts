import { generateText, Output } from 'ai'
import { z } from 'zod'

export const maxDuration = 60

const input = z.object({
  product: z.string().min(1).max(200),
  fileName: z.string().max(200),
  rows: z.array(z.array(z.string().max(300)).max(30)).min(2).max(301),
})

const line = z.object({
  month: z.string().describe('Accounting month as YYYY-MM'),
  kind: z.enum(['Income', 'Delivery cost', 'Operating cost']).describe('Income = revenue/sales; Delivery cost = hosting, contractors, delivery staff, COGS; Operating cost = marketing, sales, admin, support'),
  amount: z.number().nonnegative().describe('Positive amount in EUR'),
  description: z.string(),
  reference: z.string().describe('Invoice number or row reference, empty if none'),
})

const result = z.object({
  lines: z.array(line),
  notes: z.array(z.string()).describe('Short notes on assumptions, skipped rows or unclear values'),
})

export async function POST(req: Request) {
  const parsed = input.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'Send a header row and at least one data row (max 300 rows).' }, { status: 400 })
  const { product, fileName, rows } = parsed.data
  const table = rows.map((r) => r.map((c) => c.replace(/\s+/g, ' ')).join(' | ')).join('\n')

  try {
    const { output } = await generateText({
      model: 'openai/gpt-4.1-mini',
      output: Output.object({ schema: result }),
      system:
        'You turn messy financial spreadsheets into clean profit-and-loss lines for one product. Read every data row. Infer which column is the date, amount, description and type even if headers are unusual or in another language. Classify each row as Income, Delivery cost or Operating cost. Negative numbers or debit columns are usually costs. Skip totals, subtotals and blank rows and mention them in notes. Never invent rows or amounts.',
      prompt: `Product: ${product}\nFile: ${fileName}\n\nSpreadsheet (first row is the header, cells separated by |):\n${table}`,
    })
    return Response.json(output)
  } catch (e) {
    console.error('[v0] profit import failed', e)
    return Response.json({ error: 'The AI could not read this spreadsheet. Try again in a moment.' }, { status: 502 })
  }
}
