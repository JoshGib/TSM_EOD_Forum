import { NextResponse } from 'next/server';

type Article = {
  id: string;
  title: string;
  summary: string;
  link: string;
  source: string;
  publishedAt: string;
  category: string;
};

function extractTag(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
  return m?.[1]?.trim() ?? '';
}

function decodeHtml(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export async function GET() {
  try {
    const dayFmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const now = new Date();
    const backfillDatesEt: string[] = [];
    for (let i = 0; i < 14; i += 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      backfillDatesEt.push(dayFmt.format(d));
    }

    const feedUrls = [
      'https://feeds.reuters.com/reuters/businessNews',
      'https://feeds.reuters.com/news/usmarkets',
      'https://www.cnbc.com/id/100003114/device/rss/rss.html',
      'https://feeds.marketwatch.com/marketwatch/topstories/',
      'https://finance.yahoo.com/news/rssindex',
    ];

    const xmlList = await Promise.all(
      feedUrls.map(async (url) => {
        try {
          const resp = await fetch(url, {
            cache: 'no-store',
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
              Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
            },
          });
          if (!resp.ok) return '';
          return await resp.text();
        } catch {
          return '';
        }
      })
    );

    const items = xmlList.flatMap((xml) => xml.match(/<item>[\s\S]*?<\/item>/gi) ?? []);
    const parsed = items
      .map((item, idx) => {
        const titleRaw = decodeHtml(extractTag(item, 'title'));
        const title = titleRaw.replace(/\s*-\s*[^-]+$/, '').trim();
        const summary = decodeHtml(extractTag(item, 'description')).replace(/<[^>]+>/g, '').trim();
        const link = extractTag(item, 'link');
        const publishedAt = extractTag(item, 'pubDate');
        const source = decodeHtml(extractTag(item, 'source')) || 'Market News';
        const dt = new Date(publishedAt);
        const etDay = isNaN(dt.getTime()) ? '' : dayFmt.format(dt);
        return {
          id: `${idx}-${link || title}`,
          title,
          summary,
          link,
          source,
          publishedAt,
          category: 'Market News',
          etDay,
        };
      })
      .filter((a) => a.etDay && a.title && a.link)
      .filter((a, i, arr) => arr.findIndex((x) => x.link === a.link) === i)
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    let selectedEtDay = '';
    for (const d of backfillDatesEt) {
      if (parsed.some((a) => a.etDay === d)) {
        selectedEtDay = d;
        break;
      }
    }

    const articles: Article[] = selectedEtDay
      ? parsed.filter((a) => a.etDay === selectedEtDay).slice(0, 8).map(({ etDay, ...rest }) => rest)
      : [];

    return NextResponse.json({ articles, selected_et_date: selectedEtDay || null });
  } catch (error) {
    console.error('Failed to fetch market insights:', error);
    return NextResponse.json({ articles: [], selected_et_date: null });
  }
}
