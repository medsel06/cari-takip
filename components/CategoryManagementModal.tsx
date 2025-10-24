'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  X, 
  Plus, 
  Edit2, 
  Trash2, 
  Save,
  Loader2,
  FolderPlus,
  Tag
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface Category {
  id: string;
  category_code: string;
  category_name: string;
  parent_id: string | null;
  is_active: boolean;
}

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryChange?: () => void;
}

export default function CategoryManagementModal({ isOpen, onClose, onCategoryChange }: CategoryModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryCode, setNewCategoryCode] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) return;

      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('company_id', userData.company_id)
        .is('parent_id', null)
        .order('category_name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Kategoriler yüklenemedi:', error);
      toast.error('Kategoriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !newCategoryCode.trim()) {
      toast.error('Kategori adı ve kodu zorunludur');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) return;

      const { error } = await supabase
        .from('expense_categories')
        .insert({
          company_id: userData.company_id,
          category_name: newCategoryName.trim(),
          category_code: newCategoryCode.trim().toUpperCase(),
          is_active: true
        });

      if (error) throw error;

      toast.success('Kategori eklendi');
      setNewCategoryName('');
      setNewCategoryCode('');
      await fetchCategories();
      onCategoryChange?.();
    } catch (error: any) {
      console.error('Kategori eklenemedi:', error);
      toast.error(error.message || 'Kategori eklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editingName.trim()) {
      toast.error('Kategori adı boş olamaz');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('expense_categories')
        .update({ category_name: editingName.trim() })
        .eq('id', id);

      if (error) throw error;

      toast.success('Kategori güncellendi');
      setEditingId(null);
      setEditingName('');
      await fetchCategories();
      onCategoryChange?.();
    } catch (error: any) {
      console.error('Kategori güncellenemedi:', error);
      toast.error(error.message || 'Kategori güncellenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`"${name}" kategorisini silmek istediğinize emin misiniz?`)) {
      return;
    }

    setLoading(true);
    try {
      // Soft delete - is_active = false
      const { error } = await supabase
        .from('expense_categories')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast.success('Kategori silindi');
      await fetchCategories();
      onCategoryChange?.();
    } catch (error: any) {
      console.error('Kategori silinemedi:', error);
      toast.error(error.message || 'Kategori silinemedi');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Tag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Kategori Yönetimi
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                {/* Add New Category */}
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <FolderPlus className="h-4 w-4" />
                    Yeni Kategori Ekle
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryCode}
                      onChange={(e) => setNewCategoryCode(e.target.value)}
                      placeholder="Kategori Kodu (ör: URUN)"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                    />
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Kategori Adı"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                    />
                    <button
                      onClick={handleAddCategory}
                      disabled={loading || !newCategoryName.trim() || !newCategoryCode.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Ekle
                    </button>
                  </div>
                </div>

                {/* Categories List */}
                {loading && categories.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : categories.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Henüz kategori eklenmemiş
                  </div>
                ) : (
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <motion.div
                        key={category.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                              {category.category_code}
                            </span>
                            {editingId === category.id ? (
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleUpdateCategory(category.id);
                                  if (e.key === 'Escape') {
                                    setEditingId(null);
                                    setEditingName('');
                                  }
                                }}
                                className="flex-1 px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                              />
                            ) : (
                              <span className="text-gray-900 dark:text-white">
                                {category.category_name}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {editingId === category.id ? (
                              <>
                                <button
                                  onClick={() => handleUpdateCategory(category.id)}
                                  disabled={loading}
                                  className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                                >
                                  <Save className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingId(null);
                                    setEditingName('');
                                  }}
                                  className="p-1.5 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingId(category.id);
                                    setEditingName(category.category_name);
                                  }}
                                  className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCategory(category.id, category.category_name)}
                                  disabled={loading}
                                  className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-end">
                  <button
                    onClick={onClose}
                    className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}