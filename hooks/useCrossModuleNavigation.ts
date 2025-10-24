import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface NavigationContext {
  from?: {
    path: string;
    label: string;
  };
  relatedInfo?: string;
  data?: any;
}

export const useCrossModuleNavigation = () => {
  const router = useRouter();
  
  const navigateWithContext = (path: string, context?: NavigationContext) => {
    // Store context in sessionStorage for target page
    if (context) {
      sessionStorage.setItem('navigation-context', JSON.stringify(context));
    }
    
    // Show loading toast
    const loadingToast = toast.loading('Yönlendiriliyor...');
    
    // Smooth page transition
    document.body.style.opacity = '0.8';
    
    setTimeout(() => {
      router.push(path);
      toast.dismiss(loadingToast);
      document.body.style.opacity = '1';
    }, 200);
  };
  
  const getNavigationContext = (): NavigationContext | null => {
    if (typeof window === 'undefined') return null;
    
    const context = sessionStorage.getItem('navigation-context');
    if (context) {
      sessionStorage.removeItem('navigation-context');
      return JSON.parse(context);
    }
    return null;
  };
  
  const navigateBack = () => {
    const context = getNavigationContext();
    if (context?.from) {
      router.push(context.from.path);
    } else {
      router.back();
    }
  };
  
  return { 
    navigateWithContext, 
    getNavigationContext,
    navigateBack
  };
};