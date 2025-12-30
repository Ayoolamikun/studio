
'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { generateExcelReport } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DownloadCloud } from 'lucide-react';
import * as XLSX from 'xlsx';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full mt-4">
      {pending ? 'Generating...' : <><DownloadCloud className="mr-2 h-4 w-4" /> Generate Excel Report</>}
    </Button>
  );
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const handleAction = async (prevState: any, formData: FormData) => {
    formData.set('month', selectedMonth);
    const result = await generateExcelReport(formData);

    if (result.success && result.data) {
      toast({
        title: 'Success!',
        description: result.message,
      });

      // Create a workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(result.data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Loan Report');

      // Generate a file name and download
      const fileName = `Loan_Report_${selectedMonth.replace('-', '_')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
    } else {
      toast({
        title: 'Generation Failed',
        description: result.message,
        variant: 'destructive',
      });
    }
    return result;
  };

  const [state, formAction] = useActionState(handleAction, { success: false, message: ""});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Loan Report</CardTitle>
        <CardDescription>
          Generate and download a comprehensive Excel report of all loans for a specific month.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="month">Select Month</Label>
            <input
              type="month"
              id="month"
              name="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
