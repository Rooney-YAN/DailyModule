import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, Newspaper, RefreshCw, Sparkles } from 'lucide-react'

type NewsItem = {
  id: string
  category: string
  titleZh: string
  titleEn: string
  summaryZh: string
  summaryEn: string
  sourceName: string
  sourceUrl: string
  publishedAt?: string
}

type DailyBrief = {
  generatedAt: string | null
  editionDate: string | null
  sourceNotice: string
  items: NewsItem[]
}

const briefUrl = new URL('data/daily-news.json', document.baseURI)

export default function NewsPage({ language }: { language: 'zh' | 'en' }) {
  const [brief, setBrief] = useState<DailyBrief | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const loadBrief = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const response = await fetch(`${briefUrl.href}?v=${Date.now()}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('brief unavailable')
      setBrief(await response.json() as DailyBrief)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadBrief() }, [loadBrief])

  const generatedLabel = brief?.generatedAt
    ? new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Shanghai' }).format(new Date(brief.generatedAt))
    : null

  return <div className="news-page">
    <section className="news-hero">
      <div><span className="eyebrow">DailyModule Brief</span><h1>{language === 'zh' ? '每日新闻快报' : 'Daily news brief'}</h1><p>{language === 'zh' ? '从公开新闻源中筛选重点，由 DeepSeek 生成简明摘要。' : 'Key stories from public news feeds, summarized by DeepSeek.'}</p></div>
      <button className="secondary news-refresh" onClick={() => void loadBrief()} disabled={loading}><RefreshCw className={loading ? 'spinning' : ''} />{language === 'zh' ? '刷新' : 'Refresh'}</button>
    </section>

    <div className="news-status"><span><Sparkles />{language === 'zh' ? 'AI 生成摘要，请以原始报道为准' : 'AI-generated summaries; verify with the original reporting'}</span>{generatedLabel && <time>{language === 'zh' ? '更新于 ' : 'Updated '}{generatedLabel}</time>}</div>

    {loading && <div className="news-grid">{Array.from({ length: 6 }, (_, index) => <div className="news-card news-skeleton" key={index} />)}</div>}
    {!loading && (error || !brief?.items.length) && <div className="news-empty"><span><Newspaper /></span><h2>{language === 'zh' ? '快报尚未生成' : 'The brief has not been generated yet'}</h2><p>{language === 'zh' ? '在 GitHub 仓库中配置 DEEPSEEK_API_KEY，然后手动运行一次部署工作流。' : 'Add DEEPSEEK_API_KEY to the GitHub repository secrets, then run the deployment workflow once.'}</p></div>}
    {!loading && brief && brief.items.length > 0 && <div className="news-grid">{brief.items.map((item, index) => <article className="news-card" key={item.id}>
      <div className="news-card-top"><span className="news-index">{String(index + 1).padStart(2, '0')}</span><span className="news-category">{item.category}</span></div>
      <h2>{language === 'zh' ? item.titleZh : item.titleEn}</h2>
      <p>{language === 'zh' ? item.summaryZh : item.summaryEn}</p>
      <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer"><span>{item.sourceName}</span><ExternalLink /></a>
    </article>)}</div>}
  </div>
}
