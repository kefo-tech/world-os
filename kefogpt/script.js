// ============================================================
// KeFo AI - Multi Source Search Engine
// بدون نموذج ذكاء اصطناعي
// ============================================================

// ===== عناصر DOM =====
const welcomeScreen = document.getElementById('welcomeScreen');
const welcomeBtn = document.getElementById('welcomeBtn');
const chatApp = document.getElementById('chatApp');
const chatArea = document.getElementById('chatArea');
const input = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

// ===== متغيرات التحكم =====
let isProcessing = false;

// ============================================================
// إعدادات المصادر
// ============================================================

const SOURCES = {
    wikipedia: true,
    openalex: true,
    crossref: true,
    zenodo: true
};

// عدد النتائج من كل مصدر
const RESULTS_PER_SOURCE = 5;

// ============================================================
// إنشاء جسيمات الخلفية
// ============================================================

function createParticles() {
    const container = document.getElementById('particles');
    const count = 50;

    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');

        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.width = (Math.random() * 4 + 1) + 'px';
        particle.style.height = particle.style.width;
        particle.style.animationDuration =
            (Math.random() * 15 + 10) + 's';
        particle.style.animationDelay =
            (Math.random() * 10) + 's';
        particle.style.opacity =
            Math.random() * 0.5 + 0.1;

        container.appendChild(particle);
    }
}

createParticles();

// ============================================================
// شاشة الترحيب
// ============================================================

welcomeBtn.addEventListener('click', function () {
    welcomeScreen.classList.add('hidden');
    chatApp.style.display = 'flex';

    setTimeout(() => {
        input.focus();
    }, 500);
});

// ============================================================
// إزالة رسالة الترحيب
// ============================================================

function removeWelcome() {
    const welcome = chatArea.querySelector('.welcome-msg');

    if (welcome) {
        welcome.remove();
    }
}

// ============================================================
// تأثير الآلة الكاتبة
// ============================================================

async function typeText(element, text, speed = 25) {
    element.textContent = '';

    const chars = text.split('');

    for (let i = 0; i < chars.length; i++) {
        element.textContent += chars[i];

        chatArea.scrollTop = chatArea.scrollHeight;

        const delay =
            chars[i] === ' '
                ? speed * 0.5
                : speed;

        await new Promise(resolve =>
            setTimeout(resolve, delay)
        );
    }
}

// ============================================================
// إضافة رسالة
// ============================================================

async function addMessageWithTyping(text, sender = 'bot') {

    removeWelcome();

    const div = document.createElement('div');

    div.className = `message ${sender}`;

    if (sender === 'bot') {

        div.style.paddingBottom = '50px';

        const textSpan = document.createElement('span');

        textSpan.className = 'typing-text';

        div.appendChild(textSpan);

        chatArea.appendChild(div);

        chatArea.scrollTop =
            chatArea.scrollHeight;

        await typeText(
            textSpan,
            text
        );

        textSpan.classList.remove(
            'typing-text'
        );

        addCopyButton(
            div,
            text
        );

    } else {

        div.textContent = text;

        chatArea.appendChild(div);

        chatArea.scrollTop =
            chatArea.scrollHeight;
    }
}

// ============================================================
// زر نسخ النتيجة
// ============================================================

function addCopyButton(messageDiv, text) {

    const copyBtn =
        document.createElement('button');

    copyBtn.className = 'copy-btn';

    copyBtn.innerHTML =
        '📋 نسخ النتيجة';

    copyBtn.onclick = async function () {

        try {

            await navigator.clipboard.writeText(
                text
            );

            this.innerHTML =
                '✅ تم نسخ النتيجة';

            this.classList.add(
                'copied'
            );

            setTimeout(() => {

                this.innerHTML =
                    '📋 نسخ النتيجة';

                this.classList.remove(
                    'copied'
                );

            }, 2000);

        } catch (err) {

            const textarea =
                document.createElement(
                    'textarea'
                );

            textarea.value = text;

            document.body.appendChild(
                textarea
            );

            textarea.select();

            document.execCommand(
                'copy'
            );

            document.body.removeChild(
                textarea
            );

            this.innerHTML =
                '✅ تم نسخ النتيجة';

            this.classList.add(
                'copied'
            );

            setTimeout(() => {

                this.innerHTML =
                    '📋 نسخ النتيجة';

                this.classList.remove(
                    'copied'
                );

            }, 2000);
        }
    };

    messageDiv.appendChild(
        copyBtn
    );
}

