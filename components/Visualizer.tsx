import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  isActive: boolean;
  volume: number; // 0 to 1
}

const Visualizer: React.FC<VisualizerProps> = ({ isActive, volume }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let bars = Array(20).fill(10); // Initial height

    const render = () => {
      if (!isActive) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const barWidth = (width / bars.length) - 4;

      // Update bars based on volume with some randomness for "organic" look
      bars = bars.map(prev => {
         const target = Math.max(5, volume * 150 * (0.5 + Math.random()));
         return prev + (target - prev) * 0.2; // Smooth transition
      });

      bars.forEach((h, i) => {
        const x = i * (barWidth + 4) + 2;
        const y = (height - h) / 2;
        
        // Create gradient
        const gradient = ctx.createLinearGradient(0, y, 0, y + h);
        gradient.addColorStop(0, '#3b82f6'); // Blue-500
        gradient.addColorStop(1, '#8b5cf6'); // Violet-500

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, h, 4);
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isActive, volume]);

  return (
    <canvas 
      ref={canvasRef} 
      width={300} 
      height={100} 
      className="w-full h-24 rounded-lg bg-gray-800/50 backdrop-blur-sm shadow-inner"
    />
  );
};

export default Visualizer;