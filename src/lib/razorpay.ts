export interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    image?: string;
    order_id?: string; // Optional for now (we'll do client-side first for testing)
    handler: (response: any) => void;
    prefill: {
        name?: string;
        email?: string;
        contact?: string;
    };
    theme: {
        color: string;
    };
}

export const openRazorpay = (options: RazorpayOptions) => {
    const w = window as any;
    if (w.Razorpay) {
        const rzp = new w.Razorpay(options);
        rzp.open();
    } else {
        alert('Razorpay SDK failed to load. Please check your internet connection.');
    }
};
