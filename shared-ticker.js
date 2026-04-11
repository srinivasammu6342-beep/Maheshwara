/** 
 * shared-ticker.js
 * Universal Flash News Ticker Logic for Maheshwara Nexlify News
 */

async function initUniversalTicker(supabaseClient) {
    const tickerContainer = document.getElementById('ticker-scroll');
    if (!tickerContainer) {
        console.warn('[Ticker] #ticker-scroll element not found on page.');
        return;
    }

    try {
        console.log('[Ticker] Fetching flash news data...');
        
        // 1. Try to fetch news from TODAY
        const today = new Date().toISOString().split('T')[0];
        let { data: todayNews, error: todayError } = await supabaseClient
            .from('flash_news')
            .select('*')
            .gte('created_at', today)
            .order('created_at', { ascending: false });

        if (todayError) {
            console.error('[Ticker] Error fetching today\'s news:', todayError);
            // Fallback to latest 6 news if error
        }

        let flashNews = todayNews || [];

        // 2. Fallback: If no news found for today, fetch the LATEST 6 records
        if (flashNews.length === 0) {
            console.log('[Ticker] No news for today. Falling back to latest 6 records.');
            const { data: latestNews, error: latestError } = await supabaseClient
                .from('flash_news')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(6);

            if (latestError) {
                console.error('[Ticker] Error fetching latest news:', latestError);
            } else {
                flashNews = latestNews || [];
            }
        }

        // 3. Render news items
        if (flashNews.length === 0) {
            tickerContainer.innerHTML = '<span class="ticker-item">Stay tuned for the latest updates from Maheshwara Nexlify!</span>';
        } else {
            // Repeat the items to ensure smooth scrolling
            const itemsHtml = flashNews.map(news => {
                const newsId = news.id; // Or a linked news ID if your table supports it
                // Note: Assuming flash_news table has a news_id for linking to detail page
                // If not, we use the ticker's headline or link to news detail if possible
                const detailUrl = news.news_id ? `news-detail.html?id=${news.news_id}` : `news-page.html`;
                
                return `<a href="${detailUrl}" target="_blank" class="ticker-item">${news.message}</a>`;
            }).join('');
            
            // Duplicate content for seamless scrolling
            tickerContainer.innerHTML = itemsHtml + itemsHtml;
            
            // Adjust animation duration based on content length
            const totalWidth = tickerContainer.scrollWidth;
            const duration = Math.max(20, totalWidth / 50); // Speed control
            tickerContainer.style.animationDuration = `${duration}s`;
        }

        console.log('[Ticker] Successfully initialized with', flashNews.length, 'items.');

    } catch (err) {
        console.error('[Ticker] Critical error in initialization:', err);
        tickerContainer.innerHTML = '<span class="ticker-item">Updates coming soon...</span>';
    }
}
