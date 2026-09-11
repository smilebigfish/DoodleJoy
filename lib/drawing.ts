export type Point = {
  x: number;
  y: number;
};

export type DrawTool = "pen" | "eraser";
export type Tool = DrawTool | "pan";

export type Stroke = {
  tool: DrawTool;
  color: string;
  size: number;
  points: Point[];
};

export const PAPER = "#FFFDF8";
export const MIN_BRUSH = 8;
export const MAX_BRUSH = 72;
export const DEFAULT_BRUSH = 18;

export const paintStroke = (
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
) => {
  const points = stroke.points;
  if (points.length === 0) {
    return;
  }

  ctx.save();
  if (stroke.tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = stroke.color;
  }
  ctx.lineWidth = stroke.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  if (points.length === 1) {
    ctx.lineTo(points[0].x + 0.01, points[0].y);
  } else {
    for (let index = 1; index < points.length; index += 1) {
      ctx.lineTo(points[index].x, points[index].y);
    }
  }
  ctx.stroke();
  ctx.restore();
};

export const redrawStrokes = (
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  width: number,
  height: number,
  dpr: number,
) => {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  strokes.forEach((stroke) => {
    paintStroke(ctx, stroke);
  });
};

export const drawCoverImage = (
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  canvasWidth: number,
  canvasHeight: number,
  sourceWidth: number,
  sourceHeight: number,
) => {
  const scale = Math.max(canvasWidth / sourceWidth, canvasHeight / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const dx = (canvasWidth - drawWidth) / 2;
  const dy = (canvasHeight - drawHeight) / 2;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, dx, dy, drawWidth, drawHeight);
};

export const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

export const dataUrlToBlob = async (dataUrl: string) => {
  const response = await fetch(dataUrl);
  return response.blob();
};

export const orientationFromSize = (width: number, height: number) =>
  width >= height ? ("landscape" as const) : ("portrait" as const);

export const canvasToBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("無法匯出圖片"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });

export const makeThumbnail = async (source: HTMLCanvasElement, maxWidth = 360) => {
  const bounds = contentBounds(source);
  const crop = document.createElement("canvas");
  if (!bounds) {
    crop.width = source.width;
    crop.height = source.height;
    const cropCtx = crop.getContext("2d");
    if (!cropCtx) {
      throw new Error("無法建立縮圖");
    }
    cropCtx.drawImage(source, 0, 0);
  } else {
    const pad = Math.round(Math.max(source.width, source.height) * 0.04);
    const sx = Math.max(0, bounds.minX - pad);
    const sy = Math.max(0, bounds.minY - pad);
    const sw = Math.min(source.width - sx, bounds.maxX - bounds.minX + pad * 2);
    const sh = Math.min(source.height - sy, bounds.maxY - bounds.minY + pad * 2);
    crop.width = Math.max(1, sw);
    crop.height = Math.max(1, sh);
    const cropCtx = crop.getContext("2d");
    if (!cropCtx) {
      throw new Error("無法建立縮圖");
    }
    cropCtx.fillStyle = PAPER;
    cropCtx.fillRect(0, 0, crop.width, crop.height);
    cropCtx.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);
  }

  const scale = Math.min(1, maxWidth / crop.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(crop.width * scale));
  canvas.height = Math.max(1, Math.round(crop.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("無法建立縮圖");
  }
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(crop, 0, 0, canvas.width, canvas.height);
  return canvasToBlob(canvas);
};

const contentBounds = (source: HTMLCanvasElement) => {
  const ctx = source.getContext("2d");
  if (!ctx) {
    return null;
  }
  const { width, height } = source;
  const { data } = ctx.getImageData(0, 0, width, height);
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const isPaper = red >= 248 && green >= 248 && blue >= 244;
      if (isPaper) {
        continue;
      }
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX) {
    return null;
  }
  return { minX, minY, maxX, maxY };
};

export type ImportedImage = {
  dataUrl: string;
  overlay: boolean;
};

export const imageHasTransparency = (image: HTMLImageElement) => {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) {
    return false;
  }
  const sampleWidth = Math.min(sourceWidth, 320);
  const sampleHeight = Math.min(sourceHeight, 320);
  const canvas = document.createElement("canvas");
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return false;
  }
  ctx.drawImage(image, 0, 0, sampleWidth, sampleHeight);
  const pixels = ctx.getImageData(0, 0, sampleWidth, sampleHeight).data;
  let soft = 0;
  const total = sampleWidth * sampleHeight;
  for (let index = 3; index < pixels.length; index += 4) {
    const alpha = pixels[index];
    if (alpha === 0) {
      return true;
    }
    if (alpha < 250) {
      soft += 1;
    }
  }
  return soft / total > 0.01;
};

export const readImageFile = (
  file: File,
  orientation: "portrait" | "landscape",
  maxSize = 2560,
) =>
  new Promise<ImportedImage>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      if (orientation === "portrait") {
        canvas.width = Math.round(maxSize * 0.75);
        canvas.height = maxSize;
      } else {
        canvas.width = maxSize;
        canvas.height = Math.round(maxSize * 0.75);
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("無法讀取圖片"));
        return;
      }
      const overlay = imageHasTransparency(image);
      if (!overlay) {
        ctx.fillStyle = PAPER;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      drawCoverImage(
        ctx,
        image,
        canvas.width,
        canvas.height,
        image.width,
        image.height,
      );
      resolve({
        dataUrl: overlay
          ? canvas.toDataURL("image/png")
          : canvas.toDataURL("image/jpeg", 0.86),
        overlay,
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("圖片打不開"));
    };
    image.src = url;
  });
