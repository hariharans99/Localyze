import { Link } from 'react-router-dom';
import { FaImage, FaFilePdf, FaExpandArrowsAlt, FaRandom } from 'react-icons/fa';

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
        }
    ];

    return (
        <div className="container" style={{ textAlign: 'center', margin: '4rem auto' }}>
            <h1 style={{
                fontSize: '3.5rem',
                fontWeight: 800,
                lineHeight: 1.1,
                marginBottom: '1.5rem',
                letterSpacing: '-0.02em'
            }}>
                <span className="text-gradient">Secure, Local</span> Image & PDF Tools
            </h1>
            <p style={{
                fontSize: '1.25rem',
                color: 'var(--text-muted)',
                marginBottom: '4rem',
                lineHeight: 1.6,
                maxWidth: '800px',
                marginLeft: 'auto',
                marginRight: 'auto'
            }}>
                Compress, resize, and convert files entirely in your browser.
                No server uploads, no privacy risks.
            </p>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '2rem',
                alignItems: 'start'
            }}>
                {tools.map(tool => (
                    <Link to={tool.path} key={tool.id} className="tool-card" style={{
                        backgroundColor: 'var(--bg-surface)',
                        padding: '2rem',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border-subtle)',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        textDecoration: 'none'
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
                            fontSize: '2.5rem',
                            color: tool.color,
                            marginBottom: '1rem',
                            padding: '1rem',
                            background: `rgba(${parseInt(tool.color.slice(1, 3), 16)}, ${parseInt(tool.color.slice(3, 5), 16)}, ${parseInt(tool.color.slice(5, 7), 16)}, 0.1)`,
                            borderRadius: '50%'
                        }}>
                            {tool.icon}
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                            {tool.name}
                        </h3>
                        <p style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>
                            {tool.desc}
                        </p>
                    </Link>
                ))}
            </div>
        </div>
    );
};
