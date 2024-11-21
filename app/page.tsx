"use client";
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
import { Toaster, toast } from "sonner";
import { 
  Upload,
  Search,
  Image as ImageIcon,
  RefreshCw,
  Download,
  Plus,
  ImagePlus,
  Loader2
} from 'lucide-react';

const API_BASE = 'http://localhost:5000';

// Type Definitions
interface Image {
  id: number;
  filename: string;
  description?: string;
}

interface SearchResult extends Image {
  similarity: number;
}

// Create a new QueryClient instance
const queryClient = new QueryClient();

// Utility function to handle fetch responses
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'An error occurred');
  }
  return response.json();
};

// API Functions
const fetchImages = async (): Promise<Image[]> => {
  const response = await fetch(`${API_BASE}/list_images`);
  return handleResponse(response);
};

const searchImages = async ({ query, topK = 5 }: { query: string; topK?: number }): Promise<SearchResult[]> => {
  const response = await fetch(`${API_BASE}/search?query=${encodeURIComponent(query)}&top_k=${topK}`);
  return handleResponse(response);
};

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
    onError: (error: Error) => {
      toast.error(`Error adding image: ${error.message}`);
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
    onError: (error: Error) => {
      toast.error(`Error downloading image: ${error.message}`);
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
    <div className="max-w-6xl mx-auto p-6 space-y-8 bg-gray-50 min-h-screen">
      <Toaster richColors position="top-center" />
      <div className="flex items-center justify-center space-x-3">
        <ImageIcon className="w-8 h-8 text-blue-500" />
        <h1 className="text-3xl font-bold text-center">Image Search Engine</h1>
      </div>

      {/* Upload Section */}
      <Card className="shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-2">
            <ImagePlus className="w-5 h-5 text-blue-500" />
            <CardTitle>Add Image</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div>
            <Label className="flex items-center space-x-2">
              <Upload className="w-4 h-4" />
              <span>Image File</span>
            </Label>
            <Input 
              type="file" 
              onChange={handleFileChange} 
              className="pb-10 mt-2 mb-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              accept="image/*"
            />
          </div>
          <div>
            <Label className="flex items-center space-x-2">
              {/* <FileDescription className="w-4 h-4" /> */}
              <span>Description (Optional)</span>
            </Label>
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
            className="w-full bg-blue-500 hover:bg-blue-600"
          >
            {addImageMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add Image
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Search Section */}
      <Card className="shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-purple-500" />
            <CardTitle>Search Images</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="relative">
            <Input
              type="text"
              placeholder="Enter search query"
              value={searchQueryText}
              onChange={(e) => setSearchQueryText(e.target.value)}
              className="pl-10"
            />
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          </div>
          <Button 
            onClick={() => searchResultsQuery.refetch()} 
            disabled={searchResultsQuery.isFetching}
            className="w-full bg-purple-500 hover:bg-purple-600"
          >
            {searchResultsQuery.isFetching ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Search
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResultsQuery.data && searchResultsQuery.data.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-green-50 to-teal-50">
            <div className="flex items-center space-x-2">
              <ImageIcon className="w-5 h-5 text-green-500" />
              <CardTitle>Search Results</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-6">
            {searchResultsQuery.data.map((result) => (
              <div 
                key={result.id} 
                className="border rounded-xl p-4 shadow-sm hover:shadow-md transition-all hover:scale-105 space-y-3 bg-white"
              >
                <div className="relative group">
                  <img 
                    src={`${API_BASE}/download_image/${result.id}`} 
                    alt={result.description || `Image ${result.id}`} 
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg" />
                </div>
                <p className="text-sm text-gray-600 truncate">
                  {result.description || 'No description'}
                </p>
                <p className="text-xs text-gray-500">
                  Similarity: {(result.similarity * 100).toFixed(1)}%
                </p>
                <Button 
                  onClick={() => downloadImageMutation.mutate(result.id)}
                  disabled={downloadImageMutation.isPending}
                  className="w-full bg-green-500 hover:bg-green-600"
                >
                  {downloadImageMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </>
                  )}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* All Images Section */}
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-yellow-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ImageIcon className="w-5 h-5 text-orange-500" />
              <CardTitle>All Images</CardTitle>
            </div>
            <Button 
              onClick={() => imagesQuery.refetch()} 
              variant="outline"
              size="sm"
              disabled={imagesQuery.isFetching}
              className="hover:bg-orange-50"
            >
              {imagesQuery.isFetching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {imagesQuery.data?.map((image) => (
              <div 
                key={image.id} 
                className="border rounded-xl p-4 shadow-sm hover:shadow-md transition-all hover:scale-105 space-y-3 bg-white"
              >
                <div className="relative group">
                  <img 
                    src={`${API_BASE}/download_image/${image.id}`} 
                    alt={image.description || `Image ${image.id}`} 
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg" />
                </div>
                <p className="text-sm text-gray-600 truncate">
                  {image.description || 'No description'}
                </p>
                <Button 
                  onClick={() => downloadImageMutation.mutate(image.id)}
                  disabled={downloadImageMutation.isPending}
                  className="w-full bg-orange-500 hover:bg-orange-600"
                >
                  {downloadImageMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </>
                  )}
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
