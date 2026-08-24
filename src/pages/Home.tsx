import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
    FaImage, 
    FaFilePdf, 
    FaExpandArrowsAlt, 
    FaRandom, 
    FaLayerGroup, 
    FaFileImage, 
    FaArrowRight
} from 'react-icons/fa';
import { SEO } from '../components/SEO';

export const Home = () => {
    const [selectedCategory, setSelectedCategory] = useState<'All' | 'Image Tools' | 'PDF Tools'>('All');

    // Consolidated Core Tools Suite (Redundant Split/Merge/Remove consolidated into All-in-One PDF Studio)
    const tools = [
        // ================= IMAGE TOOLS =================
        {
            id: 'compress',
            name: 'Image Compressor',
            category: 'Image Tools',
            desc: 'Precision target size matching (e.g. 20KB, 50KB, 100KB) with adaptive bicubic downsampling.',
            icon: <FaImage />,
            path: '/tools/compress',
            badge: 'High Precision',
            color: '#ff2a44',
            glowColor: 'rgba(255, 42, 68, 0.45)'
        },
        {
            id: 'resize',
            name: 'Image Resizer',
            category: 'Image Tools',
            desc: 'Resize images to exact pixel dimensions, social media presets, or percentage scaling.',
            icon: <FaExpandArrowsAlt />,
            path: '/tools/resize',
            badge: 'Social Presets',
            color: '#a855f7',
            glowColor: 'rgba(168, 85, 247, 0.4)'
        },
        {
            id: 'convert',
            name: 'Format Converter',
            category: 'Image Tools',
            desc: 'Batch convert between PNG, JPG, WebP, AVIF, HEIC, TIFF, BMP, SVG & ICO with ZIP export.',
            icon: <FaRandom />,
            path: '/tools/convert',
            badge: '9 Formats + ZIP',
            color: '#10b981',
            glowColor: 'rgba(16, 185, 129, 0.4)'
        },
        {
            id: 'pdf',
            name: 'Image to PDF',
            category: 'Image Tools',
            desc: 'Turn photos and document scans into multi-page PDF documents with custom 4-side margins.',
            icon: <FaFilePdf />,
            path: '/tools/pdf',
            badge: 'Independent Margins',
            color: '#f59e0b',
            glowColor: 'rgba(245, 158, 11, 0.4)'
        },

        // ================= PDF TOOLS =================
        {
            id: 'pdf-studio',
            name: 'All-in-One PDF Studio',
            category: 'PDF Tools',
            desc: 'Merge, split, organize, rotate, and delete pages visually across multiple documents in one workspace.',
            icon: <FaLayerGroup />,
            path: '/tools/pdf-studio',
            badge: 'Merge • Split • Rotate',
            color: '#ff2a44',
            glowColor: 'rgba(255, 42, 68, 0.45)'
        },
        {
            id: 'compress-pdf',
            name: 'PDF Compressor',
            category: 'PDF Tools',
            desc: 'Multi-page budget allocation & aspect ratio preservation for strict government and portal limits.',
            icon: <FaFilePdf />,
            path: '/tools/compress-pdf',
            badge: 'Gov Presets',
            color: '#ef4444',
            glowColor: 'rgba(239, 68, 68, 0.4)'
        },
        {
            id: 'pdf-to-jpg',
            name: 'PDF to Image Extractor',
            category: 'PDF Tools',
            desc: 'Extract selected pages to crystal-clear JPG, WebP, or PNG with up to 300 DPI scaling and ZIP export.',
            icon: <FaFileImage />,
            path: '/tools/pdf-to-jpg',
            badge: 'Up to 300 DPI',
            color: '#06b6d4',
            glowColor: 'rgba(6, 182, 212, 0.4)'
        }
    ];

    const filteredTools = selectedCategory === 'All'
        ? tools
        : tools.filter(t => t.category === selectedCategory);

    return (
        <div className="container" style={{ margin: '1rem auto 3rem', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
            <SEO
                title="Localyze - Free, Private & High-Precision Image & PDF Tools"
                description="Modern in-browser image compressor, resizer, format converter and PDF toolkit. 100% private with no server uploads."
            />

            {/* Minimalist Category Filter Pills */}
            <div className="category-pills-container">
                {(['All', 'Image Tools', 'PDF Tools'] as const).map((cat) => {
                    const isActive = selectedCategory === cat;
                    const count = cat === 'All' ? tools.length : tools.filter(t => t.category === cat).length;
                    return (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCategory(cat)}
                            className="category-pill-btn"
                            style={{
                                padding: '0.45rem 1.15rem',
                                borderRadius: 'var(--radius-full)',
                                border: `1px solid ${isActive ? 'var(--color-primary)' : 'var(--glass-border)'}`,
                                backgroundColor: isActive ? 'rgba(255, 42, 68, 0.14)' : 'var(--glass-bg)',
                                color: isActive ? 'var(--color-primary)' : 'var(--text-muted)',
                                fontWeight: isActive ? 600 : 500,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                boxShadow: isActive ? '0 0 16px -3px rgba(255, 42, 68, 0.4)' : 'none'
                            }}
                        >
                            {cat === 'All' && '✨ All Tools'}
                            {cat === 'Image Tools' && '🖼️ Image Tools'}
                            {cat === 'PDF Tools' && '📄 PDF Tools'}
                            <span style={{
                                marginLeft: '0.4rem',
                                fontSize: '0.75rem',
                                opacity: 0.75
                            }}>
                                ({count})
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Minimalist Glassmorphic Tools Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 330px), 1fr))',
                gap: '1.25rem',
                alignItems: 'stretch',
                width: '100%',
                minWidth: 0
            }}>
                {filteredTools.map(tool => (
                    <Link
                        to={tool.path}
                        key={tool.id}
                        className="glass-card"
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            textDecoration: 'none',
                            justifyContent: 'space-between',
                            minHeight: '200px',
                            padding: '1.5rem',
                            borderRadius: 'var(--radius-xl)',
                            border: '1px solid var(--glass-border)',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            width: '100%',
                            minWidth: 0,
                            boxSizing: 'border-box'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 42, 68, 0.5)';
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = `0 12px 32px -8px rgba(0,0,0,0.5), 0 0 25px -5px ${tool.glowColor}`;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--glass-border)';
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = 'var(--glass-highlight), var(--shadow-md)';
                        }}
                    >
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                <div style={{
                                    width: '50px',
                                    height: '50px',
                                    borderRadius: 'var(--radius-lg)',
                                    background: `radial-gradient(circle, ${tool.color}25 0%, ${tool.color}10 100%)`,
                                    border: `1px solid ${tool.color}40`,
                                    boxShadow: `0 0 16px -2px ${tool.glowColor}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.5rem',
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
                                    color: 'var(--text-dim)',
                                    letterSpacing: '0.02em'
                                }}>
                                    {tool.badge}
                                </span>
                            </div>

                            <h3 style={{
                                fontSize: '1.2rem',
                                fontWeight: 700,
                                marginBottom: '0.45rem',
                                color: 'var(--text-main)',
                                letterSpacing: '-0.01em'
                            }}>
                                {tool.name}
                            </h3>

                            <p style={{
                                color: 'var(--text-muted)',
                                lineHeight: 1.5,
                                fontSize: '0.875rem',
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
    );
};
