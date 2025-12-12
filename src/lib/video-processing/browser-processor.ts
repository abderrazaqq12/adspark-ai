// Browser-based Video Processing (FFmpeg.wasm + WebCodecs)

import { BrowserProcessingJob, ProcessingCapabilities, AISceneDefinition, MotionStyle } from './types';

// Check browser capabilities
export function detectCapabilities(): ProcessingCapabilities {
  const hasWebCodecs = 'VideoEncoder' in window && 'VideoDecoder' in window;
  const hasWasm = typeof WebAssembly !== 'undefined';
  
  return {
    supportsFFmpeg: hasWasm,
    supportsWebCodecs: hasWebCodecs,
    supportsWasm: hasWasm,
    maxFileSizeMB: 500, // Browser memory limit
    maxDurationSec: 120,
  };
}

// Motion effect generators for canvas-based processing
export const MOTION_EFFECTS: Record<MotionStyle, (ctx: CanvasRenderingContext2D, img: HTMLImageElement, progress: number, canvas: HTMLCanvasElement) => void> = {
  'static': (ctx, img, _progress, canvas) => {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  },
  
  'ken-burns': (ctx, img, progress, canvas) => {
    const scale = 1 + (progress * 0.3);
    const offsetX = (canvas.width * (scale - 1)) / 2;
    const offsetY = (canvas.height * (scale - 1)) / 2;
    
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    ctx.drawImage(img, -offsetX / scale, -offsetY / scale, canvas.width, canvas.height);
    ctx.restore();
  },
  
  'parallax': (ctx, img, progress, canvas) => {
    const offsetX = Math.sin(progress * Math.PI * 2) * 30;
    const scale = 1.1;
    
    ctx.save();
    ctx.scale(scale, scale);
    ctx.drawImage(img, offsetX - (canvas.width * 0.05), -(canvas.height * 0.05), canvas.width, canvas.height);
    ctx.restore();
  },
  
  'zoom-in': (ctx, img, progress, canvas) => {
    const scale = 1 + (progress * 0.5);
    
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  },
  
  'zoom-out': (ctx, img, progress, canvas) => {
    const scale = 1.5 - (progress * 0.5);
    
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  },
  
  'pan': (ctx, img, progress, canvas) => {
    const offsetX = (progress - 0.5) * canvas.width * 0.2;
    ctx.drawImage(img, offsetX, 0, canvas.width, canvas.height);
  },
  
  'shake': (ctx, img, progress, canvas) => {
    const shakeX = Math.sin(progress * Math.PI * 20) * 5;
    const shakeY = Math.cos(progress * Math.PI * 15) * 5;
    ctx.drawImage(img, shakeX, shakeY, canvas.width, canvas.height);
  },
  
  'orbit': (ctx, img, progress, canvas) => {
    const angle = progress * Math.PI * 0.1;
    const scale = 1.1;
    
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  },
};

// Create video from images with motion effects
export async function createVideoFromImages(
  images: string[],
  scenes: AISceneDefinition[],
  options: {
    width: number;
    height: number;
    fps: number;
    onProgress?: (progress: number) => void;
  }
): Promise<Blob | null> {
  const capabilities = detectCapabilities();
  
  if (!capabilities.supportsWebCodecs) {
    console.warn('[browser-processor] WebCodecs not supported, falling back to canvas recording');
    return createVideoWithCanvas(images, scenes, options);
  }
  
  try {
    return await createVideoWithWebCodecs(images, scenes, options);
  } catch (err) {
    console.error('[browser-processor] WebCodecs failed, falling back to canvas:', err);
    return createVideoWithCanvas(images, scenes, options);
  }
}

// WebCodecs-based video creation
async function createVideoWithWebCodecs(
  images: string[],
  scenes: AISceneDefinition[],
  options: {
    width: number;
    height: number;
    fps: number;
    onProgress?: (progress: number) => void;
  }
): Promise<Blob> {
  const { width, height, fps, onProgress } = options;
  
  // Load images
  const loadedImages = await Promise.all(
    images.map(src => new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    }))
  );
  
  // Create canvas for rendering
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  
  // Calculate total frames
  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
  const totalFrames = Math.ceil(totalDuration * fps);
  
  // Encode frames
  const chunks: EncodedVideoChunk[] = [];
  
  const encoder = new VideoEncoder({
    output: (chunk) => {
      chunks.push(chunk);
    },
    error: (e) => {
      console.error('[browser-processor] Encoder error:', e);
    },
  });
  
  encoder.configure({
    codec: 'vp8',
    width,
    height,
    bitrate: 2_000_000,
    framerate: fps,
  });
  
  let frameIndex = 0;
  let currentTime = 0;
  
  for (let sceneIndex = 0; sceneIndex < scenes.length; sceneIndex++) {
    const scene = scenes[sceneIndex];
    const img = loadedImages[sceneIndex % loadedImages.length];
    const sceneFrames = Math.ceil(scene.duration * fps);
    const motionEffect = MOTION_EFFECTS[scene.motionStyle] || MOTION_EFFECTS['static'];
    
    for (let f = 0; f < sceneFrames; f++) {
      const progress = f / sceneFrames;
      
      // Clear and apply motion effect
      ctx.clearRect(0, 0, width, height);
      motionEffect(ctx, img, progress, canvas);
      
      // Apply overlay if present
      if (scene.overlay) {
        drawOverlay(ctx, scene.overlay, width, height);
      }
      
      // Create video frame
      const frame = new VideoFrame(canvas, {
        timestamp: frameIndex * (1_000_000 / fps),
        duration: 1_000_000 / fps,
      });
      
      encoder.encode(frame);
      frame.close();
      
      frameIndex++;
      currentTime += 1 / fps;
      
      if (onProgress) {
        onProgress(frameIndex / totalFrames);
      }
    }
  }
  
  await encoder.flush();
  encoder.close();
  
  // Combine chunks into blob
  const data = new Uint8Array(chunks.reduce((sum, c) => sum + c.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) {
    const chunkData = new Uint8Array(chunk.byteLength);
    chunk.copyTo(chunkData);
    data.set(chunkData, offset);
    offset += chunk.byteLength;
  }
  
  return new Blob([data], { type: 'video/webm' });
}

