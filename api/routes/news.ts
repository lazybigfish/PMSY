import { Router, type Request, type Response } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'

const router = Router()

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization
  if (!authHeader) return null
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  return match?.[1] ?? null
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function extractTagValue(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const m = xml.match(re)
  if (!m) return ''
  return m[1]
    .replace(/<!\[CDATA\[/g, '')
    .replace(/]]>/g, '')
    .trim()
}

function extractSource(xml: string): { source: string; sourceUrl: string } {
  const re = /<source[^>]*url="([^"]+)"[^>]*>([\s\S]*?)<\/source>/i
  const m = xml.match(re)
  if (!m) return { source: 'Google News', sourceUrl: '' }
  return {
    source: m[2].replace(/<!\[CDATA\[/g, '').replace(/]]>/g, '').trim(),
    sourceUrl: m[1].trim(),
  }
}

type RssItem = {
  title: string
  url: string
  publishedAt: string | null
  source: string
  keywords: string
  summary: string
}

function parseRssItems(rssXml: string, keyword: string): RssItem[] {
  const items: RssItem[] = []
  const itemRe = /<item>([\s\S]*?)<\/item>/gi
  let match: RegExpExecArray | null = null

  while ((match = itemRe.exec(rssXml))) {
    const itemXml = match[1]
    const rawTitle = decodeHtmlEntities(extractTagValue(itemXml, 'title'))
    const rawLink = decodeHtmlEntities(extractTagValue(itemXml, 'link'))
    const rawDescription = decodeHtmlEntities(extractTagValue(itemXml, 'description'))
    const rawPubDate = extractTagValue(itemXml, 'pubDate')
    const { source } = extractSource(itemXml)

    const title = stripHtml(rawTitle)
    const url = stripHtml(rawLink)
    const description = stripHtml(rawDescription)

    if (!title || !url) continue

    const publishedAt = rawPubDate ? new Date(rawPubDate).toISOString() : null
    const summary = description.length > 0 ? description.slice(0, 240) : ''

    items.push({
      title,
      url,
      publishedAt,
      source: source || 'Google News',
      keywords: keyword,
      summary,
    })
  }

  return items
}

async function fetchGoogleNewsRss(keyword: string): Promise<RssItem[]> {
  const resp = await fetch(keyword, {
    headers: {
      'User-Agent': 'PMSY/1.0 (+https://localhost)',
      'Accept': 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5',
    },
  })

  if (!resp.ok) {
    throw new Error(`RSS fetch failed: ${resp.status} ${resp.statusText}`)
  }

  const rssXml = await resp.text()
  return parseRssItems(rssXml, '科技')
}

async function requireAdmin(req: Request): Promise<{ userId: string }> {
  const token = getBearerToken(req)
  if (!token) {
    const err = new Error('Missing Authorization token') as Error & { status: number }
    err.status = 401
    throw err
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userData?.user) {
    const err = new Error('Invalid Authorization token') as Error & { status: number }
    err.status = 401
    throw err
  }

  const userId = userData.user.id
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    const err = new Error('Failed to load profile') as Error & { status: number }
    err.status = 401
    throw err
  }

  if (profile.role !== 'admin') {
    const err = new Error('Forbidden') as Error & { status: number }
    err.status = 403
    throw err
  }

  return { userId }
}

router.post('/fetch-hot', async (req: Request, res: Response) => {
  try {
    await requireAdmin(req)
    const debug = String(req.query.debug || '').toLowerCase() === '1'

    const { data: configs, error: configError } = await supabaseAdmin
      .from('system_configs')
      .select('key, value')
      .in('key', ['hot_topic_keywords', 'hot_news_fetch_limit'])

    if (configError) {
      res.status(500).json({ success: false, error: configError.message })
      return
    }

    const keywordValue = configs?.find((r) => r.key === 'hot_topic_keywords')?.value || ''
    const limitRaw = configs?.find((r) => r.key === 'hot_news_fetch_limit')?.value || '20'

    const keywords = keywordValue
      .split(/[,，]/)
      .map((k) => k.trim())
      .filter(Boolean)

    const fetchLimit = Math.max(5, Math.floor(Number(limitRaw) || 0))
    if (keywords.length === 0) {
      res.status(400).json({ success: false, error: '未配置热点关键词' })
      return
    }

    const rssSources = [
      { name: 'IT之家', url: 'https://www.ithome.com/rss/' },
      { name: '少数派', url: 'https://sspai.com/feed' },
      { name: 'OSCHINA', url: 'https://www.oschina.net/news/rss' },
    ]

    const rssResults = await Promise.allSettled(
      rssSources.map(async (source) => {
        const items = await fetchGoogleNewsRss(source.url)
        return items.map((i) => ({ ...i, source: source.name || i.source }))
      }),
    )
    const sourceDebug = rssResults.map((r, idx) => {
      const src = rssSources[idx]
      if (r.status === 'fulfilled') return { source: src.name, ok: true, count: r.value.length }
      const reason = r.reason as Error | undefined
      return { source: src.name, ok: false, error: String(reason?.message || r.reason) }
    })

    const allItems: RssItem[] = rssResults
      .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
      .filter(Boolean)

    const now = Date.now()
    const dayAgo = now - 24 * 60 * 60 * 1000

    const normalizedItems = allItems
      .map((i) => {
        const publishedAt = i.publishedAt ? Date.parse(i.publishedAt) : NaN
        const safePublishedAt = Number.isFinite(publishedAt) ? new Date(publishedAt).toISOString() : new Date().toISOString()
        return { ...i, publishedAt: safePublishedAt }
      })
      .filter((i) => Date.parse(i.publishedAt || '') >= dayAgo)

    const keywordMatchers = keywords.map((k) => k.toLowerCase())
    const seen = new Set<string>()

    const matched: RssItem[] = []
    const fallback: RssItem[] = []

    for (const item of normalizedItems) {
      const key = item.url || item.title
      if (!key || seen.has(key)) continue
      seen.add(key)

      const haystack = `${item.title}\n${item.summary}`.toLowerCase()
      const hitIndex = keywordMatchers.findIndex((k) => haystack.includes(k))

      if (hitIndex >= 0) {
        matched.push({ ...item, keywords: keywords[hitIndex] })
      } else {
        fallback.push({ ...item, keywords: '科技' })
      }
    }

    const collected = [...matched, ...fallback].slice(0, fetchLimit)

    const urls = collected.map((i) => i.url).filter(Boolean)
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('hot_news')
      .select('url')
      .in('url', urls)

    if (existingError) {
      res.status(500).json({ success: false, error: existingError.message })
      return
    }

    const existingSet = new Set((existing || []).map((r: { url: string }) => r.url))
    const toInsert = collected
      .filter((i) => i.url && !existingSet.has(i.url))
      .map((i) => ({
        title: i.title,
        summary: i.summary,
        url: i.url,
        source: i.source,
        keywords: i.keywords,
        published_at: i.publishedAt,
      }))

    if (toInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin.from('hot_news').insert(toInsert)
      if (insertError) {
        res.status(500).json({ success: false, error: insertError.message })
        return
      }
    }

    res.status(200).json({
      success: true,
      inserted: toInsert.length,
      fetched: collected.length,
      limit: fetchLimit,
      keywords,
      ...(debug ? { sources: sourceDebug } : {}),
    })
  } catch (error: unknown) {
    const err = error as Error & { status?: number }
    const status = Number(err?.status) || 500
    res.status(status).json({
      success: false,
      error: err?.message || '服务器内部错误',
    })
  }
})

export default router
