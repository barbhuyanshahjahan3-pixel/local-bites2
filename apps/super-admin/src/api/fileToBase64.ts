// Converts a File to base64. Only downscales if the image is unusually large —
// QR codes need to stay sharp (no JPEG compression), so this keeps PNG output.
export function fileToBase64(file: File, maxDimension = 1000): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not read the selected image'));
      img.onload = () => {
        if (img.width <= maxDimension && img.height <= maxDimension) {
          resolve(reader.result as string);
          return;
        }
        let { width, height } = img;
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
