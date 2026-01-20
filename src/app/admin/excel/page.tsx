'use client';

import { useState } from 'react';
import { uploadExcelFile } from '@/app/actions';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { UploadCloud } from 'lucide-react';

export default function ExcelImportPage() {
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [formKey, setFormKey] = useState(Date.now());

  const handleAction = async (formData: FormData) => {
    setIsUploading(true);
    const result = await uploadExcelFile(formData);
    if (result.success) {
      toast.success('Success!', {
        description: result.message,
      });
      setFileName('');
      setFormKey(Date.now()); // Reset form by changing key
    } else {
      toast.error('Upload Failed', {
        description: result.message,
      });
    }
    setIsUploading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Excel Import</CardTitle>
        <CardDescription>
          Upload the monthly repayment Excel file here. The system will automatically parse it
          and update borrower records.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          key={formKey}
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const file = formData.get('excelFile') as File;
            if (file && file.size > 0) {
                 handleAction(formData);
            } else {
                toast.error('No file selected', {
                    description: 'Please select a file to upload.',
                });
            }
          }}
        >
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="excelFile" className="sr-only">Excel File</Label>
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="excelFile"
                className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-secondary hover:bg-muted"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">XLSX, XLS, or CSV files</p>
                  {fileName && <p className="mt-4 text-sm font-medium text-primary">{fileName}</p>}
                </div>
                <Input
                  id="excelFile"
                  name="excelFile"
                  type="file"
                  className="hidden"
                  onChange={(e) => setFileName(e.target.files?.[0]?.name || '')}
                  accept=".xlsx, .xls, .csv"
                />
              </label>
            </div>
          </div>
           <Button type="submit" disabled={isUploading} className="w-full mt-4">
            {isUploading ? 'Uploading...' : 'Upload and Process File'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
