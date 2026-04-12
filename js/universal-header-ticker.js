/**
 * universal-header-ticker.js
 * Universal Header & Double Ticker System for Maheshwara Nexlify
 * Includes: Flash News (Supabase) + Multi-Source RSS (Technology, Govt, National)
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
        /* Ticker & Header Layer System */
        .universal-top-container {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 99999;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            display: flex !important;
            flex-direction: column !important;
        }
        .layer-flash { 
            position: relative !important; 
            height: 35px !important; 
            overflow: hidden !important;
            white-space: nowrap !important;
            margin: 0 !important;
            padding: 0 !important;
            display: flex !important;
            align-items: center !important;
        }
        .layer-finance { 
            position: relative !important; 
            height: 30px !important; 
            background-color: #020617 !important; 
            overflow: hidden !important;
            border-bottom: 1px solid rgba(34, 211, 238, 0.1) !important;
            margin: 0 !important;
            padding: 0 !important;
            display: flex !important;
            align-items: center !important;
        }
        .rss-scroll-universal {
            display: flex !important;
            white-space: nowrap !important;
            width: max-content !important;
            animation: ticker-scroll-universal 60s linear infinite !important;
            align-items: center !important;
            height: 100% !important;
        }
        .rss-scroll-universal:hover {
            animation-play-state: paused !important;
        }
        .layer-header { 
            position: relative !important;
            height: 70px !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
            display: flex !important;
            align-items: center !important;
        }

        /* Glassmorphism */
        .glass-effect-header {
            background: rgba(15, 23, 42, 0.8);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-bottom: 1px solid rgba(34, 211, 238, 0.1);
        }

        /* Continuous Ticker Animation */
        @keyframes ticker-scroll-universal {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }

        .ticker-animate-universal {
            display: flex;
            width: max-content;
            animation: ticker-scroll-universal 40s linear infinite;
            align-items: center;
            height: 100%;
        }

        .ticker-animate-universal:hover {
            animation-play-state: paused;
        }

        /* RSS Fade Animation */
        #rss-ticker-container-universal {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            transition: opacity 0.8s ease-in-out;
        }
        .rss-fade-out { opacity: 0; }
        .rss-fade-in { opacity: 1; }

        /* Flash News Label Animation */
        .flash-label-universal {
            animation: pulse-red-universal 2s infinite;
            flex-shrink: 0;
        }
        @keyframes pulse-red-universal {
            0% { background-color: #ef4444; }
            50% { background-color: #b91c1c; }
            100% { background-color: #ef4444; }
        }

        /* Mobile Sidebar Transition */
        #mobile-sidebar-universal {
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .nav-item-block-universal {
            white-space: nowrap;
            display: inline-block;
        }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // --- Inject HTML Structure ---
    function injectHTML() {
        const container = document.createElement('div');
        container.className = 'universal-top-container shadow-2xl';
        container.innerHTML = `
            <!-- LAYER 1: Flash News Ticker (Local News) -->
            <div class="layer-flash bg-red-600 border-b border-white/10 flex items-center">
                <div class="flash-label-universal px-4 h-full flex items-center bg-red-700 text-white font-black text-[10px] sm:text-xs italic tracking-tighter whitespace-nowrap z-10 shadow-xl">
                    <i class="fas fa-bolt mr-2 animate-pulse"></i> FLASH NEWS
                </div>
                <div class="flex-1 relative overflow-hidden h-full flex items-center bg-[#020617]">
                    <div id="ticker-scroll-universal" class="ticker-animate-universal pl-6">
                        <span class="text-white font-medium mr-12 text-xs">Loading latest updates from Maheshwara Nexlify...</span>
                    </div>
                </div>
            </div>

            <!-- LAYER 2: Multi-Source RSS Ticker (Trending & Utility) -->
            <div class="layer-finance flex items-center">
                <div id="rss-ticker-container-universal" class="rss-scroll-universal">
                    <span class="text-[11px] font-bold text-cyan-400 uppercase tracking-widest px-6">Loading global news...</span>
                </div>
            </div>

            <!-- LAYER 3: Main Navigation Header -->
            <header class="layer-header w-full glass-effect-header">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                    <div class="flex items-center justify-between w-full">
                        <!-- Logo -->
                        <div class="flex-shrink-0 flex flex-col">
                            <a href="index.html" class="flex flex-col group">
                                <span class="font-display text-xl sm:text-2xl font-black text-white group-hover:text-cyan-400 transition-colors">MAHESHWARA NEXLIFY</span>
                                <span class="font-telugu text-[10px] sm:text-xs text-cyan-400/80 tracking-wider">మహేశ్వర నెక్స్లిఫై - Nucleus Digital Services</span>
                            </a>
                        </div>

                        <!-- Desktop Menu -->
                        <div class="hidden lg:block">
                            <ul class="flex items-center space-x-1">
                                <li><a href="index.html" class="nav-item-block-universal px-3 py-2 text-sm font-medium text-white hover:text-cyan-400 transition-colors">హోమ్ | Home</a></li>
                                <li><a href="news-page.html" class="nav-item-block-universal px-3 py-2 text-sm font-medium text-white hover:text-cyan-400 transition-colors">వార్తలు | News</a></li>
                                <li>
                                    <a href="csc-services.html" class="nav-item-block-universal px-4 py-2 text-sm font-bold bg-[#fbbf241a] text-[#fbbf24] border border-[#fbbf244d] rounded-full hover:bg-[#fbbf24] hover:text-black transition-all shadow-[0_0_10px_rgba(251,191,36,0.2)]">
                                        CSC సేవలు | CSC Services
                                    </a>
                                </li>
                                <li><a href="digital-services.html" class="nav-item-block-universal px-3 py-2 text-sm font-medium text-white hover:text-cyan-400 transition-colors">డిజిటల్ | Digital</a></li>
                                <li><a href="agri-services.html" class="nav-item-block-universal px-3 py-2 text-sm font-medium text-white hover:text-cyan-400 transition-colors">రైతు సేవలు | Agri</a></li>
                                <li><a href="uploadnews.html" class="nav-item-block-universal px-3 py-2 text-sm font-medium text-white hover:text-cyan-400 transition-colors">వార్త పంపండి | Upload</a></li>
                                <li>
                                    <a href="login.html" class="nav-item-block-universal ml-4 px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan-400 border border-cyan-500/50 rounded-lg hover:bg-cyan-500 hover:text-black transition-all">
                                        Admin
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <!-- Mobile Menu Button -->
                        <div class="lg:hidden">
                            <button id="mobile-menu-btn-universal" class="p-2 rounded-lg text-cyan-400 hover:bg-cyan-500/10 focus:outline-none">
                                <i class="fas fa-bars text-2xl"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <!-- Mobile Sidebar Overlay -->
            <div id="sidebar-overlay-universal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] hidden transition-opacity duration-300 opacity-0"></div>
            
            <!-- Mobile Sidebar -->
            <div id="mobile-sidebar-universal" class="fixed top-0 right-0 h-full w-72 bg-[#0f172ab3] backdrop-blur-xl z-[10001] translate-x-full shadow-2xl border-l border-cyan-500/20">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-10">
                        <span class="font-display font-bold text-cyan-400">MENU</span>
                        <button id="close-sidebar-universal" class="text-slate-400 hover:text-white"><i class="fas fa-times text-xl"></i></button>
                    </div>
                    <ul class="space-y-6">
                        <li><a href="index.html" class="block text-lg font-medium text-white hover:text-cyan-400"><i class="fas fa-home w-8"></i> Home</a></li>
                        <li><a href="news-page.html" class="block text-lg font-medium text-white hover:text-cyan-400"><i class="fas fa-newspaper w-8"></i> News Portal</a></li>
                        <li><a href="csc-services.html" class="block text-lg font-bold text-[#fbbf24]"><i class="fas fa-id-card w-8 text-[#fbbf24]"></i> CSC Services</a></li>
                        <li><a href="digital-services.html" class="block text-lg font-medium text-white hover:text-cyan-400"><i class="fas fa-laptop-code w-8"></i> Digital Services</a></li>
                        <li><a href="agri-services.html" class="block text-lg font-medium text-white hover:text-cyan-400"><i class="fas fa-seedling w-8"></i> Agri Services</a></li>
                        <li><a href="uploadnews.html" class="block text-lg font-medium text-white hover:text-cyan-400"><i class="fas fa-upload w-8"></i> Upload News</a></li>
                        <li class="pt-6 border-t border-slate-700">
                            <a href="login.html" class="block text-center py-3 bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 font-bold rounded-xl">ADMIN ACCESS</a>
                        </li>
                    </ul>
                </div>
            </div>
        `;
        document.body.prepend(container);

        // --- Sidebar Logic ---
        const menuBtn = document.getElementById('mobile-menu-btn-universal');
        const closeBtn = document.getElementById('close-sidebar-universal');
        const sidebar = document.getElementById('mobile-sidebar-universal');
        const overlay = document.getElementById('sidebar-overlay-universal');

        function toggleSidebar(show) {
            if (show) {
                sidebar.classList.remove('translate-x-full');
                overlay.classList.remove('hidden');
                setTimeout(() => overlay.classList.add('opacity-100'), 10);
                document.body.style.overflow = 'hidden';
            } else {
                sidebar.classList.add('translate-x-full');
                overlay.classList.remove('opacity-100');
                setTimeout(() => overlay.classList.add('hidden'), 300);
                document.body.style.overflow = '';
            }
        }

        if (menuBtn) menuBtn.addEventListener('click', () => toggleSidebar(true));
        if (closeBtn) closeBtn.addEventListener('click', () => toggleSidebar(false));
        if (overlay) overlay.addEventListener('click', () => toggleSidebar(false));
    }

    // --- 1. Flash Ticker Logic (Local News) ---
    async function initFlashTicker() {
        const tickerContainer = document.getElementById('ticker-scroll-universal');
        if (!tickerContainer || !supabaseClient) return;

        try {
            const { data: flashNews, error } = await supabaseClient
                .from('news')
                .select('title, id')
                .eq('category', 'village')
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;

            if (flashNews && flashNews.length > 0) {
                const newsHtml = flashNews.map(news => {
                    return `<a href="news-detail.html?id=${news.id}" class="text-white font-medium hover:text-cyan-400 mr-12 text-xs flex items-center gap-2">
                        <span class="w-1.5 h-1.5 bg-cyan-400 rounded-full"></span> ${news.title}
                    </a>`;
                }).join('');
                tickerContainer.innerHTML = newsHtml + newsHtml;
            } else {
                tickerContainer.innerHTML = '<span class="text-slate-400 mr-12 text-sm italic">Stay tuned for local updates from Mutharam...</span>';
            }
        } catch (err) {
            console.error('[Flash Ticker Error]', err);
            tickerContainer.innerHTML = '<span class="text-red-400 mr-12 text-sm">Local updates temporarily unavailable.</span>';
        }
    }

    // --- 2. Multi-Source RSS Feed Logic (Enhanced) ---
    async function initRSSTicker() {
        const rssContainer = document.getElementById('rss-ticker-container-universal');
        if (!rssContainer) return;

        const categories = [
            {
                name: 'NATIONAL & GLOBAL',
                feeds: [
                    { name: 'EENADU', url: 'https://www.eenadu.net/rss/latest-news', lang: 'telugu' },
                    { name: 'SAKSHI', url: 'https://www.sakshi.com/rss/news.xml', lang: 'telugu' },
                    { name: 'THE HINDU', url: 'https://www.thehindu.com/feeder/default.rss', lang: 'english' },
                    { name: 'TELANGANA TODAY', url: 'https://telanganatoday.com/feed', lang: 'english' }
                ]
            },
            {
                name: 'TECH & MOBILE',
                feeds: [
                    { name: 'GADGETS360', url: 'https://www.gadgets360.com/rss/feeds', lang: 'english' },
                    { name: 'GIZBOT TELUGU', url: 'https://telugu.gizbot.com/rss/telugu-gizbot-fb.xml', lang: 'telugu' },
                    { name: 'TECHRADAR', url: 'https://www.techradar.com/rss', lang: 'english' }
                ]
            },
            {
                name: 'GOVT SCHEMES & UPDATES',
                feeds: [
                    { name: 'PIB INDIA', url: 'https://pib.gov.in/RssMain.aspx', lang: 'english' },
                    { name: 'MYGOV', url: 'https://www.mygov.in/rss.xml', lang: 'english' }
                ]
            }
        ];

        let allHeadlines = [];

        async function fetchFeeds() {
            for (const cat of categories) {
                for (const feed of cat.feeds) {
                    try {
                        const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`);
                        const data = await res.json();
                        if (data.status === 'ok') {
                            data.items.slice(0, 5).forEach(item => {
                                allHeadlines.push({
                                    category: cat.name,
                                    source: feed.name,
                                    title: item.title,
                                    link: item.link,
                                    lang: feed.lang
                                });
                            });
                        }
                    } catch (e) {
                        console.warn(`Failed to fetch ${feed.name}:`, e);
                    }
                }
            }
        }

        function renderScrollingRSS() {
            if (allHeadlines.length === 0) {
                rssContainer.innerHTML = '<span class="text-slate-500 text-[10px] px-6">News feeds temporarily offline.</span>';
                return;
            }

            const newsHtml = allHeadlines.map(headline => {
                const colorClass = headline.lang === 'telugu' ? 'text-[#fbbf24]' : 'text-cyan-400';
                return `<a href="${headline.link}" target="_blank" class="text-[10px] sm:text-[11px] font-bold ${colorClass} tracking-wide uppercase flex items-center gap-2 mr-12">
                    <span class="text-white/40 text-[9px] border border-white/10 px-1.5 rounded">${headline.category}</span>
                    <span>${headline.source}:</span> 
                    <span>${headline.title}</span>
                </a>`;
            }).join('');

            // Double for seamless scroll
            rssContainer.innerHTML = newsHtml + newsHtml;
            
            // Speed control based on length
            const totalWidth = rssContainer.scrollWidth;
            const duration = Math.max(30, totalWidth / 100);
            rssContainer.style.animationDuration = `${duration}s`;
        }

        await fetchFeeds();
        renderScrollingRSS();
    }

    // --- Initialize Everything ---
    function init() {
        const run = async () => {
            await initSupabase();
            injectHTML();
            initFlashTicker();
            initRSSTicker();
            
            // Adjust body padding to account for fixed header
            const header = document.querySelector('.universal-top-container');
            if (header) {
                const height = header.offsetHeight;
                document.body.style.setProperty('padding-top', height + 'px', 'important');
                document.body.style.setProperty('margin-top', '0', 'important');
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', run);
        } else {
            run();
        }
        
        // Also adjust on resize
        window.addEventListener('resize', () => {
            const header = document.querySelector('.universal-top-container');
            if (header) {
                document.body.style.setProperty('padding-top', header.offsetHeight + 'px', 'important');
                document.body.style.setProperty('margin-top', '0', 'important');
            }
        });
    }

    init();
})();
