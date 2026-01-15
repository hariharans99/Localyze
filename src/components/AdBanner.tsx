import { useEffect, useRef } from 'react';
import { useUser } from '../contexts/UserContext';

declare global {
    interface Window {
        adsbygoogle: any[];
    }
}

interface AdBannerProps {
    slot: string;
    format?: 'auto' | 'fluid';
    style?: React.CSSProperties;
    label?: string;
}

export const AdBanner = ({ slot, format = 'auto', style = {}, label = 'Advertisement' }: AdBannerProps) => {
    const { profile, loading } = useUser();
    const adRef = useRef<boolean>(false);

    // Only show ads for Free plan users
    const shouldShowAds = !loading && (!profile || profile.plan === 'free');

    useEffect(() => {
        if (shouldShowAds && !adRef.current) {
            try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
                adRef.current = true;
            } catch (e) {
                console.error("AdSense error", e);
            }
        }
    }, [shouldShowAds]);

    if (!shouldShowAds) return null;

    return (
        <div style={{ margin: '2rem 0', textAlign: 'center', ...style }}>
            <p style={{
                fontSize: '0.75rem',
                color: 'var(--text-dim)',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
            }}>
                {label}
            </p>
            <div style={{ minHeight: '100px', backgroundColor: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ins className="adsbygoogle"
                    style={{ display: 'block' }}
                    data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" // Placeholder
                    data-ad-slot={slot}
                    data-ad-format={format}
                    data-full-width-responsive="true"></ins>
            </div>
            <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                <a href="/pricing" style={{ color: 'var(--color-primary)' }}>Remove Ads</a> with Pro
            </p>
        </div>
    );
};
