// Converts a File to base64, resizing/compressing it in the browser first.
// This is important: an uncompressed phone-camera photo can be 5-10MB, which used to
// blow past the server's JSON body limit and fail the whole "add item" request silently.
// Resizing here keeps each photo well under ~400KB before it's ever sent.
export function fileToBase64(file: File, maxDimension = 1280, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not read the selected image'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback: no canvas support, just send the original
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// Runs fileToBase64 over a list of files, in order, stopping early with a clear error
// if any single file can't be read (rather than failing the whole batch silently).
export async function filesToBase64(files: File[], maxDimension = 1280, quality = 0.75): Promise<string[]> {
  const out: string[] = [];
  for (const file of files) {
    out.push(await fileToBase64(file, maxDimension, quality));
  }
  return out;
}
