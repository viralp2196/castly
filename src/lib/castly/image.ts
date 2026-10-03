export function readProductImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Choose a photo."));
      return;
    }
    if (file.size > 8_000_000) {
      reject(new Error("Use a photo under 8MB."));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 720;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Couldn't read that photo."));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/jpeg", 0.72);
      URL.revokeObjectURL(url);
      resolve(data);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read that photo."));
    };
    img.src = url;
  });
}

export function urlToJpeg(src: string): Promise<string> {
  if (src.startsWith("data:image/")) return Promise.resolve(src);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const max = 768;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Couldn't read the creator photo."));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => reject(new Error("Couldn't read the creator photo."));
    img.src = src;
  });
}
