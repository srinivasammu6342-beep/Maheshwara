/**
 * universal-header-ticker.js
 * Simplified Header & Flash News Ticker for Maheshwara Nexlify
 */

(function () {
    // --- Configuration ---
    const SUPABASE_URL = 'https://ndorwpcjwzvygvrstdks.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kb3J3cGNqd3p2eWd2cnN0ZGtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDEyOTMsImV4cCI6MjA5MDk3NzI5M30.eUISNWLqFwZG9IKCZSXn9tC9RyRWdGbn-9j0jYAfPxQ';
    
    // Dependency Loader
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) return resolve();
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    let supabaseClient = null;
    async function initSupabase() {
        if (typeof supabase === 'undefined') {
            await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
        }
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    // --- Inject Styles ---
    const styles = `
        .universal-top-container {
            width: 100% !important;
            max-width: 100vw !important;
            margin: 0 !important;
            padding: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            background: #ffffff !important;
            position: relative !important;
            z-index: 9999 !important;
            overflow-x: hidden !important;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }
        .layer-flash { 
            position: relative !important; 
            height: 40px !important; 
            width: 100% !important;
            overflow: hidden !important;
            white-space: nowrap !important;
            margin: 0 !important;
            padding: 0 !important;
            display: flex !important;
            align-items: center !important;
            background: #0f172a !important; /* Dark Slate */
            color: #ffffff !important;
        }
        .flash-label-universal {
            flex-shrink: 0 !important;
            background: #FF6600 !important;
            color: white !important;
            padding: 0 1.5rem !important;
            height: 100% !important;
            display: flex !important;
            align-items: center !important;
            font-weight: 900 !important;
            font-size: 0.75rem !important;
            text-transform: uppercase !important;
            letter-spacing: 0.1em !important;
            z-index: 10 !important;
            box-shadow: 10px 0 15px rgba(0,0,0,0.2);
        }
        .layer-header { 
            position: relative !important;
            height: 100px !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            display: flex !important;
            align-items: center !important;
            background: #ffffff !important;
            border-bottom: 2px solid #f1f5f9 !important;
        }
        .layer-rss {
            position: relative !important;
            height: 40px !important;
            width: 100% !important;
            background: #f1f5f9 !important;
            overflow: hidden !important;
            display: flex !important;
            align-items: center !important;
            border-bottom: 1px solid #e2e8f0 !important;
            white-space: nowrap !important;
        }
        
        .header-inner-universal {
            display: grid !important;
            grid-template-columns: 1fr auto 1fr !important;
            align-items: center !important;
            width: 100% !important;
            max-width: 1440px !important;
            margin: 0 auto !important;
            padding: 0 1rem !important;
            height: 100% !important;
            column-gap: 0.75rem !important;
        }
        .header-brand-spacer {
            min-width: 0 !important;
            pointer-events: none !important;
        }
        .header-right-actions {
            display: flex !important;
            align-items: center !important;
            justify-content: flex-end !important;
            gap: 0.5rem !important;
            min-width: 0 !important;
            justify-self: end !important;
        }
        .header-brand-link {
            display: block !important;
            text-align: center !important;
            text-decoration: none !important;
        }
        .logo-tagline-universal {
            margin: 0.35rem 0 0 !important;
            font-size: 0.65rem !important;
            font-weight: 800 !important;
            letter-spacing: 0.28em !important;
            text-transform: uppercase !important;
            color: #FF6600 !important;
        }
        @media (min-width: 640px) {
            .logo-tagline-universal { font-size: 0.7rem !important; }
        }

        .ticker-wrapper-universal {
            max-width: 1440px !important;
            margin: 0 auto !important;
            width: 100% !important;
        }

        .layer-flash, .layer-rss {
            width: 100% !important;
        }

        .logo-container-universal {
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
            justify-self: center !important;
            grid-column: 2 !important;
            flex-shrink: 0 !important;
            margin: 0 !important;
            text-align: center !important;
        }

        .logo-text-main {
            font-size: 1.6rem !important;
            font-weight: 900 !important;
            color: #0f172a !important;
            letter-spacing: 0.06em !important;
            line-height: 1.05 !important;
            margin: 0 !important;
            text-transform: uppercase !important;
        }
        @media (min-width: 640px) {
            .logo-text-main { font-size: 1.95rem !important; letter-spacing: 0.08em !important; }
        }

        .desktop-nav-universal {
            display: none !important;
            align-items: center !important;
            gap: 0.5rem !important;
        }
        @media (min-width: 1024px) {
            .desktop-nav-universal { display: flex !important; }
        }

        .nav-link-universal {
            color: #475569 !important;
            font-weight: 700 !important;
            font-size: 0.875rem !important;
            padding: 0.5rem 0.75rem !important;
            border-radius: 12px !important;
            transition: all 0.2s !important;
            white-space: nowrap !important;
            text-decoration: none !important;
        }
        .nav-link-universal:hover {
            color: #FF6600 !important;
            background: #fff7ed !important;
        }

        #menu-toggle-universal {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
        }
        @media (min-width: 1024px) {
            #menu-toggle-universal { display: none !important; }
        }

        #mobile-sidebar-universal {
            position: fixed !important;
            top: 0 !important;
            right: 0 !important;
            height: 100% !important;
            width: 300px !important;
            background: #ffffff !important;
            z-index: 10001 !important;
            transform: translateX(100%) !important;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            box-shadow: -10px 0 30px rgba(0,0,0,0.1) !important;
            display: flex !important;
            flex-direction: column !important;
        }
        #mobile-sidebar-universal.active { transform: translateX(0) !important; }
        
        .sidebar-header-universal {
            padding: 2rem !important;
            border-bottom: 1px solid #f1f5f9 !important;
            background: #f8fafc !important;
        }

        .sidebar-link-universal {
            padding: 1rem 2rem !important;
            display: flex !important;
            align-items: center !important;
            gap: 1rem !important;
            color: #1e293b !important;
            font-weight: 700 !important;
            border-bottom: 1px solid #f8fafc !important;
            transition: all 0.2s !important;
        }
        .sidebar-link-universal:hover {
            background: #fff7ed !important;
            color: #FF6600 !important;
            padding-left: 2.5rem !important;
        }

        /* Continuous Ticker Animation (GPU-friendly, smooth at 100% zoom) */
        @keyframes ticker-scroll-universal {
            0% { transform: translate3d(0, 0, 0); }
            100% { transform: translate3d(-50%, 0, 0); }
        }

        .ticker-animate-universal-slow {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            width: max-content !important;
            animation: ticker-scroll-universal 75s linear infinite !important;
            align-items: center !important;
            height: 100% !important;
            will-change: transform !important;
            backface-visibility: hidden !important;
            -webkit-font-smoothing: antialiased !important;
        }

        .ticker-animate-universal-slow a {
            display: flex !important;
            align-items: center !important;
            flex-shrink: 0 !important;
            white-space: nowrap !important;
        }

        .ticker-animate-universal-fast {
            display: flex;
            width: max-content;
            animation: ticker-scroll-universal 45s linear infinite;
            align-items: center;
            height: 100%;
            will-change: transform;
            backface-visibility: hidden;
        }

        .ticker-animate-universal-slow:hover, .ticker-animate-universal-fast:hover {
            animation-play-state: paused;
        }

        #mobile-sidebar-universal {
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .nav-item-block-universal {
            white-space: nowrap;
            display: inline-block;
        }

        /* Explicit Responsive Utilities */
        @media (max-width: 1023px) {
            .desktop-menu-universal {
                display: none !important;
            }
            .lg\:hidden {
                display: block !important;
            }
        }
        @media (min-width: 1024px) {
            .desktop-menu-universal {
                display: flex !important;
            }
            .lg\:hidden {
                display: none !important;
            }
        }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // --- Inject HTML Structure ---
    function injectHTML() {
        const container = document.createElement('div');
        container.className = 'universal-top-container';

        container.innerHTML = `
            <!-- LAYER 1: Flash News Ticker (Dark) -->
            <div class="layer-flash">
                <div class="ticker-wrapper-universal flex items-center h-full">
                    <div class="flash-label-universal">FLASH NEWS</div>
                    <div class="overflow-hidden flex-grow h-full relative">
                        <div id="flash-ticker-universal" class="ticker-animate-universal-slow px-6">
                            Loading latest headlines...
                        </div>
                    </div>
                </div>
            </div>

            <!-- LAYER 2: Main Branding & Navigation -->
            <header class="layer-header">
                <div class="header-inner-universal">
                    <div class="header-brand-spacer" aria-hidden="true"></div>
                    <div class="logo-container-universal">
                        <a href="index.html" class="header-brand-link">
                            <h1 class="logo-text-main">NEXLIFY NUCLEUS</h1>
                            <p class="logo-tagline-universal">CONNECTING MUTHARAM</p>
                        </a>
                    </div>
                    <div class="header-right-actions">
                        <nav class="desktop-nav-universal">
                            <a href="index.html" class="nav-link-universal">Home</a>
                            <a href="service.html" class="nav-link-universal">Services</a>
                            <a href="news-page.html" class="nav-link-universal">News</a>
                            <a href="digital-services.html" class="nav-link-universal">Portal</a>
                            <div class="h-6 w-px bg-slate-200 mx-2"></div>
                            <a href="administration.html" class="bg-orange-600 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg shadow-orange-100">Admin</a>
                        </nav>
                        <button type="button" id="menu-toggle-universal" class="w-12 h-12 flex items-center justify-center text-slate-800 text-xl bg-slate-50 rounded-xl hover:bg-orange-50 hover:text-orange-600 transition-all" aria-label="Open menu">
                            <i class="fas fa-bars"></i>
                        </button>
                    </div>
                </div>
            </header>

            <!-- LAYER 3: Sub-Ticker (Light) -->
            <div class="layer-rss">
                <div class="ticker-wrapper-universal flex items-center h-full">
                    <div id="rss-ticker-universal" class="ticker-animate-universal-slow px-6 text-slate-500 font-bold text-[13px]">
                        Fetching live updates from database...
                    </div>
                </div>
            </div>
        </div>

        <!-- Sidebar Overlay -->
        <div id="sidebar-overlay-universal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] hidden"></div>

        <!-- Mobile Sidebar -->
        <aside id="mobile-sidebar-universal">
            <div class="sidebar-header-universal flex items-center justify-between">
                <span class="font-black text-slate-800 tracking-tighter">NAVIGATION</span>
                <button id="sidebar-close-universal" class="w-10 h-10 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-red-500 transition-all">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <nav class="flex-grow py-4">
                <a href="index.html" class="sidebar-link-universal"><i class="fas fa-home w-5 text-orange-500"></i> Home</a>
                <a href="service.html" class="sidebar-link-universal"><i class="fas fa-grid-2 w-5 text-orange-500"></i> Services</a>
                <a href="news-page.html" class="sidebar-link-universal"><i class="fas fa-newspaper w-5 text-orange-500"></i> News</a>
                <a href="digital-services.html" class="sidebar-link-universal"><i class="fas fa-user-shield w-5 text-orange-500"></i> My Portal</a>
                <div class="mt-8 px-8">
                    <a href="administration.html" class="w-full bg-orange-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-orange-100">
                        <i class="fas fa-lock"></i> ADMIN ACCESS
                    </a>
                </div>
            </nav>
            <div class="p-8 border-t border-slate-50 text-center">
                <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest">© 2026 Nexlify Nucleus</p>
            </div>
        </aside>
        `;
        document.body.prepend(container);

        // --- Sidebar Logic ---
        const menuBtn = document.getElementById('menu-toggle-universal');
        const closeBtn = document.getElementById('sidebar-close-universal');
        const sidebar = document.getElementById('mobile-sidebar-universal');
        const overlay = document.getElementById('sidebar-overlay-universal');

        function toggleSidebar(show) {
            if (show) {
                sidebar.classList.add('active');
                overlay.classList.remove('hidden');
                document.body.style.overflow = 'hidden';
            } else {
                sidebar.classList.remove('active');
                overlay.classList.add('hidden');
                document.body.style.overflow = '';
            }
        }

        if (menuBtn) menuBtn.addEventListener('click', () => toggleSidebar(true));
        if (closeBtn) closeBtn.addEventListener('click', () => toggleSidebar(false));
        if (overlay) overlay.addEventListener('click', () => toggleSidebar(false));
    }

    // --- 1. Flash Ticker Logic ---
    async function initFlashTicker() {
        const tickerContainer = document.getElementById('flash-ticker-universal');
        if (!tickerContainer) return;

        if (!supabaseClient) {
            console.warn('[Ticker] Supabase client not ready, retrying in 1s...');
            setTimeout(initFlashTicker, 1000);
            return;
        }

        try {
            // Fetch latest headlines
            const { data: news, error } = await supabaseClient
                .from('news')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;

            if (news && news.length > 0) {
                const html = news.map(item => `
                    <a href="news-detail.html?id=${item.id}" class="text-white font-bold mx-8 hover:text-orange-400 transition-colors">
                        ${item.title}
                    </a>
                `).join('');
                tickerContainer.innerHTML = html + html;
            } else {
                tickerContainer.innerHTML = '<span class="mx-8">Maheshwara Nexlify Nucleus News - Connecting Mutharam Village...</span>';
            }
        } catch (err) {
            console.error('Ticker error:', err);
            tickerContainer.innerHTML = '<span class="mx-8 text-red-400">Failed to load live headlines.</span>';
        }
    }

    // --- 2. Multi-Source RSS Logic (Redesigned) ---
    async function initRSSTicker() {
        const rssContainer = document.getElementById('rss-ticker-universal');
        if (!rssContainer) return;

        const categories = [
            {
                label: 'NTV',
                color: 'text-[#fbbf24]', // Gold
                font: 'font-telugu',
                feeds: [{ name: 'NTV Telugu', url: 'https://ntvtelugu.com/feed' }]
            },
            {
                label: 'ONEINDIA',
                color: 'text-cyan-400',
                font: 'font-telugu',
                feeds: [{ name: 'OneIndia', url: 'https://telugu.oneindia.com/rss/feeds/telugu-news-fb.xml' }]
            },
            {
                label: 'NEWS18',
                color: 'text-red-500',
                font: 'font-telugu',
                feeds: [{ name: 'News18 Telugu', url: 'https://telugu.news18.com/rss/hyderabad.xml' }]
            },
            {
                label: 'IPL 2026',
                color: 'text-purple-500',
                font: 'font-sans',
                feeds: [{ name: 'IPL News', url: 'https://www.hindustantimes.com/feeds/rss/cricket/ipl/rssfeed.xml' }]
            },
            {
                label: 'CRICKET',
                color: 'text-blue-500',
                font: 'font-sans',
                feeds: [{ name: 'CricTracker', url: 'https://www.crictracker.com/feed/' }]
            }
        ];

        let headlines = [];
        
        // Add Bullion Rates (Static for now as requested)
        const bullionData = [
            {
                category: 'BULLION',
                source: 'HYD RATES',
                title: 'GOLD: ₹1,24,464/8g | SILVER: ₹2,50,086/kg',
                link: '#',
                color: 'text-yellow-400',
                font: 'font-mono'
            }
        ];
        headlines.push(...bullionData);

        const fetchPromises = [];

        categories.forEach(cat => {
            cat.feeds.forEach(feed => {
                const promise = fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.status === 'ok') {
                            data.items.slice(0, 8).forEach(item => {
                                headlines.push({
                                    category: cat.label,
                                    source: feed.name,
                                    title: item.title,
                                    link: item.link,
                                    color: cat.color,
                                    font: cat.font
                                });
                            });
                        }
                    })
                    .catch(e => console.warn(`Failed to fetch ${feed.name}:`, e));
                fetchPromises.push(promise);
            });
        });

        // Wait for all fetches or timeout (shortened to 4s for faster clear)
        try {
            await Promise.race([
                Promise.all(fetchPromises),
                new Promise(resolve => setTimeout(resolve, 4000))
            ]);
        } catch (e) {
            console.error('RSS Fetch error:', e);
        }

        if (headlines.length > 0) {
            // Mix the headlines
            headlines.sort(() => Math.random() - 0.5);
            
            const html = headlines.map(h => {
                return `<a href="${h.link}" target="_blank" class="flex items-center gap-2 mr-16 hover:text-white transition-colors">
                    <span class="text-[11px] text-white/50 border border-white/20 px-2.5 py-0.5 rounded uppercase font-sans font-bold bg-white/5" style="border-color: currentColor; color: ${h.color.replace('text-', '')}">[${h.category}]</span>
                    <span class="ticker-text-18 font-bold ${h.color} ${h.font} tracking-tight">${h.title}</span>
                </a>`;
            }).join('');
            
            // Clear "Initializing..." immediately and set the content
            rssContainer.innerHTML = html + html;
        } else {
            rssContainer.innerHTML = '<span class="text-slate-500 text-[10px] px-6 font-sans">News feeds temporarily offline. Please refresh.</span>';
        }
    }

    // --- Initialize Everything ---
    function init() {
        const run = async () => {
            await initSupabase();
            injectHTML();
            initFlashTicker();
            initRSSTicker();
            
            // RESET ALL BODY PADDING/MARGIN
            document.body.style.setProperty('padding-top', '0', 'important');
            document.body.style.setProperty('margin-top', '0', 'important');
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', run);
        } else {
            run();
        }
    }

    init();
})();
