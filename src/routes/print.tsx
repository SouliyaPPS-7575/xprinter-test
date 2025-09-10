import React, { useEffect, useState } from 'react';
import { connectJspm, printSampleBill, watchJspmStatus } from '../utils/jspm';

export const Print: React.FC = () => {
  const [status, setStatus] = useState<string>('Unknown');
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    // Subscribe to status changes and get a real unsubscribe function
    const unsub = watchJspmStatus(setStatus)
    return () => { unsub?.() }
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const ok = await connectJspm();
      if (!ok)
        alert(
          'Could not connect to JSPrintManager. Make sure the client is installed and running.'
        );
    } finally {
      setConnecting(false);
    }
  };

  const handlePrint = async () => {
    try {
      await printSampleBill({
        title: 'Sample Store',
        items: [
          { name: 'Coffee Latte', qty: 2, price: 3.5 },
          { name: 'Blueberry Muffin', qty: 1, price: 2.25 },
        ],
        taxRate: 0.07,
        footer: 'Thank you! Come again.',
      });
    } catch (err: any) {
      alert(err?.message ?? String(err));
    }
  };

  return (
    <div>
      <h1>Print</h1>
      <p className='status'>JSPrintManager Status: {status}</p>
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={handleConnect} disabled={connecting}>
          {connecting ? 'Connecting…' : 'Connect JSPrintManager'}
        </button>
        <button onClick={handlePrint}>Print Sample Bill</button>
      </div>
      <p style={{ marginTop: 16, opacity: 0.85 }}>
        Note: You need the JSPrintManager Client app installed and running on
        your machine for printing.
      </p>
    </div>
  );
};
