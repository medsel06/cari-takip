'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Package, AlertCircle, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface ProductListPreviewProps {
  products: any[];
}

export const ProductListPreview = ({ products }: ProductListPreviewProps) => {
  const router = useRouter();
  const [stockData, setStockData] = useState<Map<string, any>>(new Map());
  
  useEffect(() => {
    const fetchStockData = async () => {
      if (!products || products.length === 0) return;
      
      const supabase = createClient();
      const productIds = products.map(p => p.product_id).filter(Boolean);
      
      if (productIds.length > 0) {
        const { data, error } = await supabase
          .from('products')
          .select('id, current_stock, min_stock')
          .in('id', productIds);
          
        if (!error && data) {
          const stockMap = new Map();
          data.forEach(item => {
            stockMap.set(item.id, item);
          });
          setStockData(stockMap);
        }
      }
    };
    
    fetchStockData();
  }, [products]);
  
  const getStockStatus = (current: number, min: number) => {
    const percentage = (current / min) * 100;
    if (percentage <= 25) return { status: 'critical', color: 'bg-red-500', text: 'Kritik' };
    if (percentage <= 50) return { status: 'warning', color: 'bg-yellow-500', text: 'Düşük' };
    return { status: 'good', color: 'bg-green-500', text: 'Yeterli' };
  };
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
          Ürün Listesi ({products.length})
        </h3>
        <Package className="h-4 w-4 text-gray-400" />
      </div>
      
      {products.slice(0, 4).map((item, idx) => {
        const stock = stockData.get(item.product_id);
        const stockStatus = stock ? getStockStatus(stock.current_stock, stock.min_stock) : null;
        
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            whileHover={{ x: 5 }}
            className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 
                     rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
            onClick={() => router.push(`/stok/${item.product_id}`)}
          >
            <div className="flex items-center gap-2 flex-1">
              <Package className="h-3 w-3 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {item.product_name || item.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {item.quantity} {item.unit}
                </p>
              </div>
            </div>
            
            {stock && (
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      Stok: {stock.current_stock}
                    </span>
                    {stockStatus?.status === 'critical' && (
                      <AlertCircle className="h-3 w-3 text-red-500 animate-pulse" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="w-12 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${stockStatus?.color} transition-all`}
                        style={{ width: `${Math.min((stock.current_stock / stock.min_stock) * 100, 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs ${
                      stockStatus?.status === 'critical' ? 'text-red-500' :
                      stockStatus?.status === 'warning' ? 'text-yellow-500' :
                      'text-green-500'
                    }`}>
                      {stockStatus?.text}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        );
      })}
      
      {products.length > 4 && (
        <div className="text-center pt-2">
          <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
            +{products.length - 4} ürün daha...
          </button>
        </div>
      )}
    </div>
  );
};