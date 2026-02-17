import React, { useState, useRef, useEffect } from 'react';
import styles from '../pages/docs_chat.module.css';
import { NODES } from '../data/docsData';

interface Message {
    id: string;
    text: string;
    sender: 'bot' | 'user';
    links?: { id: string; title: string }[];
}

interface DocsChatProps {
    onNavigate: (nodeId: string) => void;
}

// Intent Logic: Simple keyword matching for smarter responses
const checkIntent = (query: string) => {
    const q = query.toLowerCase();

    // 1. Google Drive & Dosya
    if (q.includes('drive') || (q.includes('google') && q.includes('dosya'))) {
        const related = NODES.filter(n => n.title.toLowerCase().includes('drive'));
        return {
            text: "Google Drive dosyalarınızı yönetmek için 'Google Drive' düğümlerini kullanabilirsiniz. Dosya yüklemek için 'Upload', listelemek için 'List' düğümünü seçin. Bağlantı sorunu yaşıyorsanız hesabınızı yeniden yetkilendirmeyi deneyin.",
            links: related.map(n => ({ id: n.id, title: n.title }))
        };
    }

    // 2. WhatsApp
    if (q.includes('whatsapp') || q.includes('mesaj')) {
        const related = NODES.filter(n => n.title.toLowerCase().includes('whatsapp'));
        return {
            text: "WhatsApp entegrasyonu ile otomatik mesaj atabilirsiniz. Mesaj gitmiyorsa 'Servis Durumu'nun 'Connected' olduğundan emin olun.",
            links: related.map(n => ({ id: n.id, title: n.title }))
        };
    }

    // 3. Excel / Sheets
    if (q.includes('excel') || q.includes('sheet') || q.includes('tablo')) {
        const related = NODES.filter(n => n.title.toLowerCase().includes('sheet'));
        return {
            text: "Verilerinizi Google Sheets veya Excel'e kaydetmek için 'Add Row' düğümünü kullanın. Veri okumak için 'Read Sheet' düğümü mevcuttur.",
            links: related.map(n => ({ id: n.id, title: n.title }))
        };
    }

    // 4. Zamanlayıcı / Cron
    if (q.includes('zaman') || q.includes('saat') || q.includes('her gün') || q.includes('cron')) {
        const related = NODES.filter(n => n.title.toLowerCase().includes('cron'));
        return {
            text: "Periyodik işlemler (her sabah, her saat başı vb.) için 'Cron Job' tetikleyicisini kullanabilirsiniz.",
            links: related.map(n => ({ id: n.id, title: n.title }))
        };
    }

    // 5. AI / Yapay Zeka
    if (q.includes('ai') || q.includes('zeka') || q.includes('gpt')) {
        const related = NODES.filter(n => n.type === 'ai' || n.title.toLowerCase().includes('ai'));
        return {
            text: "AI Agent ve Text Generator düğümleri ile GPT-4 veya Gemini modellerini kullanabilirsiniz.",
            links: related.slice(0, 3).map(n => ({ id: n.id, title: n.title }))
        };
    }

    return null;
};

const DocsChat: React.FC<DocsChatProps> = ({ onNavigate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', text: '👋 Merhaba! BreviAI dokümantasyon asistanıyım. "Drive nasıl bağlanır?", "WhatsApp mesaj sorunu" gibi konularda yardımcı olabilirim.', sender: 'bot' }
    ]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
        console.log('DocsChat v2.1 Activated');
    }, [messages, isOpen]);

    const handleSend = () => {
        if (!input.trim()) return;

        const userMsg: Message = { id: Date.now().toString(), text: input, sender: 'user' };
        setMessages(prev => [...prev, userMsg]);
        setInput('');

        const query = input.toLowerCase();

        // Simulate thinking delay
        setTimeout(() => {
            let botText = '';
            let links: { id: string, title: string }[] = [];

            // 1. Intent Check
            const intent = checkIntent(query);
            if (intent) {
                botText = intent.text;
                links = intent.links || [];
            } else {
                // 2. Search Fallback
                const results = NODES.filter(n =>
                    n.title.toLowerCase().includes(query) ||
                    n.summary.toLowerCase().includes(query) ||
                    (n.tags && n.tags.some(t => t.includes(query)))
                ).slice(0, 3);

                if (results.length > 0) {
                    botText = 'Aradığınız konuyla ilgili şunları buldum:';
                    links = results.map(n => ({ id: n.id, title: n.title }));
                } else {
                    // 3. Conversational Fallback
                    if (query.includes('merhaba') || query.includes('selam')) {
                        botText = 'Merhaba! Size nasıl yardımcı olabilirim?';
                    } else if (query.includes('teşekkür')) {
                        botText = 'Rica ederim! Başka sorunuz var mı?';
                    } else if (query.includes('hata')) {
                        botText = 'Hata kodlarıyla ilgili detaylar için "SSS & Hata" bölümüne bakabilirsiniz.';
                    } else {
                        botText = 'Üzgünüm, bunu tam anlayamadım. Lütfen "Drive", "WhatsApp", "API" gibi anahtar kelimeler kullanmayı deneyin.';
                    }
                }
            }

            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                text: botText,
                sender: 'bot',
                links
            }]);
        }, 700);
    };

    return (
        <>
            {/* FAB Button */}
            {!isOpen && (
                <button className={styles.chatFab} onClick={() => setIsOpen(true)}>
                    💬
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className={styles.chatWindow}>
                    <div className={styles.chatHeader}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.2rem' }}>🤖</span>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 600 }}>Docs Asistan</span>
                                <span style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 400 }}>Online</span>
                            </div>
                        </span>
                        <button
                            onClick={() => setIsOpen(false)}
                            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem', opacity: 0.7 }}
                        >
                            ✕
                        </button>
                    </div>

                    <div className={styles.chatMessages}>
                        {messages.map(msg => (
                            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                                <div className={`${styles.msg} ${msg.sender === 'user' ? styles.msgUser : styles.msgBot}`}>
                                    {msg.text}
                                </div>
                                {msg.links && msg.links.length > 0 && (
                                    <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '100%' }}>
                                        {msg.links.map(link => (
                                            <button
                                                key={link.id}
                                                onClick={() => onNavigate(link.id)}
                                                style={{
                                                    background: 'rgba(255, 255, 255, 0.05)',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                    color: '#A5B4FC',
                                                    padding: '0.6rem 0.8rem',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.85rem',
                                                    textAlign: 'left',
                                                    transition: 'all 0.2s',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                                                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                                            >
                                                <span>📄</span> {link.title}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className={styles.chatInputArea}>
                        <input
                            className={styles.chatInput}
                            placeholder="Bir şeyler sorun... (Örn: Drive bağla)"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <button className={styles.chatSendBtn} onClick={handleSend} disabled={!input.trim()}>
                            ➤
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default DocsChat;
