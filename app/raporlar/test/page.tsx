'use client';

export default function TestRaporPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Test Rapor Sayfası</h1>
      <p>Bu sayfa çalışıyorsa routing sorunu yoktur.</p>
      
      <div className="mt-4">
        <button 
          onClick={() => alert('Button çalışıyor!')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Test Button
        </button>
      </div>
    </div>
  );
}