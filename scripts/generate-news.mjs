import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUTPUT = resolve(dirname(fileURLToPath(import.meta.url)), '../public/data/daily-news.json')
const FEEDS = [
  { name: 'Google News 中文', categoryZh: '综合', categoryEn: 'Top stories', url: 'https://news.google.com/rss?hl=zh-CN&gl=CN&ceid=CN:zh-Hans' },
  { name: 'Google News 国际', categoryZh: '国际', categoryEn: 'World', url: 'https://news.google.com/rss/headlines/section/topic/WORLD?hl=zh-CN&gl=CN&ceid=CN:zh-Hans' },
  { name: 'Google News 商业', categoryZh: '经济', categoryEn: 'Business', url: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=zh-CN&gl=CN&ceid=CN:zh-Hans' },
  { name: 'Google News 科技', categoryZh: '科技', categoryEn: 'Technology', url: 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=zh-CN&gl=CN&ceid=CN:zh-Hans' },
  { name: 'Google News 科学', categoryZh: '科学', categoryEn: 'Science', url: 'https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=zh-CN&gl=CN&ceid=CN:zh-Hans' },
  { name: 'BBC World', categoryZh: '国际', categoryEn: 'World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { name: 'BBC Technology', categoryZh: '科技', categoryEn: 'Technology', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml' },
  { name: 'NPR World', categoryZh: '国际', categoryEn: 'World', url: 'https://feeds.npr.org/1004/rss.xml' },
  { name: 'The Guardian World', categoryZh: '国际', categoryEn: 'World', url: 'https://www.theguardian.com/world/rss' },
  { name: 'The Guardian Technology', categoryZh: '科技', categoryEn: 'Technology', url: 'https://www.theguardian.com/technology/rss' },
]

function decodeXml(value = '') {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, ' ').trim()
}

function tag(item, name) {
  return item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'))?.[1] ?? ''
}

function shorten(value, maxLength = 260) {
  const text = value.trim()
  if (text.length <= maxLength) return text
  const shortened = text.slice(0, maxLength)
  const boundary = Math.max(shortened.lastIndexOf('。'), shortened.lastIndexOf('. '), shortened.lastIndexOf('；'))
  return `${(boundary > maxLength * 0.55 ? shortened.slice(0, boundary + 1) : shortened).trim()}…`
}

async function readFeed(feed) {
  const response = await fetch(feed.url, {
    headers: { accept: 'application/rss+xml, application/xml, text/xml', 'user-agent': 'DailyModule/1.0 RSS reader' },
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`${feed.name} returned ${response.status}`)
  const xml = await response.text()
  return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].slice(0, 20).flatMap(match => {
    const item = match[1]
    const title = decodeXml(tag(item, 'title'))
    const sourceName = decodeXml(tag(item, 'source')) || feed.name
    const sourceUrl = decodeXml(tag(item, 'link'))
    const rawDescription = decodeXml(tag(item, 'description'))
    const rawDate = decodeXml(tag(item, 'pubDate'))
    if (!title || !sourceUrl) return []
    const description = shorten(rawDescription && rawDescription.toLowerCase() !== title.toLowerCase()
      ? rawDescription
      : `${sourceName} 发布的 RSS 新闻条目。点击下方来源查看完整报道。`)
    return [{
      title,
      description,
      sourceName,
      sourceUrl,
      categoryZh: feed.categoryZh,
      categoryEn: feed.categoryEn,
      publishedAt: rawDate && !Number.isNaN(Date.parse(rawDate)) ? new Date(rawDate).toISOString() : null,
    }]
  })
}

const feedResults = await Promise.allSettled(FEEDS.map(readFeed))
feedResults.forEach((result, index) => {
  if (result.status === 'rejected') console.warn(`Skipped ${FEEDS[index].name}: ${result.reason?.message ?? result.reason}`)
})

const seen = new Set()
const candidates = feedResults
  .flatMap(result => result.status === 'fulfilled' ? result.value : [])
  .filter(item => {
    const key = item.title.toLowerCase().replace(/[\s\p{P}]+/gu, '').slice(0, 90)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
  .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))

if (!candidates.length) {
  console.warn('No RSS news items could be loaded; keeping the previously generated brief.')
  process.exit(0)
}

const selected = []
for (const category of ['综合', '国际', '经济', '科技', '科学']) {
  const item = candidates.find(candidate => candidate.categoryZh === category && !selected.includes(candidate))
  if (item) selected.push(item)
}
for (const item of candidates) {
  if (selected.length >= 10) break
  if (!selected.includes(item)) selected.push(item)
}

const items = selected
  .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
  .map((item, index) => ({
    id: `news-${index + 1}`,
    category: item.categoryZh,
    categoryEn: item.categoryEn,
    titleZh: item.title,
    titleEn: item.title,
    summaryZh: item.description,
    summaryEn: item.description,
    sourceName: item.sourceName,
    sourceUrl: item.sourceUrl,
    publishedAt: item.publishedAt,
  }))

const output = {
  generatedAt: new Date().toISOString(),
  editionDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date()),
  sourceNotice: 'Automatically collected from public RSS feeds without AI summarization. Titles and excerpts belong to their respective publishers.',
  items,
}

await mkdir(dirname(OUTPUT), { recursive: true })
await writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
console.log(`Collected ${items.length} news items from public RSS feeds without AI.`)
