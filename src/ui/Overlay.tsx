import { useEffect } from 'react';
import { X } from 'lucide-react';
import { navigate } from '../lib/nav';

/** Side panel on desktop, full-screen sheet on mobile, for secondary pages. */
export function Overlay({
  title,
  children,
  onClose = () => navigate('/'),
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <section
      role="dialog"
      aria-label={title}
      className={`glass animate-slide-up pointer-events-auto fixed inset-0 z-[45] flex flex-col bg-[#0E1626]/95 lg:inset-auto lg:top-4 lg:bottom-4 lg:left-64 lg:rounded-3xl ${wide ? 'lg:w-[560px]' : 'lg:w-[420px]'}`}
    >
      <div className="flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),16px)] pb-3 lg:pt-5">
        <h2 className="font-display text-xl font-bold text-white">{title}</h2>
        <button type="button" className="icon-btn" aria-label={`Close ${title}`} onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-8">{children}</div>
    </section>
  );
}
