
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
import { useCollection, useMemoFirebase, useAuth, WithId } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { MoreHorizontal, Hourglass, ShieldCheck, TrendingUp, CircleOff } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { updateInvestmentStatusAction } from '@/app/actions';

type Investment = {
  userId: string;
  plan: 'Gold' | 'Platinum';
  amount: number;
  startDate: any;
  duration: number;
  expectedReturn: number;
  maturityDate: any;
  status: 'Active' | 'Matured' | 'Withdrawn';
  createdAt: any;
};

type Customer = {
  name: string;
  phone: string;
  email: string;
};

type CombinedInvestmentData = WithId<Investment> & { customer?: WithId<Customer> };

const getStatusConfig = (status: Investment['status']) => {
  switch (status) {
    case 'Active':
      return { variant: 'default', icon: TrendingUp, label: 'Active', className: 'bg-green-500/20 text-green-600' };
    case 'Matured':
      return { variant: 'default', icon: ShieldCheck, label: 'Matured', className: "bg-primary/20 text-primary" };
    case 'Withdrawn':
      return { variant: 'secondary', icon: CircleOff, label: 'Withdrawn' };
    default:
      return { variant: 'secondary', icon: Hourglass, label: 'Unknown' };
  }
}


export function InvestmentManagementTable() {
  const firestore = useFirestore();
  const auth = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const investmentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    let q = query(collection(firestore, 'Investments'), orderBy('createdAt', 'desc'));
    
    if (statusFilter !== 'all') {
        q = query(q, where('status', '==', statusFilter));
    }
    
    return q;
  }, [firestore, statusFilter]);

  const customersQuery = useMemoFirebase(
    () => firestore ? collection(firestore, 'Customers') : null,
    [firestore]
  );
  
  const { data: investments, isLoading: investmentsLoading } = useCollection<Investment>(investmentsQuery);
  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersQuery);

  const customersMap = useMemo(() => {
    if (!customers) return new Map();
    return new Map(customers.map(c => [c.id, c]));
  }, [customers]);

  const combinedData = useMemo<CombinedInvestmentData[] | null>(() => {
    if (!investments) return null;
    return investments.map(investment => ({
      ...investment,
      customer: customersMap.get(investment.userId)
    }));
  }, [investments, customersMap]);
  
  const filteredData = useMemo(() => {
    if (!combinedData) return [];
    
    return combinedData.filter(item => {
      const customer = item.customer;
      const searchTermLower = searchTerm.toLowerCase();
      
      const nameMatch = customer?.name?.toLowerCase().includes(searchTermLower);
      const emailMatch = customer?.email?.toLowerCase().includes(searchTermLower);
      const phoneMatch = customer?.phone?.includes(searchTerm);
      const idMatch = item.userId.toLowerCase().includes(searchTermLower);

      return searchTerm.trim() === '' || nameMatch || emailMatch || phoneMatch || idMatch;
    });
  }, [combinedData, searchTerm]);

  
  const handleStatusChange = async (id: string, status: Investment['status']) => {
    if (!auth?.currentUser) {
      toast.error('You must be logged in to perform this action.');
      return;
    }
    setProcessingId(id);

    try {
        const idToken = await auth.currentUser.getIdToken();
        const result = await updateInvestmentStatusAction(id, status, idToken);

        if (result.success) {
            toast.success('Success', {
                description: result.message,
            });
        } else {
            throw new Error(result.message);
        }
    } catch (error: any) {
        toast.error('Update Failed', {
            description: error.message || "An unexpected error occurred.",
        });
    } finally {
        setProcessingId(null);
    }
  };
  
  const isLoading = investmentsLoading || customersLoading;
  
  const statusFilters: {value: string, label: string}[] = [
    { value: 'all', label: 'All Investments' },
    { value: 'Active', label: 'Active' },
    { value: 'Matured', label: 'Matured' },
    { value: 'Withdrawn', label: 'Withdrawn' },
  ];

  return (
      <Card>
        <CardHeader>
          <CardTitle>All Investments</CardTitle>
          <CardDescription>Review and manage all investments in the system.</CardDescription>
          <div className="flex flex-col md:flex-row items-center gap-4 pt-4">
              <Input 
                placeholder="Search by investor name, email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
                disabled={isLoading}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={isLoading} className="w-full md:w-auto">Filter: <span className="capitalize ml-2 font-bold">{statusFilters.find(f=>f.value === statusFilter)?.label}</span></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {statusFilters.map(filter => (
                    <DropdownMenuItem key={filter.value} onClick={() => setStatusFilter(filter.value)}>{filter.label}</DropdownMenuItem>
                  ))}
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
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Investor</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Maturity Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData && filteredData.length > 0 ? (
                    filteredData.map(item => {
                      const statusConfig = getStatusConfig(item.status);
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="font-medium">{item.customer?.name || 'N/A'}</div>
                            <div className="text-sm text-muted-foreground">{item.customer?.email || item.userId}</div>
                          </TableCell>
                          <TableCell>
                             <Badge variant="secondary">{item.plan}</Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(item.amount)}</TableCell>
                          <TableCell>{item.maturityDate?.toDate ? format(item.maturityDate.toDate(), 'PPP') : 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant={statusConfig.variant} className={statusConfig.className}>
                              <statusConfig.icon className="mr-2 h-4 w-4" />
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={processingId === item.id}>
                                    {processingId === item.id ? <Spinner size="small"/> : <MoreHorizontal />}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'Active')}>Set to Active</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'Matured')}>Mark as Matured</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'Withdrawn')}>Mark as Withdrawn</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24">No investments found matching your criteria.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
  );
}
