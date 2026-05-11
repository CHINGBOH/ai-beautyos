import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';

interface ButtonContent {
  id: number | null;
  pageKey: string;
  sectionKey: string;
  contentType: string;
  title: string;
  content: string;
  imageUrl: string | null;
  linkUrl: string | null;
  linkText: string;
  sortOrder: number;
  isActive: number;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

export const useButtonContent = (pageKey: string, buttonKey: string) => {
  const [content, setContent] = useState<ButtonContent | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, error: fetchError } = trpc.website.getButtonContent.useQuery({
    pageKey,
    buttonKey
  });

  useEffect(() => {
    if (isLoading) {
      setLoading(true);
      return;
    }

    if (isError) {
      setError(fetchError?.message || 'Failed to fetch button content');
      setLoading(false);
      return;
    }

    if (data) {
      setContent(data);
      setError(null);
    }

    setLoading(false);
  }, [data, isLoading, isError, fetchError]);

  return {
    content,
    loading,
    error,
    refetch: () => {} // Placeholder for refetch function
  };
};