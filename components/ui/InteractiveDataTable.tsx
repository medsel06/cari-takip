'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, ExternalLink, Package, User, FileText, 
  TrendingUp, AlertCircle, ChevronRight, Info,
  MoreHorizontal, Edit, Trash2, Copy, Download
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface InteractiveColumn {
  key: string;
  label: string;
  width?: string;
  sortable?: boolean;
  clickable?: boolean;
  linkTo?: (row: any) => string;
  showPreview?: boolean;
  previewComponent?: (row: any) => React.ReactNode;
  render?: (value: any, row: any) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface InteractiveDataTableProps {
  data: any[];
  columns: InteractiveColumn[];
  onRowClick?: (row: any) => void;
  showQuickActions?: boolean;
  loading?: boolean;
  searchable?: boolean;
  selectable?: boolean;
  onSelectionChange?: (selected: any[]) => void;
}

export const InteractiveDataTable = ({ 
  data = [], 
  columns,
  onRowClick,
  showQuickActions = true,
  loading = false,
  searchable = true,
  selectable = false,
  onSelectionChange
}: InteractiveDataTableProps) => {
  const router = useRouter();
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{row: number, col: number} | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, row: any} | null>(null);

  // Filter data based on search
  const filteredData = data.filter(row => {
    if (!searchTerm) return true;
    return Object.values(row).some(value => 
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig) return 0;
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    
    if (aVal === null) return 1;
    if (bVal === null) return -1;
    
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleCellClick = (e: React.MouseEvent, row: any, column: InteractiveColumn) => {
    e.stopPropagation();
    
    if (column.linkTo) {
      const target = e.currentTarget as HTMLElement;
      target.style.transform = 'scale(0.95)';
      
      // Smooth transition
      setTimeout(() => {
        router.push(column.linkTo!(row));
      }, 100);
    }
  };

  const handleCellHover = (e: React.MouseEvent, row: any, column: InteractiveColumn, rowIdx: number, colIdx: number) => {
    setHoveredCell({ row: rowIdx, col: colIdx });
    
    if (column.showPreview) {
      const rect = e.currentTarget.getBoundingClientRect();
      setPreviewPosition({ 
        x: Math.min(rect.right + 10, window.innerWidth - 350), 
        y: Math.min(rect.top, window.innerHeight - 200)
      });
      setPreviewData({ row, column });
    }
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return prev.direction === 'asc' 
          ? { key, direction: 'desc' }
          : null;
      }
      return { key, direction: 'asc' };
    });
  };

  const handleSelectAll = () => {
    if (selectedRows.size === sortedData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(sortedData.map((_, idx) => idx)));
    }
  };

  const handleSelectRow = (idx: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(idx)) {
      newSelected.delete(idx);
    } else {
      newSelected.add(idx);
    }
    setSelectedRows(newSelected);
    onSelectionChange?.(Array.from(newSelected).map(i => sortedData[i]));
  };

  const handleContextMenu = (e: React.MouseEvent, row: any) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, row });
  };

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  if (loading) {
    return <TableSkeleton columns={columns.length} rows={5} />;
  }

  return (
    <div className="relative">
      {/* Search Bar */}
      {searchable && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="Tabloda ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {selectable && (
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === sortedData.length && sortedData.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th 
                  key={col.key} 
                  className={cn(
                    "px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300",
                    col.sortable && "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700",
                    col.align === 'center' && "text-center",
                    col.align === 'right' && "text-right"
                  )}
                  style={{ width: col.width }}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-2">
                    {col.label}
                    {col.sortable && sortConfig?.key === col.key && (
                      <span className="text-blue-600">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {showQuickActions && (
                <th className="w-24 px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                  İşlemler
                </th>
              )}
            </tr>
          </thead>
          
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            <AnimatePresence>
              {sortedData.map((row, rowIdx) => (
                <motion.tr
                  key={rowIdx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2, delay: rowIdx * 0.02 }}
                  className={cn(
                    "hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer",
                    selectedRows.has(rowIdx) && "bg-blue-50 dark:bg-blue-900/20"
                  )}
                  onMouseEnter={() => setHoveredRow(rowIdx)}
                  onMouseLeave={() => {
                    setHoveredRow(null);
                    setHoveredCell(null);
                    setPreviewData(null);
                  }}
                  onClick={() => onRowClick?.(row)}
                  onContextMenu={(e) => handleContextMenu(e, row)}
                >
                  {selectable && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(rowIdx)}
                        onChange={() => handleSelectRow(rowIdx)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-gray-300"
                      />
                    </td>
                  )}
                  
                  {columns.map((col, colIdx) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 py-3 text-sm",
                        col.clickable && "hover:text-blue-600 dark:hover:text-blue-400",
                        col.align === 'center' && "text-center",
                        col.align === 'right' && "text-right",
                        hoveredCell?.row === rowIdx && hoveredCell?.col === colIdx && 
                        "bg-blue-50 dark:bg-blue-900/30"
                      )}
                      onClick={(e) => col.clickable && handleCellClick(e, row, col)}
                      onMouseEnter={(e) => handleCellHover(e, row, col, rowIdx, colIdx)}
                    >
                      <div className="flex items-center gap-2">
                        {col.clickable && (
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                        )}
                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                      </div>
                    </td>
                  ))}
                  
                  {showQuickActions && (
                    <td className="px-4 py-3 text-right">
                      <AnimatePresence>
                        {hoveredRow === rowIdx && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex justify-end gap-1"
                          >
                            <QuickActionButtons row={row} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </td>
                  )}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {sortedData.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Gösterilecek veri bulunamadı.
        </div>
      )}

      {/* Preview Popup */}
      <AnimatePresence>
        {previewData && (
          <QuickPreviewPopup 
            data={previewData} 
            position={previewPosition}
          />
        )}
      </AnimatePresence>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <ContextMenu 
            position={{ x: contextMenu.x, y: contextMenu.y }}
            row={contextMenu.row}
            onClose={() => setContextMenu(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Quick Action Buttons Component
const QuickActionButtons = ({ row }: { row: any }) => {
  const router = useRouter();
  
  const actions = [
    { 
      icon: Eye, 
      label: 'Görüntüle', 
      onClick: () => console.log('View', row) 
    },
    { 
      icon: Edit, 
      label: 'Düzenle', 
      onClick: () => console.log('Edit', row) 
    },
    { 
      icon: Copy, 
      label: 'Kopyala', 
      onClick: () => console.log('Copy', row) 
    },
  ];

  return (
    <>
      {actions.map((action, idx) => (
        <motion.button
          key={idx}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            action.onClick();
          }}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title={action.label}
        >
          <action.icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </motion.button>
      ))}
    </>
  );
};

// Preview Popup Component
const QuickPreviewPopup = ({ 
  data, 
  position 
}: { 
  data: any; 
  position: { x: number; y: number } 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 50
      }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 
                 dark:border-gray-700 p-4 min-w-[300px] max-w-[400px]"
    >
      {data.column.previewComponent ? (
        data.column.previewComponent(data.row)
      ) : (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Hızlı Önizleme</h3>
          <pre className="text-xs text-gray-600 dark:text-gray-400">
            {JSON.stringify(data.row, null, 2)}
          </pre>
        </div>
      )}
    </motion.div>
  );
};

// Context Menu Component
const ContextMenu = ({ 
  position, 
  row, 
  onClose 
}: { 
  position: { x: number; y: number };
  row: any;
  onClose: () => void;
}) => {
  const menuItems = [
    { icon: Eye, label: 'Görüntüle', action: () => console.log('View', row) },
    { icon: Edit, label: 'Düzenle', action: () => console.log('Edit', row) },
    { icon: Copy, label: 'Kopyala', action: () => console.log('Copy', row) },
    { icon: Download, label: 'İndir', action: () => console.log('Download', row) },
    { divider: true },
    { icon: Trash2, label: 'Sil', action: () => console.log('Delete', row), danger: true },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 100
      }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 
                 dark:border-gray-700 py-2 min-w-[180px]"
    >
      {menuItems.map((item, idx) => {
        if (item.divider) {
          return <div key={idx} className="my-1 border-t border-gray-200 dark:border-gray-700" />;
        }
        
        return (
          <button
            key={idx}
            onClick={() => {
              item.action?.();
              onClose();
            }}
            className={cn(
              "w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors",
              "hover:bg-gray-100 dark:hover:bg-gray-700",
              item.danger && "text-red-600 dark:text-red-400"
            )}
          >
            {item.icon && <item.icon className="h-4 w-4" />}
            {item.label}
          </button>
        );
      })}
    </motion.div>
  );
};

// Table Skeleton Component
const TableSkeleton = ({ columns, rows }: { columns: number; rows: number }) => {
  return (
    <div className="animate-pulse">
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: columns }).map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};