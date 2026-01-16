
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/Spinner';
import { useToast } from '@/hooks/use-toast';
import { UploadCloud, Image as ImageIcon, Video, File as FileIcon, Trash2, Eye } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';

// Type for the file data returned from the Cloud Function
type CloudFile = {
  id: string;
  fileUrl: string;
  filePath: string;
  fileName: string;
  fileType: 'image' | 'video' | 'raw' | string; // Loosen type for other content-types
  size: number;
  uploadedAt: string;
};

// Helper to convert file to Base64
const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};


export default function FileUploadPage() {
  const auth = useAuth();
  const functions = auth ? getFunctions(auth.app) : null;
  const { toast } = useToast();

  const [files, setFiles] = useState<CloudFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Memoized function to load user files
  const loadUserFiles = useCallback(async () => {
    if (!functions) return;
    setLoading(true);
    try {
      const getUserFiles = httpsCallable(functions, 'getUserFiles');
      const result = await getUserFiles();
      const data = result.data as { success: boolean; files: CloudFile[] };
      
      if (data.success) {
        setFiles(data.files);
      }
    } catch (error: any) {
      console.error('Error loading files:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load files',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [functions, toast]);

  useEffect(() => {
    loadUserFiles();
  }, [loadUserFiles]);

  // Handle file selection and upload
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !functions) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'File size must be less than 10MB.',
      });
      return;
    }

    setUploading(true);
    try {
      const base64File = await convertToBase64(file);
      const uploadFile = httpsCallable(functions, 'uploadFile');
      await uploadFile({
        file: base64File,
        fileName: file.name,
      });

      toast({
        title: 'Success!',
        description: 'File uploaded successfully!',
      });
      loadUserFiles(); // Reload files
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error.message,
      });
    } finally {
      setUploading(false);
      event.target.value = ''; // Reset input
    }
  };

  // Delete file
  const handleDelete = async (fileId: string) => {
    if (!functions || !window.confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      const deleteFile = httpsCallable(functions, 'deleteFile');
      await deleteFile({ fileId });

      toast({
        title: 'Success!',
        description: 'File deleted successfully!',
      });
      loadUserFiles(); // Reload files
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error.message,
      });
    }
  };

  const getFileIcon = (fileType: string | undefined) => {
      if (!fileType) return <FileIcon className="h-16 w-16 text-muted-foreground" />;
      if (fileType.startsWith('image/')) return <ImageIcon className="h-16 w-16 text-muted-foreground" />;
      if (fileType.startsWith('video/')) return <Video className="h-16 w-16 text-muted-foreground" />;
      return <FileIcon className="h-16 w-16 text-muted-foreground" />;
  }

  return (
    <div className="container py-8 md:py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">My Files</CardTitle>
          <CardDescription>Upload and manage your personal documents, including proof of payment.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-8">
            <label htmlFor="file-input" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-secondary hover:bg-muted">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                    <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">Images, Videos, PDFs (Max 10MB)</p>
                </div>
                <input
                    id="file-input"
                    type="file"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    accept="image/*,video/*,application/pdf"
                    className="hidden"
                />
            </label>
            {uploading && (
                <div className="mt-4 flex items-center justify-center gap-2 text-primary">
                    <Spinner size="small" />
                    <span>Uploading...</span>
                </div>
            )}
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Your Uploads ({files.length})</h3>
            {loading ? (
                <div className="flex justify-center items-center h-48">
                    <Spinner size="large" />
                </div>
            ) : files.length === 0 ? (
                <p className="text-muted-foreground text-center py-10">No files uploaded yet.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {files.map((file) => (
                    <Card key={file.id} className="flex flex-col overflow-hidden">
                        <CardContent className="p-0">
                            <div className="relative aspect-video w-full bg-secondary flex items-center justify-center">
                                {file.fileType.startsWith('image/') ? (
                                    <Image
                                        src={file.fileUrl}
                                        alt={file.fileName}
                                        fill
                                        className="object-cover"
                                    />
                                ) : file.fileType.startsWith('video/') ? (
                                    <video
                                        src={file.fileUrl}
                                        controls
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    getFileIcon(file.fileType)
                                )}
                            </div>
                        </CardContent>
                        <div className="p-4 flex flex-col flex-grow">
                            <p className="font-semibold truncate flex-grow">{file.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                                {(file.size / 1024).toFixed(2)} KB
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {format(new Date(file.uploadedAt), 'PPP')}
                            </p>
                            <div className="mt-4 flex gap-2">
                                <Button asChild size="sm" className="flex-1">
                                    <a href={file.fileUrl} target="_blank" rel="noopener noreferrer">
                                        <Eye className="mr-2 h-4 w-4" /> View
                                    </a>
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDelete(file.id)}
                                    className="flex-1"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </Button>
                            </div>
                        </div>
                    </Card>
                    ))}
                </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