// Canvas-based video creation (fallback)
async function createVideoWithCanvas(
  images: string[],
  scenes: AISceneDefinition[],
  options: {
    width: number;
    height: number;
    fps: number;
    onProgress?: (progress: number) => void;
  }
): Promise<Blob | null> {
  const { width, height, fps, onProgress } = options;
  
  // Load images
  const loadedImages = await Promise.all(
    images.map(src => new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    }))
  );
  
  // Create canvas and stream
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  
  // Use MediaRecorder
  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 2_000_000,
  });
  
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  
  return new Promise((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: 'video/webm' }));
    };
    
    recorder.start();
    
    let frameIndex = 0;
    const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
    const totalFrames = Math.ceil(totalDuration * fps);
    
    const renderFrame = () => {
      // Find current scene
      let elapsed = frameIndex / fps;
      let sceneIndex = 0;
      let sceneStartTime = 0;
      
      for (let i = 0; i < scenes.length; i++) {
        if (elapsed < sceneStartTime + scenes[i].duration) {
          sceneIndex = i;
          break;
        }
        sceneStartTime += scenes[i].duration;
      }
      
      const scene = scenes[sceneIndex];
      const sceneProgress = (elapsed - sceneStartTime) / scene.duration;
      const img = loadedImages[sceneIndex % loadedImages.length];
      const motionEffect = MOTION_EFFECTS[scene.motionStyle] || MOTION_EFFECTS['static'];
      
      // Clear and render
      ctx.clearRect(0, 0, width, height);
      motionEffect(ctx, img, sceneProgress, canvas);
      
      // Apply overlay
      if (scene.overlay) {
        drawOverlay(ctx, scene.overlay, width, height);
      }
      
      frameIndex++;
      
      if (onProgress) {
        onProgress(frameIndex / totalFrames);
      }
      
      if (frameIndex < totalFrames) {
        requestAnimationFrame(renderFrame);
      } else {
        recorder.stop();
      }
    };
    
    renderFrame();
  });
}

// Draw text overlay on canvas
function drawOverlay(
  ctx: CanvasRenderingContext2D,
  overlay: AISceneDefinition['overlay'],
  width: number,
  height: number
): void {
  if (!overlay) return;
  
  ctx.save();
  
  // Position
  let y = height / 2;
  if (overlay.position === 'top') y = 80;
  if (overlay.position === 'bottom') y = height - 80;
  if (overlay.position === 'lower-third') y = height - 150;
  
  // Style
  ctx.fillStyle = overlay.style?.color || '#ffffff';
  ctx.font = overlay.style?.font || 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Shadow for readability
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  // Draw text
  ctx.fillText(overlay.content, width / 2, y);
  
  ctx.restore();
}

// Trim video using canvas
export async function trimVideo(
  videoUrl: string,
  startTime: number,
  endTime: number,
  onProgress?: (progress: number) => void
): Promise<Blob | null> {
  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.src = videoUrl;
  
  await new Promise((resolve) => {
    video.onloadedmetadata = resolve;
  });
  
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d')!;
  
  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
  });
  
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  
  return new Promise((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: 'video/webm' }));
    };
    
    video.currentTime = startTime;
    
    video.onseeked = () => {
      recorder.start();
      video.play();
      
      const checkTime = () => {
        if (video.currentTime >= endTime) {
          video.pause();
          recorder.stop();
        } else {
          ctx.drawImage(video, 0, 0);
          if (onProgress) {
            onProgress((video.currentTime - startTime) / (endTime - startTime));
          }
          requestAnimationFrame(checkTime);
        }
      };
      
      checkTime();
    };
  });
}

// Merge multiple videos
export async function mergeVideos(
  videoUrls: string[],
  onProgress?: (progress: number) => void
): Promise<Blob | null> {
  // For browser-based merging, we sequentially play and record
  // This is a simplified version - full implementation would use ffmpeg.wasm
  
  const videos: HTMLVideoElement[] = [];
  
  for (const url of videoUrls) {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = url;
    await new Promise((resolve) => {
      video.onloadedmetadata = resolve;
    });
    videos.push(video);
  }
  
  if (videos.length === 0) return null;
  
  const canvas = document.createElement('canvas');
  canvas.width = videos[0].videoWidth;
  canvas.height = videos[0].videoHeight;
  const ctx = canvas.getContext('2d')!;
  
  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
  });
  
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  
  return new Promise((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: 'video/webm' }));
    };
    
    recorder.start();
    
    let currentVideoIndex = 0;
    const totalDuration = videos.reduce((sum, v) => sum + v.duration, 0);
    let elapsedTime = 0;
    
    const playNext = () => {
      if (currentVideoIndex >= videos.length) {
        recorder.stop();
        return;
      }
      
      const video = videos[currentVideoIndex];
      video.play();
      
      const render = () => {
        if (video.ended) {
          elapsedTime += video.duration;
          currentVideoIndex++;
          playNext();
        } else {
          ctx.drawImage(video, 0, 0);
          if (onProgress) {
            onProgress((elapsedTime + video.currentTime) / totalDuration);
          }
          requestAnimationFrame(render);
        }
      };
      
      render();
    };
    
    playNext();
  });
}
