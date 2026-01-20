'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import Link from 'next/link';
import { useDoc, useCollection, useMemoFirebase, useFirestore, WithId } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { Spinner } from '@/components/Spinner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Mail, Phone, Eye, Briefcase, HandCoins } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Types from backend.json
type Customer = {
    name: string;
    phone: string;
    email: string;
    bvn: string;
    createdAt: any;
};

type Loan = {
  status: string;
  loanAmount: number;
  createdAt: any;
};

type Investment = {
    plan: string;
    amount: number;
    status: string;
    createdAt: any;
};

type Application = {
    status: string;
    createdAt: any;
};

type LoanApplication = Application & { loanAmount: number };
type InvestmentApplication = Application & { investmentAmount: number, currency: string, investmentPlan: string };


export default function CustomerDetailPage() {
    const params = useParams();
    const firestore = useFirestore();
    const customerId = params.customerId as string;

    const customerRef = useMemoFirebase(() => customerId ? doc(firestore, 'Customers', customerId) : null, [firestore, customerId]);
    const { data: customer, isLoading: customerLoading } = useDoc<Customer>(customerRef);

    const loansQuery = useMemoFirebase(() => customerId ? query(collection(firestore, 'Loans'), where('borrowerId', '==', customerId)) : null, [firestore, customerId]);
    const { data: loans, isLoading: loansLoading } = useCollection<Loan>(loansQuery);

    const investmentsQuery = useMemoFirebase(() => customerId ? query(collection(firestore, 'Investments'), where('userId', '==', customerId)) : null, [firestore, customerId]);
    const { data: investments, isLoading: investmentsLoading } = useCollection<Investment>(investmentsQuery);
    
    const loanAppsQuery = useMemoFirebase(() => customerId ? query(collection(firestore, 'loanApplications'), where('userId', '==', customerId)) : null, [firestore, customerId]);
    const { data: loanApplications, isLoading: loanAppsLoading } = useCollection<LoanApplication>(loanAppsQuery);

    const investmentAppsQuery = useMemoFirebase(() => customerId ? query(collection(firestore, 'investmentApplications'), where('userId', '==', customerId)) : null, [firestore, customerId]);
    const { data: investmentApplications, isLoading: investmentAppsLoading } = useCollection<InvestmentApplication>(investmentAppsQuery);

    const isLoading = customerLoading || loansLoading || investmentsLoading || loanAppsLoading || investmentAppsLoading;

    if (isLoading) {
        return <div className="flex h-full items-center justify-center"><Spinner size="large" /></div>;
    }

    if (!customer) {
        return (
            <div className="text-center">
                <h2 className="text-2xl font-bold">Customer not found</h2>
                <Button asChild variant="link" className="mt-4"><Link href="/admin/customers">Go Back</Link></Button>
            </div>
        );
    }
    
    const allApplications = [
        ...(loanApplications || []).map(app => ({ ...app, type: 'Loan' })),
        ...(investmentApplications || []).map(app => ({ ...app, type: 'Investment' })),
    ].sort((a,b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());

    return (
        <div className="space-y-6">
            <Button asChild variant="outline" size="sm">
                <Link href="/admin/customers">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Customers
                </Link>
            </Button>
            
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl flex items-center gap-3"><User /> {customer.name}</CardTitle>
                    <CardDescription>Joined on {customer.createdAt?.toDate ? format(customer.createdAt.toDate(), 'PPP') : 'N/A'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground"/> {customer.email}</p>
                    <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground"/> {customer.phone}</p>
                    {customer.bvn && <p className="flex items-center gap-2"><span className="font-bold text-muted-foreground text-xs ml-1">BVN</span> {customer.bvn}</p>}
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><HandCoins /> Loan History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loans && loans.length > 0 ? (
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loans.map(loan => (
                                        <TableRow key={loan.id}>
                                            <TableCell>{formatCurrency(loan.loanAmount)}</TableCell>
                                            <TableCell>{loan.createdAt?.toDate ? format(loan.createdAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                                            <TableCell><Badge variant="secondary" className="capitalize">{loan.status}</Badge></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : <p className="text-muted-foreground">No loans found for this customer.</p>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Briefcase /> Investment History</CardTitle>
                    </CardHeader>
                     <CardContent>
                        {investments && investments.length > 0 ? (
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Plan</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {investments.map(inv => (
                                        <TableRow key={inv.id}>
                                            <TableCell>{inv.plan}</TableCell>
                                            <TableCell>{formatCurrency(inv.amount)}</TableCell>
                                            <TableCell><Badge variant="secondary" className="capitalize">{inv.status}</Badge></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : <p className="text-muted-foreground">No investments found for this customer.</p>}
                    </CardContent>
                </Card>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>All Applications</CardTitle>
                    <CardDescription>A complete history of all applications submitted by this user.</CardDescription>
                </CardHeader>
                <CardContent>
                     {allApplications.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {allApplications.map(app => (
                                    <TableRow key={app.id}>
                                        <TableCell>{app.createdAt?.toDate ? format(app.createdAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                                        <TableCell><Badge variant={app.type === 'Loan' ? 'outline' : 'default'}>{app.type}</Badge></TableCell>
                                        <TableCell>{formatCurrency('loanAmount' in app ? app.loanAmount : app.investmentAmount)}</TableCell>
                                        <TableCell><Badge variant="secondary" className="capitalize">{app.status}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={`/admin/applications/${app.id}?type=${app.type.toLowerCase()}`}>
                                                    <Eye className="mr-2 h-4 w-4" /> View
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                     ) : <p className="text-muted-foreground text-center py-8">No applications found for this user.</p>}
                </CardContent>
            </Card>
        </div>
    )
}
