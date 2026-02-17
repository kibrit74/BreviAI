
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

const DocsChat: React.FC<DocsChatProps> = ({ onNavigate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', text: '👋 Merhaba! BreviAI dokümantasyon asistanıyım. Ne aramıştınız?', sender: 'bot' }
    ]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = () => {
        if (!input.trim()) return;

        const userMsg: Message = { id: Date.now().toString(), text: input, sender: 'user' };
        setMessages(prev => [...prev, userMsg]);
        setInput('');

        // Simple Search Logic
        const query = input.toLowerCase();
        const results = NODES.filter(n =>
            n.title.toLowerCase().includes(query) ||
            n.tags.some(t => t.includes(query)) ||
            n.summary.toLowerCase().includes(query)
        ).slice(0, 3); // Top 3 results

        setTimeout(() => {
            let botText = '';
            let links: { id: string, title: string }[] = [];

            if (results.length > 0) {
                botText = `Şunları buldum:`;
                links = results.map(n => ({ id: n.id, title: n.title }));
            } else {
                // Fallback check for common keywords
                if (query.includes('fiyat') || query.includes('ücret')) {
                    botText = 'Fiyatlandırma hakkında bilgi için ana sayfadaki "Pricing" bölümüne bakabilirsiniz.';
                } else if (query.includes('destek') || query.includes('iletişim')) {
                    botText = 'Destek için support@breviai.com adresine mail atabilirsiniz.';
                } else {
                    botText = 'Üzgünüm, bununla ilgili doğrudan bir düğüm bulamadım. Farklı bir kelime dener misiniz?';
                }
            }

            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                text: botText,
                sender: 'bot',
                links
            }]);
        }, 600);
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
                        <span>🤖 Docs Asistan</span>
                        <button
                            onClick={() => setIsOpen(false)}
                            style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '1.2rem' }}
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
                                    <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        {msg.links.map(link => (
                                            <button
                                                key={link.id}
                                                onClick={() => onNavigate(link.id)}
                                                style={{
                                                    background: '#374151',
                                                    border: '1px solid #4B5563',
                                                    color: '#60A5FA',
                                                    padding: '0.4rem 0.8rem',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.85rem',
                                                    textAlign: 'left'
                                                }}
                                            >
                                                👉 {link.title}
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
                            placeholder="Bir şeyler sorun..."
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
