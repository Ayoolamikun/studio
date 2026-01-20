'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DownloadCloud } from 'lucide-react';

export default function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExport = () => {
    setIsGenerating(true);
    toast.info('Generating Report', {
      description: 'Your Excel report is being generated and will download automatically. This may take a moment.',
    });

    const url = `/api/reports/export-excel?month=${selectedMonth}`;
    
    // Using an invisible iframe to trigger the download
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);

    // Clean up the iframe after a short delay
    setTimeout(() => {
        document.body.removeChild(iframe);
        setIsGenerating(false);
    }, 5000); // 5 seconds should be enough for the download to start
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comprehensive Data Export</CardTitle>
        <CardDescription>
          Generate and download a multi-sheet Excel report of all customers, loans, and investments for a specific month.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid w-full max-w-sm items-center gap-4">
            <div>
              <Label htmlFor="month">Select Report Month</Label>
              <input
                type="month"
                id="month"
                name="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          <Button onClick={handleExport} disabled={isGenerating} className="w-full">
            {isGenerating ? 'Generating...' : <><DownloadCloud className="mr-2 h-4 w-4" /> Download Excel Report</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
