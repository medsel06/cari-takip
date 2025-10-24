interface KatipLogoSimpleProps {
  className?: string;
}

export function KatipLogoSimple({ className = '' }: KatipLogoSimpleProps) {
  return (
    <div className={`${className} select-none flex items-center`}>
      <span 
        className="text-4xl font-serif text-white"
        style={{
          fontFamily: 'Georgia, Times New Roman, serif',
          letterSpacing: '0.05em',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
          fontWeight: '400',
        }}
      >
        K<span className="relative" style={{ fontSize: '0.9em' }}>â</span>tip
      </span>
    </div>
  );
}