// ============================================================
// اكتشاف لغة المستخدم
// ============================================================

function detectLanguage(text) {

    const arabic =
        (text.match(/[\u0600-\u06FF]/g) || [])
            .length;

    const cyrillic =
        (text.match(/[\u0400-\u04FF]/g) || [])
            .length;

    const latin =
        (text.match(/[A-Za-z]/g) || [])
            .length;

    if (arabic > latin && arabic > cyrillic) {
        return 'ar';
    }

    if (cyrillic > latin) {
        return 'ru';
    }

    return 'en';
}

// ============================================================
// تنظيف سؤال المستخدم
// ============================================================

function cleanQuery(query) {

    let text = query.trim();

    // إزالة علامات السؤال
    text = text.replace(/[؟?!]+$/g, '');

    // عبارات شائعة لا نحتاجها في البحث
    const removePatterns = [
        /^ما هي\s+/i,
        /^ما هو\s+/i,
        /^من هو\s+/i,
        /^من هي\s+/i,
        /^ما معنى\s+/i,
        /^ما المقصود ب\s+/i,
        /^ما المقصود بـ\s+/i,
        /^what is\s+/i,
        /^what are\s+/i,
        /^who is\s+/i,
        /^define\s+/i,
        /^what does\s+/i
    ];

    for (const pattern of removePatterns) {
        text = text.replace(pattern, '');
    }

    return text.trim();
}

// ============================================================
// تطبيع النص للمقارنة
// ============================================================

