import { useEffect, useRef } from 'react';

interface AdBannerProps extends React.HTMLAttributes<HTMLDivElement> {
    slot?: string;
    client?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ slot = "1234567890", client = "ca-pub-4802540227409901", style, className, ...props }) => {
    const adRef = useRef<HTMLModElement>(null);

    useEffect(() => {
        try {
            // @ts-ignore
            if (window.adsbygoogle && adRef.current && adRef.current.innerHTML === '') {
                // @ts-ignore
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            }
        } catch (e) {
            console.error("AdSense error", e);
        }
    }, []);

    return (
        <div
            style={{
                margin: '2rem 0',
                minHeight: '280px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                overflow: 'hidden',
                position: 'relative',
                ...style
            }}
            className={className}
            {...props}
        >
            {/* Replace data-ad-client and data-ad-slot with your actual values from Google AdSense */}
            <ins className="adsbygoogle"
                style={{ display: 'block', width: '100%' }}
                data-ad-client={client}
                data-ad-slot={slot}
                data-ad-format="auto"
                data-full-width-responsive="true"
                ref={adRef}
            ></ins>
            <span style={{ position: 'absolute', bottom: '8px', fontSize: '10px', color: 'var(--text-muted)' }}>Advertisement</span>
        </div>
    );
};
