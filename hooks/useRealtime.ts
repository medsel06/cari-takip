import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface RealtimeConfig {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
}

export const useRealtime = (config: RealtimeConfig) => {
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  useEffect(() => {
    const supabase = createClient();
    
    // Get user's company_id
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();
        
      if (!userData?.company_id) return;
      
      const channel = supabase
        .channel(`${config.table}-changes`)
        .on(
          'postgres_changes' as any,
          {
            event: config.event || '*',
            schema: 'public',
            table: config.table,
            filter: config.filter || `company_id=eq.${userData.company_id}`,
          },
          (payload: any) => {
            setLastUpdate(new Date());
            
            switch (payload.eventType) {
              case 'INSERT':
                config.onInsert?.(payload);
                toast.success('Yeni kayıt eklendi', {
                  description: `${config.table} tablosuna yeni kayıt`,
                });
                break;
              case 'UPDATE':
                config.onUpdate?.(payload);
                toast.info('Kayıt güncellendi', {
                  description: `${config.table} tablosunda değişiklik`,
                });
                break;
              case 'DELETE':
                config.onDelete?.(payload);
                toast.warning('Kayıt silindi', {
                  description: `${config.table} tablosundan kayıt silindi`,
                });
                break;
            }
          }
        )
        .subscribe((status) => {
          setConnected(status === 'SUBSCRIBED');
        });
      
      return () => {
        channel.unsubscribe();
      };
    };
    
    setupSubscription();
  }, [config.table, config.event, config.filter]);
  
  return { connected, lastUpdate };
};