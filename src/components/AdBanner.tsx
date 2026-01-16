import { useEffect, useRef } from 'react';
import { useUser } from '../contexts/UserContext';

interface AdBannerProps extends React.HTMLAttributes<HTMLDivElement> {
    slot?: string;
    client?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ slot = "1234567890", client = "ca-pub-4802540227409901", style, className, ...props }) => {
    const { profile } = useUser();
    const isPro = profile?.plan === 'weekly' || profile?.plan === 'monthly';
    const adRef = useRef<HTMLModElement>(null);

    useEffect(() => {
        // If user is pro, don't try to load ads
        if (isPro) return;

        try {
            // @ts-ignore
            if (window.adsbygoogle && adRef.current && adRef.current.innerHTML === '') {
                // @ts-ignore
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            }
        } catch (e) {
            console.error("AdSense error", e);
        }
    }, [isPro]);

    // If user is subscribed/pro, return null (no ad)
    if (isPro) {
        return null;
    }

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
                border: '1px border var(--border-subtle)',
                overflow: 'hidden',
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
            <span style={{ position: 'absolute', fontSize: '10px', color: 'var(--text-muted)', marginTop: '290px' }}>Advertisement</span>
        </div>
    );
};
