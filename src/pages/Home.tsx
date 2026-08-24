import { Link } from 'react-router-dom';
import { 
    FaImage, 
    FaFilePdf, 
    FaExpandArrowsAlt, 
    FaRandom, 
    FaCut, 
    FaLayerGroup, 
    FaFileImage, 
    FaMinusCircle,
    FaBolt,
    FaShieldAlt,
    FaArrowRight,
    FaSlidersH,
    FaCheckCircle
} from 'react-icons/fa';
import { SEO } from '../components/SEO';

export const Home = () => {
    const tools = [
        {
            id: 'compress',
            name: 'Image Compressor',
            category: 'Image Tools',
            desc: 'Precision target size matching (e.g. 20KB, 50KB, 100KB) with adaptive bicubic scaling.',
            icon: <FaImage />,
            path: '/tools/compress',
            badge: 'High Precision',
            color: '#ff2a44',
            glowColor: 'rgba(255, 42, 68, 0.45)'
        },
        {
            id: 'pdf-studio',
            name: 'All-in-One PDF Studio',
            category: 'PDF Tools',
            desc: 'Organize, merge, rotate, reorder, and delete pages visually across multiple documents.',
            icon: <FaLayerGroup />,
            path: '/tools/pdf-studio',
            badge: 'Pro All-in-One',
            color: '#ff2a44',
            glowColor: 'rgba(255, 42, 68, 0.45)'
        },
        {
            id: 'compress-pdf',
            name: 'PDF Compressor',
            category: 'PDF Tools',
            desc: 'Accurate multi-page budget allocation & aspect ratio preservation for government limits.',
            icon: <FaFilePdf />,
            path: '/tools/compress-pdf',
            badge: 'Gov Presets',
            color: '#ef4444',
            glowColor: 'rgba(239, 68, 68, 0.4)'
        },
        {
            id: 'convert',
            name: 'Format Converter',
            category: 'Image Tools',
            desc: 'Fast batch conversion between PNG, JPG, WebP, AVIF, HEIC, TIFF, BMP, SVG & ICO.',
            icon: <FaRandom />,
            path: '/tools/convert',
            badge: '9 Formats',
            color: '#10b981',
            glowColor: 'rgba(16, 185, 129, 0.4)'
        },
        {
            id: 'pdf',
            name: 'Image to PDF',
            category: 'PDF Tools',
            desc: 'Turn photos and scans into multi-page PDF documents with custom margins and fit.',
            icon: <FaFilePdf />,
            path: '/tools/pdf',
            badge: 'Instant Fit',
            color: '#f59e0b',
            glowColor: 'rgba(245, 158, 11, 0.4)'
        },
        {
            id: 'pdf-to-jpg',
            name: 'PDF to Image',
            category: 'PDF Tools',
            desc: 'Extract all pages to crystal clear JPG, WebP, or PNG with up to 300 DPI scaling.',
            icon: <FaFileImage />,
            path: '/tools/pdf-to-jpg',
            badge: 'Up to 300 DPI',
            color: '#06b6d4',
            glowColor: 'rgba(6, 182, 212, 0.4)'
        },
        {
            id: 'resize',
            name: 'Image Resizer',
            category: 'Image Tools',
            desc: 'Resize images to exact pixel bounds or social media dimensions with anti-aliasing.',
            icon: <FaExpandArrowsAlt />,
            path: '/tools/resize',
            badge: 'Anti-Aliased',
            color: '#a855f7',
            glowColor: 'rgba(168, 85, 247, 0.4)'
        },
        {
            id: 'merge-pdf',
            name: 'Merge PDF',
            category: 'PDF Tools',
            desc: 'Combine multiple PDF files into one clean document with instant drag-and-drop ordering.',
            icon: <FaLayerGroup />,
            path: '/tools/merge-pdf',
            badge: 'Drag & Drop',
            color: '#8b5cf6',
            glowColor: 'rgba(139, 92, 246, 0.4)'
        },
        {
            id: 'split-pdf',
            name: 'Split PDF',
            category: 'PDF Tools',
            desc: 'Extract specific page ranges or split large documents into individual PDF files.',
            icon: <FaCut />,
            path: '/tools/split-pdf',
            badge: 'Range Select',
            color: '#ec4899',
            glowColor: 'rgba(236, 72, 153, 0.4)'
        },
        {
            id: 'remove-pages',
            name: 'Remove Pages',
            category: 'PDF Tools',
            desc: 'Visually select and delete unwanted or duplicate pages from any PDF document.',
            icon: <FaMinusCircle />,
            path: '/tools/remove-pages',
            badge: 'Visual Grid',
            color: '#f43f5e',
            glowColor: 'rgba(244, 63, 94, 0.4)'
        }
    ];

    return (
        <div className="container" style={{ margin: '1rem auto 3rem' }}>
            <SEO
                title="Localyze - Free, Private & High-Precision Image & PDF Tools"
                description="Modern in-browser image compressor, resizer, format converter and PDF toolkit. 100% private with no server uploads."
            />

            {/* Hero Section */}
            <div style={{
                textAlign: 'center',
                padding: 'clamp(2rem, 5vw, 4rem) 1rem',
                position: 'relative'
            }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <span className="neon-badge">
                        <FaBolt /> Luminous Atmospheric Glassmorphic Engine
                    </span>
                    <span className="neon-badge neon-badge-success">
                        <FaCheckCircle /> 100% Local & Free
                    </span>
                </div>

                <h1 style={{
                    fontSize: 'clamp(2.4rem, 6vw, 4.2rem)',
                    fontWeight: 800,
                    lineHeight: 1.1,
                    marginBottom: '1.25rem',
                    letterSpacing: '-0.03em',
                    fontFamily: 'var(--font-display)'
                }}>
                    Next-Gen <span className="text-gradient">Image & PDF</span> Suite
                </h1>

                <p style={{
                    fontSize: 'clamp(1.05rem, 2.5vw, 1.35rem)',
                    color: 'var(--text-muted)',
                    marginBottom: '2.5rem',
                    lineHeight: 1.6,
                    maxWidth: '750px',
                    marginRight: 'auto',
                    marginLeft: 'auto'
                }}>
                    High-precision target compression, crisp anti-aliased resizing, and instant conversions entirely in your browser without ever exposing your files.
                </p>

                {/* Hero Quick Action Cards */}
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: '1rem',
                    marginBottom: '3rem'
                }}>
                    <Link to="/tools/compress" className="glass-btn-primary" style={{ padding: '0.85rem 1.75rem', fontSize: '1rem' }}>
                        <FaImage /> Image Compressor <FaArrowRight style={{ fontSize: '0.85rem' }} />
                    </Link>
                    <Link to="/tools/pdf-studio" className="glass-btn-secondary" style={{ padding: '0.85rem 1.75rem', fontSize: '1rem', borderColor: 'rgba(255, 42, 68, 0.4)', color: 'var(--color-primary)' }}>
                        <FaLayerGroup /> All-in-One PDF Studio
                    </Link>
                    <Link to="/tools/compress-pdf" className="glass-btn-secondary" style={{ padding: '0.85rem 1.75rem', fontSize: '1rem' }}>
                        <FaFilePdf style={{ color: '#ef4444' }} /> Compress PDF
                    </Link>
                </div>
            </div>

            {/* Tools Grid */}
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
                            All Precision Tools
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            Select any tool below for instant, zero-latency local processing
                        </p>
                    </div>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))',
                    gap: '1.5rem',
                    alignItems: 'stretch'
                }}>
                    {tools.map(tool => (
                        <Link
                            to={tool.path}
                            key={tool.id}
                            className="glass-card"
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                textDecoration: 'none',
                                justifyContent: 'space-between',
                                minHeight: '220px',
                                border: '1px solid var(--glass-border)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = tool.color;
                                e.currentTarget.style.boxShadow = `0 12px 32px -8px rgba(0,0,0,0.5), 0 0 25px -5px ${tool.glowColor}`;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'var(--glass-border)';
                                e.currentTarget.style.boxShadow = 'var(--glass-highlight), var(--shadow-md)';
                            }}
                        >
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                                    <div style={{
                                        width: '54px',
                                        height: '54px',
                                        borderRadius: 'var(--radius-md)',
                                        background: `radial-gradient(circle, ${tool.color}25 0%, ${tool.color}10 100%)`,
                                        border: `1px solid ${tool.color}40`,
                                        boxShadow: `0 0 16px -2px ${tool.glowColor}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.6rem',
                                        color: tool.color
                                    }}>
                                        {tool.icon}
                                    </div>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        padding: '0.25rem 0.65rem',
                                        borderRadius: 'var(--radius-full)',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid var(--border-subtle)',
                                        color: 'var(--text-dim)'
                                    }}>
                                        {tool.badge}
                                    </span>
                                </div>

                                <h3 style={{
                                    fontSize: '1.25rem',
                                    fontWeight: 700,
                                    marginBottom: '0.5rem',
                                    color: 'var(--text-main)',
                                    letterSpacing: '-0.01em'
                                }}>
                                    {tool.name}
                                </h3>

                                <p style={{
                                    color: 'var(--text-muted)',
                                    lineHeight: 1.55,
                                    fontSize: '0.9rem',
                                    marginBottom: '1rem'
                                }}>
                                    {tool.desc}
                                </p>
                            </div>

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                color: tool.color,
                                marginTop: 'auto'
                            }}>
                                Open Tool <FaArrowRight style={{ fontSize: '0.75rem', transition: 'transform 0.2s' }} />
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Why Choose Localyze - Frosted Glass Feature Cards */}
            <div style={{
                marginTop: '4rem',
                padding: 'clamp(2rem, 4vw, 3rem)',
                borderRadius: 'var(--radius-xl)',
                background: 'var(--glass-bg)',
                backdropFilter: 'var(--glass-blur)',
                WebkitBackdropFilter: 'var(--glass-blur)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--glass-highlight), var(--shadow-lg)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <h3 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                        Engineered for Privacy & Accuracy
                    </h3>
                    <p style={{ color: 'var(--text-muted)' }}>
                        All heavy computational tasks execute purely inside your browser's WebAssembly & WebGL sandbox
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
                    <div style={{
                        padding: '1.5rem',
                        borderRadius: 'var(--radius-lg)',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-subtle)'
                    }}>
                        <div style={{ color: 'var(--color-primary)', fontSize: '1.75rem', marginBottom: '0.75rem' }}>
                            <FaShieldAlt />
                        </div>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.4rem' }}>Zero Server Uploads</h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                            Your sensitive passports, financial reports, and personal photos never touch any remote server or cloud bucket.
                        </p>
                    </div>

                    <div style={{
                        padding: '1.5rem',
                        borderRadius: 'var(--radius-lg)',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-subtle)'
                    }}>
                        <div style={{ color: 'var(--color-secondary)', fontSize: '1.75rem', marginBottom: '0.75rem' }}>
                            <FaSlidersH />
                        </div>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.4rem' }}>Exact Target Sizing</h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                            2-tier adaptive binary search hits your desired KB/MB constraint with &le;1% margin, ensuring rejection-free government submissions.
                        </p>
                    </div>

                    <div style={{
                        padding: '1.5rem',
                        borderRadius: 'var(--radius-lg)',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-subtle)'
                    }}>
                        <div style={{ color: 'var(--color-success)', fontSize: '1.75rem', marginBottom: '0.75rem' }}>
                            <FaBolt />
                        </div>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.4rem' }}>Instant Native Speed</h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                            No waiting for server uploads or download queues. Local multi-core execution processes gigabytes instantly.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
