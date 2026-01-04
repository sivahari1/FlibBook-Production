'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookShopItemCard } from './BookShopItemCard';
import { getCategoryStructure } from '@/lib/bookshop-categories';
import { ContentMetadata } from '@/lib/types/content';
import { useToast } from '@/components/ui/Toast';

interface BookShopItem {
  id: string;
  documentId: string;
  title: string;
  description: string | null;
  category: string;
  isFree: boolean;
  price: number | null;
  isPublished: boolean;
  inMyJstudyroom: boolean;
  contentType?: string;
  metadata?: ContentMetadata;
  previewUrl?: string;
  linkUrl?: string;
  document: {
    id: string;
    title: string;
    filename: string;
    contentType?: string;
    metadata?: ContentMetadata;
    thumbnailUrl?: string;
    linkUrl?: string;
  };
}

export function BookShop() {
  const [items, setItems] = useState<BookShopItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedContentType, setSelectedContentType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { showToast, ToastContainer } = useToast();

  /* ---------------- FETCH BOOKSHOP ITEMS ---------------- */

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/bookshop', { cache: 'no-store' });

      if (!res.ok) {
        throw new Error(`Failed to load bookshop (${res.status})`);
      }

      const text = await res.text();
      let json: any = {};

      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = {};
      }

      const items: BookShopItem[] = Array.isArray(json.items)
        ? json.items
        : [];

      setItems(items);

      setCategories(
        Array.from(new Set(items.map(i => i.category))).sort()
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookshop');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- FETCH USER LIMITS (OPTIONAL) ---------------- */

  const fetchUserLimits = async () => {
    try {
      await fetch('/api/member/my-jstudyroom', { cache: 'no-store' });
    } catch {
      /* silently ignore */
    }
  };

  useEffect(() => {
    fetchItems();
    fetchUserLimits();
  }, []);

  /* ---------------- ADD TO MY STUDYROOM ---------------- */

  const handleAddToMyJstudyroom = async (itemId: string) => {
    try {
      const res = await fetch('/api/member/my-jstudyroom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookShopItemId: itemId }),
      });

      const text = await res.text();
      let json: any = null;

      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }

      if (!res.ok) {
        throw new Error(json?.error || 'Failed to add item');
      }

      const added = items.find(i => i.id === itemId);

      showToast({
        message: `"${added?.title}" added to My Study Room`,
        type: 'success',
        duration: 4000,
      });

      await fetchItems();
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : 'Failed to add item',
        type: 'error',
      });
    }
  };

  /* ---------------- FILTERING ---------------- */

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (selectedCategory && item.category !== selectedCategory) return false;
      if (selectedContentType) {
        const type = item.document?.contentType || 'PDF';
        if (type !== selectedContentType) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, selectedCategory, selectedContentType, searchQuery]);

  /* ---------------- UI STATES ---------------- */

  if (loading) {
    return <div className="p-6">Loading Book Shop…</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-red-600">
        {error}
        <button onClick={fetchItems} className="ml-4 underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <ToastContainer />

      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Book Shop</h2>

        {/* Filters */}
        <div className="flex gap-4">
          <input
            placeholder="Search..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="border px-3 py-2"
          />

          <select
            value={selectedContentType}
            onChange={e => setSelectedContentType(e.target.value)}
            className="border px-3 py-2"
          >
            <option value="">All Types</option>
            <option value="PDF">PDF</option>
            <option value="IMAGE">Image</option>
            <option value="VIDEO">Video</option>
            <option value="LINK">Link</option>
            <option value="AUDIO">Audio</option>
          </select>

          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="border px-3 py-2"
          >
            <option value="">All Categories</option>
            {getCategoryStructure().map(cat => (
              <option key={cat.name} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Items */}
        {filteredItems.length === 0 ? (
          <div>No items available</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredItems.map(item => (
              <BookShopItemCard
                key={item.id}
                item={item}
                onAddToMyJstudyroom={handleAddToMyJstudyroom}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
