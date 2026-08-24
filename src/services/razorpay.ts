declare global {
    interface Window {
        Razorpay: any;
    }
}

export interface PlanConfig {
    id: 'day' | 'week' | 'month';
    name: string;
    durationDays: number;
    amountInr: number; // in INR rupees
    amountPaise: number; // in paise
    description: string;
    badge?: string;
    popular?: boolean;
}

export const PLANS: Record<string, PlanConfig> = {
    day: {
        id: 'day',
        name: '1-Day Ultra Pass',
        durationDays: 1,
        amountInr: 9,
        amountPaise: 900,
        description: '24-hour full priority access for urgent applications & quick batch processing.',
        badge: 'Quick Pass'
    },
    week: {
        id: 'week',
        name: '1-Week Sprint Pass',
        durationDays: 7,
        amountInr: 29,
        amountPaise: 2900,
        description: '7-day unlimited access for project sprints, visa filing, and batch conversions.',
        badge: 'Most Popular',
        popular: true
    },
    month: {
        id: 'month',
        name: '1-Month Pro Pass',
        durationDays: 30,
        amountInr: 69,
        amountPaise: 6900,
        description: '30 days of unlimited access, priority processing, and VIP features.',
        badge: 'Best Value'
    }
};

/**
 * Dynamically loads the official Razorpay Checkout JavaScript SDK
 */
export const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
        if (typeof window !== 'undefined' && window.Razorpay) {
            resolve(true);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => {
            console.error('Failed to load Razorpay SDK');
            resolve(false);
        };
        document.body.appendChild(script);
    });
};

export interface RazorpayPaymentSuccessResponse {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
}

export interface CheckoutOptions {
    plan: PlanConfig;
    userName?: string;
    userEmail?: string;
    userPhone?: string;
    onSuccess: (response: RazorpayPaymentSuccessResponse, plan: PlanConfig) => void;
    onDismiss?: () => void;
}

/**
 * Opens the Razorpay Checkout Modal
 */
export const openRazorpayCheckout = async ({
    plan,
    userName = 'Valued User',
    userEmail = 'customer@localyze.app',
    userPhone = '9999999999',
    onSuccess,
    onDismiss
}: CheckoutOptions) => {
    const isLoaded = await loadRazorpayScript();
    if (!isLoaded) {
        throw new Error('Razorpay Checkout SDK could not be loaded. Please check your internet connection.');
    }

    // Read Key ID from environment or default to public test key
    const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_localyzePublic';

    const options = {
        key: keyId,
        amount: plan.amountPaise,
        currency: 'INR',
        name: 'Localyze',
        description: `${plan.name} (${plan.durationDays} Days)`,
        image: '/logo.png',
        handler: function (response: RazorpayPaymentSuccessResponse) {
            onSuccess(response, plan);
        },
        prefill: {
            name: userName,
            email: userEmail,
            contact: userPhone
        },
        notes: {
            plan_id: plan.id,
            plan_name: plan.name,
            duration_days: plan.durationDays.toString()
        },
        theme: {
            color: '#ff2a44',
            backdrop_color: 'rgba(5, 5, 8, 0.85)'
        },
        modal: {
            ondismiss: function () {
                if (onDismiss) onDismiss();
            },
            escape: true,
            backdropclose: false
        }
    };

    try {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
            console.error('Payment failed:', response.error);
        });
        rzp.open();
    } catch (err) {
        console.error('Razorpay initialization error:', err);
        throw err;
    }
};
