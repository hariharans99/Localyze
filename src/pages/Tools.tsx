import { Link } from 'react-router-dom';
import { FaImage, FaFilePdf, FaExpandArrowsAlt, FaRandom } from 'react-icons/fa';

export const Tools = () => {
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
        <div className="container">
            <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '1rem', textAlign: 'center' }}>
                All Tools
            </h1>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '4rem', fontSize: '1.2rem' }}>
                Secure, local-only processing tools for your everyday needs.
            </p>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '2rem'
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
