// app/[res]/cashier/page.tsx
import { redirect } from 'next/navigation';

export default function CashierPage({ params }: { params: { res: string } }) {
    const res = params.res;
    redirect(`/${res}/cashier/dashboard`);
}
