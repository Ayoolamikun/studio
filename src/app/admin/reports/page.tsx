'use client';

import { useState } from 'react';
import { generateExcelReport } from '@/app/actions';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DownloadCloud } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAction = async (formData: FormData) => {
    setIsGenerating(true);
    formData.set('month', selectedMonth);
    const result = await generateExcelReport(formData);

    if (result.success && result.data) {
      toast.success('Success!', {
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
      toast.error('Generation Failed', {
        description: result.message,
      });
    }
    setIsGenerating(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Loan Report</CardTitle>
        <CardDescription>
          Generate and download a comprehensive Excel report of all loans for a specific month.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAction(new FormData(e.currentTarget));
          }}
        >
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
          <Button type="submit" disabled={isGenerating} className="w-full mt-4">
            {isGenerating ? 'Generating...' : <><DownloadCloud className="mr-2 h-4 w-4" /> Generate Excel Report</>}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
