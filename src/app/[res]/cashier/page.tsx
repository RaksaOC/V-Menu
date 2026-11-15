// app/[res]/cashier/page.tsx.tsx
import { redirect } from 'next/navigation';

// Next.js 15: route params arrive as a Promise
export default async function CashierPage({ params }: { params: Promise<{ res: string }> }) {
    const { res } = await params;
    redirect(`/${res}/cashier/dashboard`);
}
