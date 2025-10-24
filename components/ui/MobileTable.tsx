'use client';

import { useState, useEffect, useRef, TouchEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileTableProps {
  data: any[];
  columns: {
    key: string;
    label: string;
    render?: (value: any, row: any) => React.ReactNode;
    className?: string;
  }[];
  onRowClick?: (row: any) => void;
  className?: string;
}

export function MobileTable({ 
  data, 
  columns, 
  onRowClick,
  className 
}: MobileTableProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const tableRef = useRef<HTMLDivElement>(null);
  
  const itemsPerPage = 1; // Mobile'de kartlar tek tek gösterilir

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Touch handlers for swipe
  const handleTouchStart = (e: TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentPage < Math.ceil(data.length / itemsPerPage) - 1) {
      setCurrentPage(prev => prev + 1);
    }
    if (isRightSwipe && currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  // Desktop Table View
  if (!isMobile) {
    return (
      <div className={cn("overflow-x-auto", className)}>
        <table className="w-full">
          <thead className="bg-secondary">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={cn(
                    "px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider",
                    col.className
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((row, idx) => (
              <tr
                key={idx}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "hover:bg-secondary transition-colors",
                  onRowClick && "cursor-pointer"
                )}
              >
                {columns.map(col => (
                  <td key={col.key} className="px-6 py-4 text-sm">
                    {col.render 
                      ? col.render(row[col.key], row)
                      : row[col.key]
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Mobile Card View
  const startIdx = currentPage * itemsPerPage;
  const visibleData = data.slice(startIdx, startIdx + itemsPerPage);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Swipeable Cards */}
      <div
        ref={tableRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative"
      >
        {visibleData.map((row, idx) => (
          <div
            key={idx}
            onClick={() => onRowClick?.(row)}
            className={cn(
              "card p-4 space-y-3",
              onRowClick && "cursor-pointer active:scale-98 transition-transform"
            )}
          >
            {columns.map(col => (
              <div key={col.key} className="flex justify-between items-start">
                <span className="text-sm text-muted-foreground">
                  {col.label}
                </span>
                <span className="text-sm font-medium text-right">
                  {col.render 
                    ? col.render(row[col.key], row)
                    : row[col.key]
                  }
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Mobile Pagination */}
      {data.length > itemsPerPage && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
            className="p-2 rounded-lg bg-secondary disabled:opacity-50"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <div className="flex gap-1">
            {Array.from({ length: Math.ceil(data.length / itemsPerPage) }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  currentPage === i ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
          
          <button
            onClick={() => setCurrentPage(prev => 
              Math.min(Math.ceil(data.length / itemsPerPage) - 1, prev + 1)
            )}
            disabled={currentPage >= Math.ceil(data.length / itemsPerPage) - 1}
            className="p-2 rounded-lg bg-secondary disabled:opacity-50"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
      
      {/* Swipe hint */}
      <p className="text-center text-xs text-muted-foreground">
        ← Kaydırmak için sağa/sola kaydırın →
      </p>
    </div>
  );
}