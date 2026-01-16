import { Link } from 'react-router-dom';
import { FaImage, FaFilePdf, FaExpandArrowsAlt, FaRandom, FaCut, FaLayerGroup } from 'react-icons/fa';
import { SEO } from '../components/SEO';

export const Home = () => {
    const tools = [
        {
            id: 'compress',
            name: 'Image Compressor',
            desc: 'Reduce file size while maintaining quality.',
            icon: <FaImage />,
            path: '/tools/compress',
            color: '#6366f1'
        },
        {
            id: 'resize',
            name: 'Image Resizer',
            desc: 'Resize images to exact dimensions.',
            icon: <FaExpandArrowsAlt />,
            path: '/tools/resize',
            color: '#f43f5e'
        },
        {
            id: 'convert',
            name: 'Format Converter',
            desc: 'Convert between PNG, JPG, WEBP, BMP, TIFF, HEIC, AVIF, SVG & ICO.',
            icon: <FaRandom />,
            path: '/tools/convert',
            color: '#10b981'
        },
        {
            id: 'pdf',
            name: 'Image to PDF',
            desc: 'Turn your images into a PDF document.',
            icon: <FaFilePdf />,
            path: '/tools/pdf',
            color: '#f59e0b'
        },
        {
            id: 'compress-pdf',
            name: 'PDF Compressor',
            desc: 'Reduce PDF size for government portals (Rasterize).',
            icon: <FaFilePdf />,
            path: '/tools/compress-pdf',
            color: '#ef4444'
        },
        {
            id: 'merge-pdf',
            name: 'Merge PDF',
            desc: 'Combine multiple PDFs into one document.',
            icon: <FaLayerGroup />,
            path: '/tools/merge-pdf',
            color: '#8b5cf6'
        },
        {
            id: 'split-pdf',
            name: 'Split PDF',
            desc: 'Extract specific pages from a PDF.',
            icon: <FaCut />,
            path: '/tools/split-pdf',
            color: '#06b6d4'
        }
    ];

    return (
        <div className="container" style={{ textAlign: 'center', margin: '2rem auto', padding: '1rem' }}>
            <SEO
                title="Free Online Image & PDF Tools"
                description="Secure, local-first image compressor, resizer, converter and PDF tools. Process files in your browser without uploading to a server."
            />
            <h1 style={{
                fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                fontWeight: 800,
                lineHeight: 1.1,
                marginBottom: '1rem',
                letterSpacing: '-0.02em'
            }}>
                <span className="text-gradient">Secure, Local</span> Image & PDF Tools
            </h1>
            <p style={{
                fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
                color: 'var(--text-muted)',
                marginBottom: '2rem',
                lineHeight: 1.6,
                maxWidth: '800px',
                marginLeft: 'auto',
                marginRight: 'auto',
                padding: '0 1rem'
            }}>
                Compress, resize, and convert files entirely in your browser.
                No server uploads, no privacy risks.
            </p>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
                gap: 'clamp(1rem, 3vw, 2rem)',
                alignItems: 'stretch'
            }}>
                {tools.map(tool => (
                    <Link to={tool.path} key={tool.id} className="tool-card" style={{
                        backgroundColor: 'var(--bg-surface)',
                        padding: 'clamp(1.5rem, 4vw, 2rem)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border-subtle)',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        textDecoration: 'none',
                        minHeight: '200px',
                        justifyContent: 'center'
                    }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-5px)';
                            e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        <div style={{
                            fontSize: 'clamp(2rem, 5vw, 2.5rem)',
                            color: tool.color,
                            marginBottom: '1rem',
                            padding: 'clamp(0.75rem, 2vw, 1rem)',
                            background: `rgba(${parseInt(tool.color.slice(1, 3), 16)}, ${parseInt(tool.color.slice(3, 5), 16)}, ${parseInt(tool.color.slice(5, 7), 16)}, 0.1)`,
                            borderRadius: '50%',
                            width: 'clamp(60px, 15vw, 80px)',
                            height: 'clamp(60px, 15vw, 80px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {tool.icon}
                        </div>
                        <h3 style={{
                            fontSize: 'clamp(1.1rem, 3vw, 1.25rem)',
                            fontWeight: 600,
                            marginBottom: '0.5rem',
                            color: 'var(--text-main)'
                        }}>
                            {tool.name}
                        </h3>
                        <p style={{
                            color: 'var(--text-muted)',
                            lineHeight: 1.5,
                            fontSize: 'clamp(0.9rem, 2vw, 1rem)'
                        }}>
                            {tool.desc}
                        </p>
                    </Link>
                ))}
            </div>
        </div>
    );
};
