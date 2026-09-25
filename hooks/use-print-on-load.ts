'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

/** Triggers window.print() exactly once when `?print=true` is in the URL and `ready` is true —
 *  used so the "Print" link in an ExpandableList's expanded panel can land on the full detail
 *  page and immediately open the print dialog there. */
export function usePrintOnLoad(ready: boolean) {
  const searchParams = useSearchParams();
  const printed = useRef(false);

  useEffect(() => {
    if (ready && !printed.current && searchParams.get('print') === 'true') {
      printed.current = true;
      window.print();
    }
  }, [ready, searchParams]);
}
