"use client";
import React, { useState } from 'react';
import { 
  useQuery, 
  useMutation, 
  useQueryClient, 
  QueryClient, 
  QueryClientProvider 
} from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";

const API_BASE = 'http://localhost:5000';
const toast = {} as any;

// Type Definitions
interface Image {
  id: number;
  filename: string;
  description?: string;
}

interface SearchResult extends Image {
  similarity: number;
}

// Utility function to handle fetch responses
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'An error occurred');
  }
  return response.json();
};

// Fetch all images
const fetchImages = async (): Promise<Image[]> => {
  const response = await fetch(`${API_BASE}/list_images`);
  return handleResponse(response);
};

// Search images
const searchImages = async ({ query, topK = 5 }: { query: string; topK?: number }): Promise<SearchResult[]> => {
  const response = await fetch(`${API_BASE}/search?query=${encodeURIComponent(query)}&top_k=${topK}`);
  return handleResponse(response);
};

// Add an image
const addImage = async ({ file, description }: { file: File; description: string }): Promise<Image> => {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('description', description);

  const response = await fetch(`${API_BASE}/add_image`, {
    method: 'POST',
    body: formData,
  });

  return handleResponse(response);
};

// Download an image
const downloadImage = async (imageId: number): Promise<Blob> => {
  const response = await fetch(`${API_BASE}/download_image/${imageId}`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to download image');
  }
  return response.blob();
};

function ImageSearchApp() {
  const queryClient = useQueryClient();
  const [searchQueryText, setSearchQueryText] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState('');

  // Queries
  const imagesQuery = useQuery<Image[]>({
    queryKey: ['images'],
    queryFn: fetchImages,
    staleTime: 5000
  });

  const searchResultsQuery = useQuery<SearchResult[]>({
    queryKey: ['search', searchQueryText],
    queryFn: () => searchImages({ query: searchQueryText }),
    enabled: !!searchQueryText
  });

  // Mutations
  const addImageMutation = useMutation({
    mutationFn: addImage,
    onSuccess: () => {
      toast.success('Image added successfully!');
      queryClient.invalidateQueries({ queryKey: ['images'] });
      setUploadFile(null);
      setUploadDescription('');
    },
    onError: () => {
      toast.error('Error adding image');
    }
  });

  const downloadImageMutation = useMutation({
    mutationFn: downloadImage,
    onSuccess: (blob, imageId) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `image_${imageId}.jpg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Image downloaded successfully!');
    },
    onError: () => {
      toast.error('Error downloading image');
    }
  });

  const handleUpload = () => {
    if (!uploadFile) {
      toast.error('Please select a file to upload');
      return;
    }
    addImageMutation.mutate({ 
      file: uploadFile, 
      description: uploadDescription 
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadFile(file);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Toaster />
      <h1 className="text-3xl font-bold text-center mb-6">Image Search Engine</h1>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Add Image</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Image File</Label>
            <Input 
              type="file" 
              onChange={handleFileChange} 
              className="mt-2"
            />
          </div>
          <div>
            <Label>Description (Optional)</Label>
            <Input 
              type="text" 
              placeholder="Enter description"
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              className="mt-2"
            />
          </div>
          <Button 
            onClick={handleUpload} 
            disabled={addImageMutation.isPending}
          >
            {addImageMutation.isPending ? 'Adding...' : 'Add Image'}
          </Button>
        </CardContent>
      </Card>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle>Search Images</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="text"
            placeholder="Enter search query"
            value={searchQueryText}
            onChange={(e) => setSearchQueryText(e.target.value)}
          />
          <Button 
            onClick={() => searchResultsQuery.refetch()} 
            disabled={searchResultsQuery.isFetching}
          >
            {searchResultsQuery.isFetching ? 'Searching...' : 'Search'}
          </Button>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResultsQuery.data && searchResultsQuery.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
          </CardHeader>
          <CardContent className='flex'>
            {searchResultsQuery.data.map((result) => (
             <div 
             key={result.id} 
             className="border rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow space-y-2"
           >
             {/* Image Thumbnail */}
             <img 
               src={`${API_BASE}/download_image/${result.id}`} 
               alt={result.description || `Image ${result.id}`} 
               className="w-full h-32 object-cover rounded"
             />
             {/* Description */}
             <p className="text-sm text-gray-600 truncate">
               {result.description || 'No description'}
             </p>
             <Button 
               onClick={() => downloadImageMutation.mutate(result.id)}
               disabled={downloadImageMutation.isPending}
               className="w-full"
             >
               {downloadImageMutation.isPending ? 'Downloading...' : 'Download'}
             </Button>
           </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* All Images Section */}
      <Card>
        <CardHeader>
          <CardTitle>All Images</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => imagesQuery.refetch()} 
            className="mb-4"
            disabled={imagesQuery.isFetching}
          >
            {imagesQuery.isFetching ? 'Refreshing...' : 'Refresh List'}
          </Button>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {imagesQuery.data?.map((image) => (
              <div 
                key={image.id} 
                className="border rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow space-y-2"
              >
                {/* Image Thumbnail */}
                <img 
                  src={`${API_BASE}/download_image/${image.id}`} 
                  alt={image.description || `Image ${image.id}`} 
                  className="w-full h-32 object-cover rounded"
                />
                {/* Description */}
                <p className="text-sm text-gray-600 truncate">
                  {image.description || 'No description'}
                </p>
                <Button 
                  onClick={() => downloadImageMutation.mutate(image.id)}
                  disabled={downloadImageMutation.isPending}
                  className="w-full"
                >
                  {downloadImageMutation.isPending ? 'Downloading...' : 'Download'}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ImageSearchApp;
