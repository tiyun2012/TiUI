import React, { useEffect, useRef, useState } from 'react';
import { WidgetContext } from '../../types';
import { Button } from '../ui/Primitives';

export interface ViewportParams {
  viewportId: string;
  sceneId?: string;
}

export const ViewportWidget: React.FC<{ context: WidgetContext; params: ViewportParams }> = ({ context, params }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stats, setStats] = useState<{ fps: number; tris: number } | null>(null);
  const [activeScene, setActiveScene] = useState<string>(params.sceneId || 'Loading...');

  // Mock rendering loop
  useEffect(() => {
    let frameId: number;
    const ctx = canvasRef.current?.getContext('2d');
    
    const render = () => {
      if (ctx && canvasRef.current) {
        // Clear
        ctx.fillStyle = '#101012'; // Very dark gray for viewport bg
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        // Draw grid
        ctx.strokeStyle = '#27272a';
        ctx.lineWidth = 1;
        const w = canvasRef.current.width;
        const h = canvasRef.current.height;
        
        for (let x = 0; x < w; x += 40) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += 40) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        // Draw "3D" Object placeholder
        const time = Date.now() * 0.001;
        const cx = w / 2 + Math.sin(time) * 50;
        const cy = h / 2 + Math.cos(time) * 50;
        
        ctx.fillStyle = context.isActive ? '#3b82f6' : '#52525b';
        ctx.beginPath();
        ctx.arc(cx, cy, 30, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw ID text
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.fillText(`VP: ${params.viewportId}`, 10, 20);
        ctx.fillText(`Scene: ${activeScene}`, 10, 35);
      }
      frameId = requestAnimationFrame(render);
    };

    // Initialize module connection
    const init = async () => {
      try {
        if (canvasRef.current) {
          await context.api.call('viewport', 'attachCanvas', { 
            viewportId: params.viewportId, 
            sceneId: params.sceneId 
          });
        }
        
        const sceneData = await context.api.call<{sceneId: string}>('scene', 'getActive');
        setActiveScene(sceneData.sceneId);

        // Poll stats
        const s = await context.api.call<{ fps: number, tris: number }>('viewport', 'getStats', { viewportId: params.viewportId });
        setStats(s);
      } catch (e) {
        console.error("Viewport init failed", e);
      }
    };

    init();
    render();

    return () => {
      cancelAnimationFrame(frameId);
      context.api.call('viewport', 'detachCanvas', { viewportId: params.viewportId }).catch(console.error);
    };
  }, [params.viewportId, context.api, context.isActive, params.sceneId]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && canvasRef.current.parentElement) {
        canvasRef.current.width = canvasRef.current.parentElement.clientWidth;
        canvasRef.current.height = canvasRef.current.parentElement.clientHeight;
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial
    
    const resizeObserver = new ResizeObserver(handleResize);
    if (canvasRef.current?.parentElement) {
        resizeObserver.observe(canvasRef.current.parentElement);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="w-full h-full relative overflow-hidden bg-black">
      <canvas ref={canvasRef} className="block" />
      
      {/* Viewport Overlay UI */}
      <div className="absolute top-2 right-2 flex space-x-1">
        <Button variant="ghost" onClick={() => context.api.call('viewport', 'setNavMode', { viewportId: params.viewportId, mode: 'translate' })}>MOV</Button>
        <Button variant="ghost" onClick={() => context.api.call('viewport', 'setNavMode', { viewportId: params.viewportId, mode: 'rotate' })}>ROT</Button>
        <Button variant="ghost" onClick={() => context.api.call('viewport', 'setNavMode', { viewportId: params.viewportId, mode: 'scale' })}>SCL</Button>
      </div>

      {stats && (
        <div className="absolute bottom-2 right-2 text-[10px] text-editor-muted font-mono bg-black/50 p-1 rounded">
          FPS: {stats.fps} | Tris: {stats.tris.toLocaleString()}
        </div>
      )}
    </div>
  );
};