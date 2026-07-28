import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const API_KEY = process.env.DEEPSEEK_API_KEY
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash'
const OUTPUT = resolve(dirname(fileURLToPath(import.meta.url)), '../public/data/daily-news.json')
const FEEDS = [
  { name: 'Google News 中文', url: 'https://news.google.com/rss?hl=zh-CN&gl=CN&ceid=CN:zh-Hans' },
  { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { name: 'BBC Technology', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml' },
]

if (!API_KEY) {
  console.log('DEEPSEEK_API_KEY is not configured; keeping the existing daily brief.')
  process.exit(0)
}

function decodeXml(value = '') {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, ' ').trim()
}

function tag(item, name) {
  return item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'))?.[1] ?? ''
}

async function readFeed(feed) {
  const response = await fetch(feed.url, { headers: { 'user-agent': 'DailyModule/1.0 news brief generator' } })
  if (!response.ok) throw new Error(`${feed.name} returned ${response.status}`)
  const xml = await response.text()
  return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].slice(0, 22).map(match => {
    const item = match[1]
    const rawDate = decodeXml(tag(item, 'pubDate'))
    const sourceName = decodeXml(tag(item, 'source')) || feed.name
    return {
      title: decodeXml(tag(item, 'title')),
      description: decodeXml(tag(item, 'description')).slice(0, 650),
      sourceName,
      sourceUrl: decodeXml(tag(item, 'link')),
      publishedAt: rawDate && !Number.isNaN(Date.parse(rawDate)) ? new Date(rawDate).toISOString() : null,
    }
  }).filter(item => item.title && item.sourceUrl)
}

const feedResults = await Promise.allSettled(FEEDS.map(readFeed))
const rawItems = feedResults.flatMap(result => result.status === 'fulfilled' ? result.value : [])
const seen = new Set()
const sources = rawItems.filter(item => {
  const key = item.title.toLowerCase().replace(/\s+/g, ' ').slice(0, 100)
  if (seen.has(key)) return false
  seen.add(key)
  return true
}).sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '')).slice(0, 45).map((item, index) => ({ id: `source-${index + 1}`, ...item }))

if (!sources.length) throw new Error('No RSS news items could be loaded.')

const prompt = `Today is ${new Date().toISOString().slice(0, 10)}. Select 6-8 genuinely important and diverse current events only from the supplied RSS records. Produce concise, neutral summaries in Simplified Chinese and English. Do not add facts that are absent from the supplied title or description. Return JSON exactly in this shape: {"items":[{"sourceId":"source-1","category":"国际","titleZh":"...","titleEn":"...","summaryZh":"2-3 sentences","summaryEn":"2-3 sentences"}]}. Use each sourceId at most once. Category must be one of 国际, 中国, 科技, 经济, 社会, 环境, 文化. RSS records: ${JSON.stringify(sources.map(({ id, title, description, sourceName, publishedAt }) => ({ id, title, description, sourceName, publishedAt })))}`

async function callDeepSeek() {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      thinking: { type: 'disabled' },
      messages: [
        { role: 'system', content: 'You are a careful bilingual news editor. Output valid JSON only and preserve uncertainty.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 3000,
      stream: false,
    }),
  })
  if (!response.ok) throw new Error(`DeepSeek API returned ${response.status}: ${(await response.text()).slice(0, 300)}`)
  return response.json()
}

let parsed
for (let attempt = 0; attempt < 2; attempt += 1) {
  const result = await callDeepSeek()
  const content = result?.choices?.[0]?.message?.content
  if (!content) continue
  try { parsed = JSON.parse(content) } catch { parsed = undefined }
  if (Array.isArray(parsed?.items) && parsed.items.length) break
}
if (!Array.isArray(parsed?.items) || !parsed.items.length) throw new Error('DeepSeek returned no usable JSON news items.')

const sourceMap = new Map(sources.map(source => [source.id, source]))
const used = new Set()
const items = parsed.items.slice(0, 8).flatMap((item, index) => {
  const source = sourceMap.get(item.sourceId)
  if (!source || used.has(item.sourceId) || !item.titleZh || !item.titleEn || !item.summaryZh || !item.summaryEn) return []
  used.add(item.sourceId)
  return [{
    id: `news-${index + 1}`,
    category: String(item.category || '国际'),
    titleZh: String(item.titleZh), titleEn: String(item.titleEn),
    summaryZh: String(item.summaryZh), summaryEn: String(item.summaryEn),
    sourceName: source.sourceName, sourceUrl: source.sourceUrl, publishedAt: source.publishedAt,
  }]
})

if (!items.length) throw new Error('DeepSeek selected no valid source records.')
const output = {
  generatedAt: new Date().toISOString(),
  editionDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date()),
  sourceNotice: 'News summaries are generated from public RSS feeds. Verify important claims with the original sources.',
  items,
}
await mkdir(dirname(OUTPUT), { recursive: true })
await writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
console.log(`Generated ${items.length} news summaries with ${MODEL}.`)
