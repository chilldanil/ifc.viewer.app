# Using the IFC Viewer (ESM)

```tsx
import { useEffect, useRef } from 'react';
import { createIFCViewer } from 'ifc-viewer';
import 'ifc-viewer/dist/ifc-viewer.css';

export default function Host() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const viewer = createIFCViewer({
      container: ref.current,
      onObjectSelected: (sel) => console.log('Selected', sel),
      onModelLoaded: (m) => console.log('Loaded', m),
      onError: (e) => console.error(e),
      theme: { '--bim-ui_color-base': '#1e2024' },
    });
    return () => viewer.unmount();
  }, []);
  return <div ref={ref} style={{ width: '100vw', height: '100vh' }} />;
}
```
