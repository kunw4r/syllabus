const colorCache = new Map<string, string>();

export function extractDominantColor(imageUrl: string): Promise<string> {
  if (colorCache.has(imageUrl)) {
    return Promise.resolve(colorCache.get(imageUrl)!);
  }

  return new Promise((resolve) => {
    const fallback = '233, 69, 96'; // accent red

    if (typeof window === 'undefined') {
      resolve(fallback);
      return;
    }

    const run = () => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(fallback); return; }

          // Sample at small size for performance
          canvas.width = 10;
          canvas.height = 10;
          ctx.drawImage(img, 0, 0, 10, 10);

          const data = ctx.getImageData(0, 0, 10, 10).data;
          let r = 0, g = 0, b = 0, count = 0;

          for (let i = 0; i < data.length; i += 4) {
            // Skip very dark or very bright pixels
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
            if (brightness > 30 && brightness < 220) {
              r += data[i];
              g += data[i + 1];
              b += data[i + 2];
              count++;
            }
          }

          if (count > 0) {
            const color = `${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)}`;
            colorCache.set(imageUrl, color);
            resolve(color);
          } else {
            resolve(fallback);
          }
        } catch {
          resolve(fallback);
        }
      };
      img.onerror = () => resolve(fallback);
      img.src = imageUrl;
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(run);
    } else {
      setTimeout(run, 100);
    }
  });
}
