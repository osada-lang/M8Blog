import * as cheerio from 'cheerio';

export interface ScrapedData {
  title: string;
  description: string;
  textContent: string;
  headings: string[];
}

export async function scrapeUrl(url: string): Promise<ScrapedData> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // 不要な要素を除去
    $('script, style, noscript, nav, footer, header, svg, iframe, form').remove();

    const title = $('title').text().trim() || $('h1').first().text().trim() || 'No Title';
    const description = $('meta[name="description"]').attr('content')?.trim() || '';

    const headings: string[] = [];
    $('h1, h2, h3').each((_, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      if (text && text.length < 100) {
        headings.push(text);
      }
    });

    // 本文テキストの抽出
    let mainContent = $('main, article, #content, .content, #main').text();
    if (!mainContent || mainContent.trim().length < 100) {
      mainContent = $('body').text();
    }

    // 空白の正規化
    const cleanedText = mainContent
      .replace(/\s+/g, ' ')
      .replace(/[\r\n\t]+/g, '\n')
      .trim();

    return {
      title,
      description,
      textContent: cleanedText.slice(0, 8000), // 上限8000文字
      headings: headings.slice(0, 15),
    };
  } catch (error: any) {
    throw new Error(`スクレイピングに失敗しました: ${error.message}`);
  }
}
