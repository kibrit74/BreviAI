import { ShortcutTemplate } from '../types';

// Helper to generate template safely
const createOpenAppTemplate = (
    id: string,
    name: string,
    pkg: string,
    category: ShortcutTemplate['category'],
    tags: string[],
    descTr?: string,
    descEn?: string
): ShortcutTemplate => ({
    id: `app-${id}`,
    title: name,
    title_en: name,
    description: descTr || `${name} uygulamasını açar.`,
    description_en: descEn || `Opens ${name} application.`,
    category,
    author: 'BreviAI',
    downloads: '10k+',
    tags: [...tags, 'uygulama', 'app', name.toLowerCase()],
    template_json: {
        shortcut_name: name,
        steps: [
            {
                step_id: 1,
                type: 'INTENT_ACTION',
                action: 'OPEN_APP',
                params: { package_name: pkg }
            }
        ]
    }
});

export const POPULAR_APPS_TEMPLATES: ShortcutTemplate[] = [
    // --- SOCIAL & COMMUNICATION ---
    createOpenAppTemplate('soc-1', 'Instagram', 'com.instagram.android', 'Social', ['sosyal', 'fotoğraf']),
    createOpenAppTemplate('soc-2', 'WhatsApp', 'com.whatsapp', 'Social', ['mesaj', 'arama']),
    createOpenAppTemplate('soc-3', 'Twitter / X', 'com.twitter.android', 'Social', ['haber', 'tweed']),
    createOpenAppTemplate('soc-4', 'TikTok', 'com.zhiliaoapp.musically', 'Social', ['video', 'trend']),
    createOpenAppTemplate('soc-5', 'Facebook', 'com.facebook.katana', 'Social', ['sosyal', 'arkadaş']),
    createOpenAppTemplate('soc-6', 'Messenger', 'com.facebook.orca', 'Social', ['mesaj']),
    createOpenAppTemplate('soc-7', 'Telegram', 'org.telegram.messenger', 'Social', ['mesaj', 'güvenli']),
    createOpenAppTemplate('soc-8', 'Snapchat', 'com.snapchat.android', 'Social', ['fotoğraf', 'efekt']),
    createOpenAppTemplate('soc-9', 'LinkedIn', 'com.linkedin.android', 'Social', ['iş', 'kariyer']),
    createOpenAppTemplate('soc-10', 'Pinterest', 'com.pinterest', 'Social', ['fikir', 'resim']),
    createOpenAppTemplate('soc-11', 'Discord', 'com.discord', 'Social', ['oyun', 'sohbet']),
    createOpenAppTemplate('soc-12', 'Reddit', 'com.reddit.frontpage', 'Social', ['forum', 'tartışma']),
    createOpenAppTemplate('soc-13', 'Signal', 'org.thoughtcrime.securesms', 'Social', ['güvenli', 'mesaj']),
    createOpenAppTemplate('soc-14', 'Skype', 'com.skype.raider', 'Social', ['görüntülü', 'toplantı']),
    createOpenAppTemplate('soc-15', 'Zoom', 'us.zoom.videomeetings', 'Social', ['toplantı', 'konferans']),
    createOpenAppTemplate('soc-16', 'Bip', 'com.turkcell.bip', 'Social', ['mesaj', 'yerli', 'türkcell']),
    createOpenAppTemplate('soc-17', 'Threads', 'com.instagram.barcelona', 'Social', ['yazı', 'sosyal']),

    // --- GOOGLE ESSENTIALS ---
    createOpenAppTemplate('goog-1', 'YouTube', 'com.google.android.youtube', 'Lifestyle', ['video', 'izle']),
    createOpenAppTemplate('goog-2', 'Google Maps', 'com.google.android.apps.maps', 'Travel', ['harita', 'navigasyon']),
    createOpenAppTemplate('goog-3', 'Gmail', 'com.google.android.gm', 'Productivity', ['e-posta', 'mail']),
    createOpenAppTemplate('goog-4', 'Chrome', 'com.android.chrome', 'Productivity', ['internet', 'tarayıcı']),
    createOpenAppTemplate('goog-5', 'Google Photos', 'com.google.android.apps.photos', 'Lifestyle', ['resim', 'yedek']),
    createOpenAppTemplate('goog-6', 'Google Drive', 'com.google.android.apps.docs', 'Productivity', ['dosya', 'bulut']),
    createOpenAppTemplate('goog-7', 'Google Calendar', 'com.google.android.calendar', 'Productivity', ['takvim', 'plan']),
    createOpenAppTemplate('goog-8', 'Google Keep', 'com.google.android.keep', 'Productivity', ['not', 'hatırlatıcı']),
    createOpenAppTemplate('goog-9', 'Google Translate', 'com.google.android.apps.translate', 'Travel', ['çeviri', 'dil']),
    createOpenAppTemplate('goog-10', 'Google Play Store', 'com.android.vending', 'Productivity', ['mağaza', 'indirme']),

    // --- TURKISH SHOPPING & EXTRAS ---
    createOpenAppTemplate('tr-1', 'Trendyol', 'com.trendyol.ymc', 'Lifestyle', ['alışveriş', 'moda']),
    createOpenAppTemplate('tr-2', 'Hepsiburada', 'com.pozitron.hepsiburada', 'Lifestyle', ['alışveriş', 'market']),
    createOpenAppTemplate('tr-3', 'Yemeksepeti', 'com.inovel.app.qmobile', 'Lifestyle', ['yemek', 'sipariş']),
    createOpenAppTemplate('tr-4', 'Getir', 'com.getir.getir', 'Lifestyle', ['market', 'hızlı']),
    createOpenAppTemplate('tr-5', 'Sahibinden', 'com.sahibinden', 'Lifestyle', ['emlak', 'oto', 'ikinci el']),
    createOpenAppTemplate('tr-6', 'Letgo', 'com.abtnprojects.ambatana', 'Lifestyle', ['ikinci el', 'satış']),
    createOpenAppTemplate('tr-7', 'Dolap', 'com.dolap.android', 'Lifestyle', ['moda', 'ikinci el']),
    createOpenAppTemplate('tr-8', 'ÇiçekSepeti', 'com.ciceksepeti.ciceksepeti', 'Lifestyle', ['hediye', 'çiçek']),
    createOpenAppTemplate('tr-9', 'n11', 'com.n11.app', 'Lifestyle', ['alışveriş']),
    createOpenAppTemplate('tr-10', 'Amazon TR', 'com.amazon.mShop.android.shopping', 'Lifestyle', ['alışveriş']),
    createOpenAppTemplate('tr-11', 'Migros Sanal Market', 'com.migros.sanalmarket', 'Lifestyle', ['market']),
    createOpenAppTemplate('tr-12', 'Şok Market', 'com.sokmarket.cepte', 'Lifestyle', ['market']),
    createOpenAppTemplate('tr-13', 'A101 Plus', 'com.a101.a101plus', 'Lifestyle', ['market']),
    createOpenAppTemplate('tr-14', 'Bim', 'com.bim.bimmarket', 'Lifestyle', ['market']),

    // --- TURKISH UTILITIES & GOVT ---
    createOpenAppTemplate('tr-util-1', 'E-Devlet', 'tr.gov.turkiye.edevlet.kapisi', 'Productivity', ['devlet', 'resmi']),
    createOpenAppTemplate('tr-util-2', 'MHRS', 'tr.gov.saglik.mhrs', 'Health', ['randevu', 'hastane']),
    createOpenAppTemplate('tr-util-3', 'E-Nabız', 'tr.gov.saglik.enabiz', 'Health', ['sağlık', 'sonuç']),
    createOpenAppTemplate('tr-util-4', 'Kades', 'tr.gov.egm.kades', 'Security', ['güvenlik', 'acil']),
    createOpenAppTemplate('tr-util-5', '112 Acil', 'tr.gov.saglik.acilyardim', 'Security', ['acil', 'yardım']),

    // --- TURKISH FINANCE ---
    createOpenAppTemplate('fin-1', 'Ziraat Mobil', 'com.ziraat.ziraatmobil', 'Productivity', ['banka', 'finans']),
    createOpenAppTemplate('fin-2', 'Garanti BBVA', 'com.garanti.cepsubesi', 'Productivity', ['banka', 'finans']),
    createOpenAppTemplate('fin-3', 'İşCep', 'com.isomer.iscep', 'Productivity', ['banka', 'finans']),
    createOpenAppTemplate('fin-4', 'Akbank', 'com.akbank.android.apps.akbank_direkt', 'Productivity', ['banka', 'finans']),
    createOpenAppTemplate('fin-5', 'Yapı Kredi', 'com.yapikredi.mobile', 'Productivity', ['banka', 'finans']),
    createOpenAppTemplate('fin-6', 'Papara', 'com.mobillium.papara', 'Productivity', ['cüzdan', 'kart']),
    createOpenAppTemplate('fin-7', 'Enpara', 'com.finansbank.enpara', 'Productivity', ['banka', 'masrafsız']),
    createOpenAppTemplate('fin-8', 'Halkbank', 'com.halkbank.halkbankmobile', 'Productivity', ['banka']),
    createOpenAppTemplate('fin-9', 'VakıfBank', 'com.vakifbank.mobile', 'Productivity', ['banka']),
    createOpenAppTemplate('fin-10', 'QNB Finansbank', 'com.finansbank.mobile', 'Productivity', ['banka']),
    createOpenAppTemplate('fin-11', 'DenizBank', 'com.denizbank.mobilbankacilik', 'Productivity', ['banka']),

    // --- ENTERTAINMENT & MUSIC ---
    createOpenAppTemplate('ent-1', 'Spotify', 'com.spotify.music', 'Lifestyle', ['müzik', 'şarkı']),
    createOpenAppTemplate('ent-2', 'Netflix', 'com.netflix.mediaclient', 'Lifestyle', ['film', 'dizi']),
    createOpenAppTemplate('ent-3', 'Disney+', 'com.disney.disneyplus', 'Lifestyle', ['film', 'dizi']),
    createOpenAppTemplate('ent-4', 'Amazon Prime Video', 'com.amazon.avod.thirdpartyclient', 'Lifestyle', ['film', 'dizi']),
    createOpenAppTemplate('ent-5', 'YouTube Music', 'com.google.android.apps.youtube.music', 'Lifestyle', ['müzik']),
    createOpenAppTemplate('ent-6', 'Shazam', 'com.shazam.android', 'Lifestyle', ['müzik', 'bulma']),
    createOpenAppTemplate('ent-7', 'SoundCloud', 'com.soundcloud.android', 'Lifestyle', ['müzik', 'bağımsız']),
    createOpenAppTemplate('ent-8', 'Deezer', 'deezer.android.app', 'Lifestyle', ['müzik']),
    createOpenAppTemplate('ent-9', 'BluTV', 'com.blutv', 'Lifestyle', ['dizi', 'yerli', 'film']),
    createOpenAppTemplate('ent-10', 'Exxen', 'com.exxen.android', 'Lifestyle', ['dizi', 'maç', 'acun']),
    createOpenAppTemplate('ent-11', 'PuhuTV', 'com.dogus.puhutv', 'Lifestyle', ['dizi', 'yerli']),
    createOpenAppTemplate('ent-12', 'Turkcell TV+', 'com.turkcell.tvplus', 'Lifestyle', ['tv', 'kanal']),
    createOpenAppTemplate('ent-13', 'beIN CONNECT', 'com.digiturk.webtv', 'Lifestyle', ['maç', 'futbol']),

    // --- TRAVEL & TRANSPORT ---
    createOpenAppTemplate('trav-1', 'BiTaksi', 'com.bitaksi.musteri', 'Travel', ['taksi', 'ulaşım']),
    createOpenAppTemplate('trav-2', 'Martı', 'com.martitech.marti', 'Travel', ['scooter', 'elektrikli']),
    createOpenAppTemplate('trav-3', 'BlaBlaCar', 'com.comuto', 'Travel', ['yolculuk', 'paylaşım']),
    createOpenAppTemplate('trav-4', 'Uber', 'com.ubercab', 'Travel', ['taksi', 'ulaşım']),
    createOpenAppTemplate('trav-5', 'Waze', 'com.waze', 'Travel', ['navigasyon', 'trafik']),
    createOpenAppTemplate('trav-6', 'Google Earth', 'com.google.earth', 'Travel', ['dünya', 'harita']),
    createOpenAppTemplate('trav-7', 'Booking.com', 'com.booking', 'Travel', ['otel', 'tatil']),
    createOpenAppTemplate('trav-8', 'Airbnb', 'com.airbnb.android', 'Travel', ['konaklama', 'tatil']),
    createOpenAppTemplate('trav-9', 'Obilet', 'com.obilet.androidside', 'Travel', ['bilet', 'otobüs', 'uçak']),

    // --- UTILITIES & TOOLS ---
    createOpenAppTemplate('tool-1', 'ChatGPT', 'com.openai.chatgpt', 'Productivity', ['ai', 'yapay zeka']),
    createOpenAppTemplate('tool-2', 'Adobe Reader', 'com.adobe.reader', 'Productivity', ['pdf', 'belge']),
    createOpenAppTemplate('tool-3', 'CamScanner', 'com.intsig.camscanner', 'Productivity', ['tarama', 'scan']),
    createOpenAppTemplate('tool-4', 'VLC', 'org.videolan.vlc', 'Lifestyle', ['video', 'oynatıcı']),
    createOpenAppTemplate('tool-5', 'RAR', 'com.rarlab.rar', 'Productivity', ['zip', 'dosya']),
    createOpenAppTemplate('tool-6', 'Zedge', 'net.zedge.android', 'Lifestyle', ['duvar kağıdı', 'zil sesi']),
    createOpenAppTemplate('tool-7', 'Truecaller', 'com.truecaller', 'Security', ['arama', 'spam']),
    createOpenAppTemplate('tool-8', 'Speedtest', 'org.zwanoo.android.speedtest', 'Productivity', ['hız', 'internet']),
    createOpenAppTemplate('tool-9', 'QR Scanner', 'com.gamma.scan', 'Productivity', ['kod', 'barkod']),
    createOpenAppTemplate('tool-10', 'Microsoft Word', 'com.microsoft.office.word', 'Productivity', ['belge', 'yazı']),
    createOpenAppTemplate('tool-11', 'Microsoft Excel', 'com.microsoft.office.excel', 'Productivity', ['tablo', 'hesap']),
    createOpenAppTemplate('tool-12', 'Canva', 'com.canva.editor', 'Productivity', ['tasarım', 'logo']),
    createOpenAppTemplate('tool-13', 'CapCut', 'com.lemon.lvoverseas', 'Lifestyle', ['video', 'edit']),
    createOpenAppTemplate('tool-14', 'MX Player', 'com.mxtech.videoplayer.ad', 'Lifestyle', ['video', 'oynatıcı']),
    createOpenAppTemplate('tool-15', 'File Manager', 'com.xiaomi.mifilemanager', 'Productivity', ['dosya', 'yönetici']),

    // --- GAMES ---
    createOpenAppTemplate('game-1', 'PUBG Mobile', 'com.tencent.ig', 'Lifestyle', ['oyun', 'silah']),
    createOpenAppTemplate('game-2', 'Roblox', 'com.roblox.client', 'Lifestyle', ['oyun', 'çocuk']),
    createOpenAppTemplate('game-3', 'Subway Surfers', 'com.kiloo.subwaysurfers', 'Lifestyle', ['oyun', 'koşu']),
    createOpenAppTemplate('game-4', 'Candy Crush', 'com.king.candycrushsaga', 'Lifestyle', ['oyun', 'şeker']),
    createOpenAppTemplate('game-5', 'Clash of Clans', 'com.supercell.clashofclans', 'Lifestyle', ['oyun', 'strateji']),
    createOpenAppTemplate('game-6', 'Brawl Stars', 'com.supercell.brawlstars', 'Lifestyle', ['oyun', 'savaş']),
    createOpenAppTemplate('game-7', 'Minecraft', 'com.mojang.minecraftpe', 'Lifestyle', ['oyun', 'blok']),
    createOpenAppTemplate('game-8', 'Pokemon GO', 'com.nianticlabs.pokemongo', 'Lifestyle', ['oyun', 'gezme']),
    createOpenAppTemplate('game-9', 'Kafa Topu 2', 'com.masomo.headball2', 'Lifestyle', ['oyun', 'futbol', 'yerli']),
    createOpenAppTemplate('game-10', '101 Okey Plus', 'net.peakgames.mobile.okeyplus.android', 'Lifestyle', ['oyun', 'okey', 'kağıt']),

    // --- NEWS ---
    createOpenAppTemplate('news-1', 'Mynet', 'com.mynet.mobile', 'Lifestyle', ['haber', 'gündem']),
    createOpenAppTemplate('news-2', 'Son Dakika', 'com.sondakika.android', 'Lifestyle', ['haber', 'son dakika']),
    createOpenAppTemplate('news-3', 'HaberTürk', 'com.cinergroup.haberturk', 'Lifestyle', ['haber', 'gazete']),
    createOpenAppTemplate('news-4', 'Bundle', 'com.dttd.bundle', 'Lifestyle', ['haber', 'toplayıcı']),
    createOpenAppTemplate('news-5', 'Onedio', 'com.onedio.android', 'Lifestyle', ['içerik', 'test', 'eğlence']),

    // --- MORE TURKISH ESSENTIALS ---
    createOpenAppTemplate('tr-more-1', 'Vodafone Yanımda', 'com.vodafone.selfservis', 'Productivity', ['operatör', 'fatura']),
    createOpenAppTemplate('tr-more-2', 'Türk Telekom', 'com.ttnet.wc', 'Productivity', ['operatör', 'fatura', 'internet']),
    createOpenAppTemplate('tr-more-3', 'E-Okul Veli', 'com.meb.eokulveli', 'Productivity', ['okul', 'not', 'öğrenci']),
    createOpenAppTemplate('tr-more-4', 'Hayat Eve Sığar', 'tr.gov.saglik.hayatevesigar', 'Health', ['sağlık', 'aşı', 'hes']),
    createOpenAppTemplate('tr-more-5', 'Google Meet', 'com.google.android.apps.meetings', 'Social', ['toplantı', 'video']),
    createOpenAppTemplate('tr-more-6', 'Yandex Navi', 'ru.yandex.yandexnavi', 'Travel', ['navigasyon', 'yol', 'trafik']),
    createOpenAppTemplate('tr-more-7', 'Fizy', 'com.turkcell.fizy', 'Lifestyle', ['müzik', 'yerli', 'türkcell']),
    createOpenAppTemplate('tr-more-8', 'Storytel', 'com.storytel.app', 'Lifestyle', ['kitap', 'sesli']),
    createOpenAppTemplate('tr-more-9', 'Yemeksepeti Mahalle', 'com.inovel.app.qmobile', 'Lifestyle', ['market', 'yemek']), // Same package, alias
    createOpenAppTemplate('tr-more-10', 'Getir Büyük', 'com.getir.getir', 'Lifestyle', ['market', 'büyük']), // Same package, alias
    createOpenAppTemplate('tr-more-11', 'Starbucks TR', 'com.starbucks.tr', 'Lifestyle', ['kahve', 'ödül']),
    createOpenAppTemplate('tr-more-12', 'Kahve Dünyası', 'com.kahvedunyasi.app', 'Lifestyle', ['kahve', 'çekirdek']),
    createOpenAppTemplate('tr-more-13', 'Maçkolik', 'com.kokteyl.mackolik', 'Lifestyle', ['spor', 'skor', 'iddaa']),
    createOpenAppTemplate('tr-more-14', 'Nesine', 'com.pordiva.nesine', 'Lifestyle', ['bahis', 'iddaa', 'sans']),
    createOpenAppTemplate('tr-more-15', 'Sahadan', 'com.kokteyl.sahadan', 'Lifestyle', ['spor', 'skor']),

    // --- CUSTOM APP LAUNCHER ---
    {
        id: 'custom-app-1',
        title: 'Özel Uygulama Aç',
        title_en: 'Open Custom App',
        description: 'İstediğiniz uygulamanın adını yazarak açın (veya Store\'da arayın).',
        description_en: 'Open any app by typing its name (or search in Store).',
        category: 'Productivity',
        author: 'BreviAI',
        downloads: '∞',
        tags: ['özel', 'herhangi', 'bul', 'aç'],
        template_json: {
            shortcut_name: "Uygulama Aç",
            steps: [
                {
                    step_id: 1,
                    type: "INTENT_ACTION",
                    action: "OPEN_APP",
                    params: {
                        package_name: "", // Left empty to trigger fallback
                        app_name: "Uygulama Adı" // Placeholder for user input? Or we rely on AI to fill this? 
                        // Actually if this is a template, the user expects to fill it.
                        // Our engine executes what is saved.
                        // If 'package_name' is empty, we must use 'app_name' or prompt user.
                    }
                }
            ]
        }
    }
];
