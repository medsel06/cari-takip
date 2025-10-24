'use client';

export default function RaporlarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="raporlar-layout">
      {children}
    </div>
  );
}