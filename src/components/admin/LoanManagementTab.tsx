
'use client';
import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/Spinner';
import { useCollection, useMemoFirebase, updateDocumentNonBlocking, WithId } from '@/firebase';
import { collection, doc, query, orderBy, where } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Check, X, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type ClaimStatus } from '@/app/admin/page';

// From backend.json
type Loan = {
  borrowerId: string;
  amountRequested: number;
  duration: number;
  interestRate?: number;
  totalRepayment?: number;
  amountPaid: number;
  balance: number;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'paid' | 'overdue';
  notes?: string;
  createdAt: string;
};

type Borrower = {
  name: string;
  phone: string;
  email: string;
};

type CombinedLoanData = WithId<Loan> & { borrower?: WithId<Borrower> };

export function LoanManagementTab({ claimStatus }: { claimStatus: ClaimStatus }) {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // CRITICAL FIX: Only run the query if the user is confirmed to be an admin.
  // This prevents race conditions where the query runs before claims are verified.
  const loansQuery = useMemoFirebase(
    () => (firestore && claimStatus === 'is-admin') ? query(collection(firestore, 'Loans'), orderBy('createdAt', 'desc')) : null,
    [firestore, claimStatus]
  );
  const borrowersQuery = useMemoFirebase(
    () => (firestore && claimStatus === 'is-admin') ? collection(firestore, 'Borrowers') : null,
    [firestore, claimStatus]
  );
  
  const { data: loans, isLoading: loansLoading } = useCollection<Loan>(loansQuery);
  const { data: borrowers, isLoading: borrowersLoading } = useCollection<Borrower>(borrowersQuery);

  const borrowersMap = useMemo(() => {
    if (!borrowers) return new Map();
    return new Map(borrowers.map(b => [b.id, b]));
  }, [borrowers]);

  const combinedData = useMemo<CombinedLoanData[] | null>(() => {
    if (!loans) return null;
    return loans.map(loan => ({
      ...loan,
      borrower: borrowersMap.get(loan.borrowerId)
    }));
  }, [loans, borrowersMap]);
  
  const filteredData = useMemo(() => {
    if (!combinedData) return [];
    
    return combinedData.filter(item => {
      const borrower = item.borrower;
      const matchesSearch = searchTerm.trim() === '' ||
        borrower?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        borrower?.phone.includes(searchTerm) ||
        borrower?.email.toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [combinedData, searchTerm, statusFilter]);

  const handleStatusChange = (id: string, status: Loan['status']) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'Loans', id);
    updateDocumentNonBlocking(docRef, { status });
  };
  
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'approved':
      case 'active':
      case 'paid':
        return 'default';
      case 'overdue':
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  }
  
  // Display loading spinner if claim status is not yet 'is-admin' or data is loading.
  const isLoading = loansLoading || borrowersLoading || claimStatus !== 'is-admin';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Loan Management</CardTitle>
        <CardDescription>Review, approve, and manage all loans.</CardDescription>
        <div className="flex items-center gap-4 pt-4">
            <Input 
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
              disabled={isLoading}
            />
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isLoading}>Filter Status</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setStatusFilter('all')}>All</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('pending')}>Pending</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('approved')}>Approved</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('active')}>Active</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('rejected')}>Rejected</DropdownMenuItem>
                 <DropdownMenuItem onClick={() => setStatusFilter('paid')}>Paid</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('overdue')}>Overdue</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner size="large" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData && filteredData.length > 0 ? (
                filteredData.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.borrower?.name || 'N/A'}</div>
                      <div className="text-sm text-muted-foreground">{item.borrower?.email || item.borrowerId}</div>
                    </TableCell>
                    <TableCell>{formatCurrency(item.amountRequested)}</TableCell>
                    <TableCell>{formatCurrency(item.balance)}</TableCell>
                    <TableCell>{format(new Date(item.createdAt), 'PPP')}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(item.status)} className="capitalize">{item.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       {item.status === 'pending' ? (
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="icon" onClick={() => handleStatusChange(item.id, 'approved')}>
                                <Check className="h-4 w-4" />
                            </Button>
                             <Button variant="destructive" size="icon" onClick={() => handleStatusChange(item.id, 'rejected')}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                       ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'active')}>Set to Active</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'paid')}>Set to Paid</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'overdue')}>Set to Overdue</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500" onClick={() => handleStatusChange(item.id, 'rejected')}>Reject</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                       )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No loans found matching your criteria.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