function normalizeText(text) {

    return (text || '')
        .toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// ============================================================
// استخراج كلمات مهمة
// ============================================================

function getKeywords(text) {

    const stopWords = new Set([

        // عربي
        'ما',
        'ماذا',
        'هي',
        'هو',
        'من',
        'عن',
        'في',
        'على',
        'الى',
        'إلى',
        'ماهي',
        'و',
        'او',
        'أو',
        'هل',
        'كيف',
        'لماذا',
        'هذا',
        'هذه',
        'ذلك',
        'تلك',
        'مع',
        'ل',
        'ب',
        'منها',
        'له',
        'لها',

        // English
        'what',
        'is',
        'are',
        'the',
        'a',
        'an',
        'of',
        'in',
        'on',
        'to',
        'for',
        'and',
        'or',
        'how',
        'why',
        'who'
    ]);

    return normalizeText(text)
        .split(/\s+/)
        .filter(word =>
            word.length >= 3 &&
            !stopWords.has(word)
        );
}

// ============================================================
// استخراج عبارات من النصوص
// ============================================================

function extractPhrases(text, query, language) {

    if (!text) {
        return [];
    }

    const results = [];

    const clean = text
        .replace(/\s+/g, ' ')
        .trim();

    // --------------------------------------------------------
    // 1. العنوان
    // --------------------------------------------------------

    if (query) {

        results.push({
            title:
                language === 'ar'
                    ? `ما هي ${query}؟`
                    : `What is ${query}?`,

            query: query,
            type: 'main'
        });
    }

    // --------------------------------------------------------
    // 2. استخراج العناوين أو الجمل
    // --------------------------------------------------------

    const sentences =
        clean
            .split(/[.!؟؛\n]+/)
            .map(s => s.trim())
            .filter(s => s.length >= 20)
            .slice(0, 15);

    const keywords =
        getKeywords(query);

    for (const sentence of sentences) {

        const normalized =
            normalizeText(sentence);

        let score = 0;

        keywords.forEach(keyword => {

            if (normalized.includes(keyword)) {
                score++;
            }

        });

        if (score > 0) {

            const shortSentence =
                sentence.length > 100
                    ? sentence.substring(0, 100) + '...'
                    : sentence;

            results.push({
                title: shortSentence,
                query: sentence,
                type: 'sentence',
                score
            });
        }
    }

    // --------------------------------------------------------
    // 3. عبارات تعليمية عامة
    // --------------------------------------------------------

    const templatesAr = [
        `تعريف ${query}`,
        `ما هي ${query}؟`,
        `خصائص ${query}`,
        `أنواع ${query}`,
        `استخدامات ${query}`,
        `فوائد ${query}`,
        `أهمية ${query}`,
        `معلومات عن ${query}`
    ];

    const templatesEn = [
        `Definition of ${query}`,
        `What is ${query}?`,
        `Characteristics of ${query}`,
        `Types of ${query}`,
        `Uses of ${query}`,
        `Benefits of ${query}`,
        `Importance of ${query}`,
        `Information about ${query}`
    ];

    const templates =
        language === 'ar'
            ? templatesAr
            : templatesEn;

    templates.forEach(title => {

        results.push({
            title,
            query: title,
            type: 'template'
        });

    });

    return results;
}

// ============================================================
// ويكيبيديا
// ============================================================

async function searchWikipedia(query, language) {

    try {

        const wikiLanguage =
            language === 'ar'
                ? 'ar'
                : language === 'en'
                    ? 'en'
                    : language;

        const searchUrl =
            `https://${wikiLanguage}.wikipedia.org/w/api.php` +
            `?action=query` +
            `&list=search` +
            `&srsearch=${encodeURIComponent(query)}` +
            `&format=json` +
            `&origin=*` +
            `&srlimit=${RESULTS_PER_SOURCE}`;

        const response =
            await fetch(searchUrl);

        if (!response.ok) {
            return [];
        }

        const data =
            await response.json();

        if (
            !data.query ||
            !data.query.search
        ) {
            return [];
        }

        return data.query.search.map(item => ({
            source: 'wikipedia',

            title: item.title,

            snippet:
                stripHtml(item.snippet || ''),

            pageTitle: item.title,

            url:
                `https://${wikiLanguage}.wikipedia.org/wiki/` +
                encodeURIComponent(
                    item.title.replace(/ /g, '_')
                )
        }));

    } catch (error) {

        console.error(
            'Wikipedia:',
            error
        );

        return [];
    }
}

// ============================================================
// جلب مقالة Wikipedia
// ============================================================

async function getWikipediaContent(
    title,
    language
) {

    try {

        const wikiLanguage =
            language === 'ar'
                ? 'ar'
                : language === 'en'
                    ? 'en'
                    : language;

        const contentUrl =
            `https://${wikiLanguage}.wikipedia.org/w/api.php` +
            `?action=query` +
            `&prop=extracts` +
            `&exintro` +
            `&explaintext` +
            `&titles=${encodeURIComponent(title)}` +
            `&format=json` +
            `&origin=*`;

        const response =
            await fetch(contentUrl);

        const data =
            await response.json();

        const pages =
            data.query.pages;

        const pageId =
            Object.keys(pages)[0];

        const page =
            pages[pageId];

        if (
            pageId === '-1' ||
            !page.extract
        ) {
            return {
                found: false
            };
        }

        let extract =
            page.extract;

        extract =
            extract.replace(
                /\[[0-9]+\]/g,
                ''
            );

        extract =
            extract.replace(
                /\s+/g,
                ' '
            );

        return {
            found: true,

            title:
                page.title,

            extract:
                extract.trim(),

            url:
                `https://${wikiLanguage}.wikipedia.org/wiki/` +
                encodeURIComponent(
                    page.title.replace(/ /g, '_')
                )
        };

    } catch (error) {

        console.error(
            'Wikipedia content:',
            error
        );

        return {
            found: false
        };
    }
}

// ============================================================
// OpenAlex
// ============================================================

async function searchOpenAlex(query) {

    try {

        const url =
            `https://api.openalex.org/works` +
            `?search=${encodeURIComponent(query)}` +
            `&per-page=${RESULTS_PER_SOURCE}`;

        const response =
            await fetch(url);

        if (!response.ok) {
            return [];
        }

        const data =
            await response.json();

        if (!data.results) {
            return [];
        }

        return data.results.map(item => {

            let abstract = '';

            // OpenAlex يخزن abstract أحيانًا
            // على شكل inverted index
            if (item.abstract_inverted_index) {

                const words = [];

                Object.entries(
                    item.abstract_inverted_index
                ).forEach(
                    ([word, positions]) => {

                        positions.forEach(
                            position => {
                                words[position] =
                                    word;
                            }
                        );
                    }
                );

                abstract =
                    words.join(' ');
            }

            return {

                source: 'openalex',

                title:
                    item.display_name ||
                    'بحث علمي',

                snippet:
                    abstract,

                pageTitle:
                    item.display_name,

                url:
                    item.primary_location &&
                    item.primary_location.landing_page_url
                        ? item.primary_location.landing_page_url
                        : item.doi || ''
            };
        });

    } catch (error) {

        console.error(
            'OpenAlex:',
            error
        );

        return [];
    }
}

// ============================================================
// Crossref
// ============================================================

async function searchCrossref(query) {

    try {

        const url =
            `https://api.crossref.org/v1/works` +
            `?query=${encodeURIComponent(query)}` +
            `&rows=${RESULTS_PER_SOURCE}` +
            `&select=DOI,title,abstract,URL,published,author`;

        const response =
            await fetch(url);

        if (!response.ok) {
            return [];
        }

        const data =
            await response.json();

        const items =
            data.message &&
            data.message.items
                ? data.message.items
                : [];

        return items.map(item => {

            let abstract =
                item.abstract || '';

            // تنظيف HTML الموجود أحيانًا
            abstract =
                stripHtml(abstract);

            const title =
                item.title &&
                item.title.length
                    ? item.title[0]
                    : 'بحث علمي';

            return {

                source: 'crossref',

                title,

                snippet:
                    abstract,

                pageTitle:
                    title,

                url:
                    item.URL ||
                    (
                        item.DOI
                            ? `https://doi.org/${item.DOI}`
                            : ''
                    )
            };
        });

    } catch (error) {

        console.error(
            'Crossref:',
            error
        );

        return [];
    }
}

// ============================================================
// Zenodo / ArabiXiv
// ============================================================

async function searchZenodo(
    query,
    language
) {

    try {

        let searchQuery =
            `"${query}"`;

        // عند البحث بالعربية نرفع أولوية
        // محتوى ArabiXiv إن أمكن عبر المجتمع
        // لكن لا نفترض معرف المجتمع في API.
        //
        // لذلك نستخدم بحث Zenodo العام،
        // وهو المصدر البرمجي الرسمي المتاح.

        const url =
            `https://zenodo.org/api/records` +
            `?q=${encodeURIComponent(searchQuery)}` +
            `&size=${RESULTS_PER_SOURCE}`;

        const response =
            await fetch(url);

        if (!response.ok) {
            return [];
        }

        const data =
            await response.json();

        const hits =
            data.hits &&
            data.hits.hits
                ? data.hits.hits
                : [];

        return hits.map(item => {

            const metadata =
                item.metadata || {};

            const description =
                metadata.description || '';

            return {

                source: 'zenodo',

                title:
                    metadata.title ||
                    'بحث علمي',

                snippet:
                    stripHtml(description),

                pageTitle:
                    metadata.title,

                url:
                    item.links &&
                    item.links.html
                        ? item.links.html
                        : `https://zenodo.org/records/${item.id}`
            };
        });

    } catch (error) {

        console.error(
            'Zenodo:',
            error
        );

        return [];
    }
}

// ============================================================
// إزالة HTML
// ============================================================

function stripHtml(text) {

    const div =
        document.createElement('div');

    div.innerHTML =
        text || '';

    return (
        div.textContent ||
        div.innerText ||
        ''
    )
        .replace(/\s+/g, ' ')
        .trim();
}

// ============================================================
// إزالة النتائج المتكررة
// ============================================================

function removeDuplicates(results) {

    const seen =
        new Set();

    return results.filter(item => {

        const key =
            normalizeText(
                item.title
            );

        if (!key) {
            return false;
        }

        if (seen.has(key)) {
            return false;
        }

        seen.add(key);

        return true;
    });
}

// ============================================================
// تجميع جميع المصادر
// ============================================================

async function searchAllSources(
    query,
    language
) {

    const searches = [];

    if (SOURCES.wikipedia) {
        searches.push(
            searchWikipedia(
                query,
                language
            )
        );
    }

    if (SOURCES.openalex) {
        searches.push(
            searchOpenAlex(query)
        );
    }

    if (SOURCES.crossref) {
        searches.push(
            searchCrossref(query)
        );
    }

    if (SOURCES.zenodo) {
        searches.push(
            searchZenodo(
                query,
                language
            )
        );
    }

    const responses =
        await Promise.allSettled(
            searches
        );

    let results = [];

    responses.forEach(result => {

        if (
            result.status ===
            'fulfilled' &&
            Array.isArray(result.value)
        ) {

            results =
                results.concat(
                    result.value
                );
        }

    });

    return removeDuplicates(
        results
    );
}

// ============================================================
// إنشاء الخيارات للمستخدم
// ============================================================

function buildUserOptions(
    results,
    query,
    language
) {

    const options = [];

    // --------------------------------------------------------
    // الخيار الأساسي
    // --------------------------------------------------------

    options.push({

        title:
            language === 'ar'
                ? `ما هي ${query}؟`
                : `What is ${query}?`,

        type: 'main',

        searchQuery: query,

        results: results
    });

    // --------------------------------------------------------
    // عناوين المصادر
    // --------------------------------------------------------

    results.forEach(result => {

        if (
            result.title &&
            result.title.length > 4
        ) {

            options.push({

                title:
                    result.title,

                type:
                    'source-title',

                searchQuery:
                    result.title,

                results: [result]
            });

        }

    });

    // --------------------------------------------------------
    // خيارات تعليمية
    // --------------------------------------------------------

    const templates =
        language === 'ar'
            ? [
                `تعريف ${query}`,
                `فوائد ${query}`,
                `استخدامات ${query}`,
                `خصائص ${query}`,
                `أنواع ${query}`,
                `أهمية ${query}`
            ]
            : [
                `Definition of ${query}`,
                `Benefits of ${query}`,
                `Uses of ${query}`,
                `Characteristics of ${query}`,
                `Types of ${query}`,
                `Importance of ${query}`
            ];

    templates.forEach(title => {

        options.push({

            title,

            type:
                'generated-topic',

            searchQuery:
                query,

            results
        });

    });

    // --------------------------------------------------------
    // إزالة التكرار
    // --------------------------------------------------------

    const seen =
        new Set();

    return options.filter(option => {

        const key =
            normalizeText(
                option.title
            );

        if (seen.has(key)) {
            return false;
        }

        seen.add(key);

        return true;

    }).slice(0, 12);
}

// ============================================================
// عرض الخيارات
// ============================================================

function showOptions(
    options,
    query,
    language
) {

    removeWelcome();

    const container =
        document.createElement('div');

    container.className =
        'options-container';

    const title =
        document.createElement('div');

    title.className =
        'options-title';

    title.textContent =
        language === 'ar'
            ? `🔍 اختر ما تريد معرفته عن "${query}":`
            : `🔍 Choose what you want to know about "${query}":`;

    container.appendChild(
        title
    );

    options.forEach(option => {

        const btn =
            document.createElement('button');

        btn.className =
            'option-btn';

        btn.textContent =
            option.title;

        btn.onclick = () =>
            handleOptionSelect(
                option,
                language
            );

        container.appendChild(
            btn
        );

    });

    chatArea.appendChild(
        container
    );

    chatArea.scrollTop =
        chatArea.scrollHeight;
}

// ============================================================
// معالجة اختيار المستخدم
// ============================================================

async function handleOptionSelect(
    option,
    language
) {

    const optionsContainer =
        chatArea.querySelector(
            '.options-container'
        );

    if (optionsContainer) {
        optionsContainer.remove();
    }

    await addMessageWithTyping(
        `📌 ${option.title}`,
        'user'
    );

    showTyping();

    let resultText = '';

    // ========================================================
    // الخيار الرئيسي
    // ========================================================

    if (
        option.type ===
        'main'
    ) {

        const wikiResults =
            await searchWikipedia(
                option.searchQuery,
                language
            );

        if (
            wikiResults.length
        ) {

            const first =
                wikiResults[0];

            const content =
                await getWikipediaContent(
                    first.pageTitle,
                    language
                );

            if (content.found) {

                resultText =
                    content.extract;
            }
        }

        // إذا لم نجد ويكيبيديا
        // نستخدم نتائج المصادر الأخرى

        if (!resultText) {

            resultText =
                buildTextFromResults(
                    option.results
                );
        }
    }

    // ========================================================
    // نتيجة مصدر محدد
    // ========================================================

    else if (
        option.type ===
        'source-title'
    ) {

        const result =
            option.results &&
            option.results[0];

        if (result) {

            resultText =
                result.snippet ||
                result.title;
        }
    }

    // ========================================================
    // موضوع تعليمي
    // ========================================================

    else {

        // إعادة البحث باستخدام الموضوع
        const topicResults =
            await searchAllSources(
                option.searchQuery,
                language
            );

        resultText =
            buildTextFromResults(
                topicResults
            );

        // في حال لم نجد محتوى
        if (!resultText) {

            const wikiResults =
                await searchWikipedia(
                    option.searchQuery,
                    language
                );

            if (
                wikiResults.length
            ) {

                const content =
                    await getWikipediaContent(
                        wikiResults[0].pageTitle,
                        language
                    );

                if (content.found) {
                    resultText =
                        content.extract;
                }
            }
        }
    }

    hideTyping();

    if (resultText) {

        await addMessageWithTyping(
            resultText,
            'bot'
        );

    } else {

        await addMessageWithTyping(

            language === 'ar'
                ? 'عذراً، لم أجد محتوى مناسباً لهذا الموضوع حالياً. حاول اختيار موضوع آخر.'
                : 'Sorry, I could not find suitable information for this topic. Please try another topic.',

            'bot'
        );
    }
}

// ============================================================
// بناء النص من نتائج المصادر
// ============================================================

function buildTextFromResults(
    results
) {

    if (
        !results ||
        !results.length
    ) {
        return '';
    }

    const texts = [];

    results.forEach(result => {

        const text =
            result.snippet ||
            '';

        if (
            text &&
            text.length > 30
        ) {

            texts.push(
                text.trim()
            );
        }

    });

    // إزالة النصوص المتشابهة
    const unique =
        removeDuplicates(
            texts.map(text => ({
                title: text,
                snippet: text
            }))
        );

    let finalText = '';

    unique
        .slice(0, 4)
        .forEach(item => {

            finalText +=
                item.snippet +
                '\n\n';

        });

    return finalText
        .trim();
}

// ============================================================
// مؤشر التحميل
// ============================================================

function showTyping() {

    const indicator =
        document.createElement(
            'div'
        );

    indicator.className =
        'typing-indicator';

    indicator.id =
        'typingIndicator';

    indicator.innerHTML =
        '<span></span><span></span><span></span>';

    chatArea.appendChild(
        indicator
    );

    chatArea.scrollTop =
        chatArea.scrollHeight;
}

function hideTyping() {

    const indicator =
        document.getElementById(
            'typingIndicator'
        );

    if (indicator) {
        indicator.remove();
    }
}

// ============================================================
// معالجة سؤال المستخدم
// ============================================================

async function handleSend() {

    if (isProcessing) {
        return;
    }

    const text =
        input.value.trim();

    if (!text) {
        return;
    }

    isProcessing = true;

    sendBtn.disabled = true;

    // --------------------------------------------------------
    // عرض السؤال
    // --------------------------------------------------------

    await addMessageWithTyping(
        text,
        'user'
    );

    input.value = '';

    input.focus();

    // --------------------------------------------------------
    // اكتشاف اللغة
    // --------------------------------------------------------

    const language =
        detectLanguage(text);

    // --------------------------------------------------------
    // تنظيف السؤال
    // --------------------------------------------------------

    const query =
        cleanQuery(text);

    if (!query) {

        await addMessageWithTyping(

            language === 'ar'
                ? 'اكتب الموضوع الذي تريد البحث عنه.'
                : 'Please enter a topic to search for.',

            'bot'
        );

        isProcessing = false;
        sendBtn.disabled = false;

        return;
    }

    // --------------------------------------------------------
    // تحميل
    // --------------------------------------------------------

    showTyping();

    // --------------------------------------------------------
    // البحث في جميع المصادر
    // --------------------------------------------------------

    const results =
        await searchAllSources(
            query,
            language
        );

    hideTyping();

    // --------------------------------------------------------
    // لا توجد نتائج
    // --------------------------------------------------------

    if (
        !results ||
        results.length === 0
    ) {

        await addMessageWithTyping(

            language === 'ar'
                ? 'عذراً، لم أجد معلومات عن هذا الموضوع حالياً. حاول استخدام كلمات مختلفة.'
                : 'Sorry, I could not find information about this topic. Try different keywords.',

            'bot'
        );

        isProcessing = false;

        sendBtn.disabled = false;

        return;
    }

    // --------------------------------------------------------
    // بناء خيارات المستخدم
    // --------------------------------------------------------

    const options =
        buildUserOptions(
            results,
            query,
            language
        );

    showOptions(
        options,
        query,
        language
    );

    isProcessing = false;

    sendBtn.disabled = false;
}

// ============================================================
// الأحداث
// ============================================================

sendBtn.addEventListener(
    'click',
    handleSend
);

input.addEventListener(
    'keydown',
    (e) => {

        if (
            e.key === 'Enter' &&
            !e.shiftKey
        ) {

            e.preventDefault();

            handleSend();
        }
    }
);

// ============================================================
// التركيز التلقائي
// ============================================================

setTimeout(() => {

    input.focus();

}, 100);

// ============================================================
// Console
// ============================================================

console.log(
    '🚀 KeFo AI - Multi Source Search Engine'
);

console.log(
    '📚 Wikipedia + OpenAlex + Crossref + Zenodo'
);

console.log(
    '🌍 Language detection enabled'
);

console.log(
    '📋 Copy result enabled'
);

console.log(
    '© 2026 KeFo.tech'
);