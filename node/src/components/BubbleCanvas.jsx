import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";

const PLACEHOLDER_TUPLES = [
  ["moody alt pop", 1.0],
  ["late-night neon", 0.92],
  ["gritty synthwave", 0.85],
  ["slow burn", 0.78],
  ["urban melancholy", 1.05],
  ["dreamlike haze", 0.88],
];

const MIN_WEIGHT = 0.5;
const MAX_WEIGHT = 1.8;
const WEIGHT_STEP = 0.2;
const CENTER_PULL = 0.011;
const DAMPING = 0.94;
const COLLISION_PADDING = 12;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const useContainerSize = (ref) => {
  const [size, setSize] = useState({ width: 640, height: 360 });

  useLayoutEffect(() => {
    if (!ref.current) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const { width, height } = entry.contentRect;
        if (width && height) {
          setSize({ width, height });
        }
      });
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);

  return size;
};

function createNodes(conceptTuples, size) {
  const { width, height } = size;
  const centerX = width / 2;
  const centerY = height / 2;

  return conceptTuples.map(([label, weight], index) => {
    const clampedWeight = clamp(weight, MIN_WEIGHT, MAX_WEIGHT);
    const radius = 60 + clampedWeight * 60;

    return {
      id: `${label.replace(/\s+/g, "-")}-${index}`,
      label,
      weight: clampedWeight,
      radius,
      x: centerX + (Math.cos((index / conceptTuples.length) * Math.PI * 2) * width) / 10,
      y: centerY + (Math.sin((index / conceptTuples.length) * Math.PI * 2) * height) / 10,
      vx: 0,
      vy: 0,
    };
  });
}

function BubbleCanvas({ conceptTuples, onAdjustBubble }) {
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const size = useContainerSize(containerRef);

  const dataTuples = useMemo(
    () => (conceptTuples && conceptTuples.length ? conceptTuples : PLACEHOLDER_TUPLES),
    [conceptTuples],
  );

  const [nodes, setNodes] = useState(() => createNodes(dataTuples, size));

  useEffect(() => {
    setNodes((prev) => {
      const existing = new Map(prev.map((node) => [node.label, node]));
      return createNodes(dataTuples, size).map((node) => {
        const matched = existing.get(node.label);
        return matched
          ? { ...node, x: matched.x, y: matched.y, vx: matched.vx, vy: matched.vy }
          : node;
      });
    });
  }, [dataTuples, size]);

  useEffect(() => {
    const simulate = () => {
      setNodes((prev) => {
    const next = prev.map((node) => ({ ...node }));
    const contributions = Array.from({ length: next.length }, () => ({
      x: 0,
      y: 0,
      count: 0,
    }));
        const centerX = size.width / 2;
        const centerY = size.height / 2;

        // Apply forces toward center
        next.forEach((node) => {
          const dx = centerX - node.x;
          const dy = centerY - node.y;
          node.vx += dx * CENTER_PULL;
          node.vy += dy * CENTER_PULL;
        });

        // Resolve collisions
        for (let i = 0; i < next.length; i += 1) {
          for (let j = i + 1; j < next.length; j += 1) {
            const a = next[i];
            const b = next[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 0.001;
            const minDistance = a.radius + b.radius + COLLISION_PADDING;

            if (distance < minDistance) {
              const overlap = (minDistance - distance) / distance;
              const pushX = dx * overlap;
              const pushY = dy * overlap;

              contributions[i].x -= pushX;
              contributions[i].y -= pushY;
              contributions[i].count += 1;

              contributions[j].x += pushX;
              contributions[j].y += pushY;
              contributions[j].count += 1;
            }
          }
        }

        // Integrate velocity and apply damping
        next.forEach((node, index) => {
          const contribution = contributions[index];
          if (contribution.count > 0) {
            node.vx += contribution.x / contribution.count;
            node.vy += contribution.y / contribution.count;
          }

          node.vx *= DAMPING;
          node.vy *= DAMPING;
          node.x += node.vx;
          node.y += node.vy;

          // Keep nodes within bounds
          const paddingX = size.width * 0.1;
          const paddingY = size.height * 0.12;

          const maxX = size.width - node.radius - paddingX;
          const maxY = size.height - node.radius - paddingY;
          const minX = node.radius + paddingX;
          const minY = node.radius + paddingY;

          if (node.x < minX) {
            node.x = minX;
            node.vx = Math.abs(node.vx) * 0.35;
          } else if (node.x > maxX) {
            node.x = maxX;
            node.vx = -Math.abs(node.vx) * 0.35;
          }

          if (node.y < minY) {
            node.y = minY;
            node.vy = Math.abs(node.vy) * 0.35;
          } else if (node.y > maxY) {
            node.y = maxY;
            node.vy = -Math.abs(node.vy) * 0.35;
          }
        });

        return next;
      });

      animationRef.current = requestAnimationFrame(simulate);
    };

    animationRef.current = requestAnimationFrame(simulate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [size]);

  const handleBubbleClick = (node) => {
    const newWeight =
      node.weight + WEIGHT_STEP > MAX_WEIGHT ? MIN_WEIGHT : node.weight + WEIGHT_STEP;
    onAdjustBubble?.(node.label, parseFloat(newWeight.toFixed(2)));
  };

  return (
    <section className="relative overflow-hidden rounded-3xl bg-surface/70 px-6 py-10 shadow-glow backdrop-blur">
      <header className="mb-6 text-center">
        <p className="text-sm uppercase tracking-caps text-text-muted">Refine the vibe</p>
        <h2 className="text-3xl text-text-light">Tap bubbles to amplify concepts</h2>
      </header>
      <div
        ref={containerRef}
        className="relative mx-auto h-[900px] max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-primary/15 via-transparent to-primary/5"
      >
        {nodes.map((node) => (
          <button
            key={node.id}
            type="button"
            onClick={() => handleBubbleClick(node)}
            className="focus-ring group absolute flex flex-col items-center justify-center rounded-full border-2 border-primary/60 bg-primary/20 text-center text-text-light shadow-lg transition-transform duration-200 hover:-translate-y-3 hover:bg-primary/30 focus:outline-none"
            style={{
              width: node.radius * 2,
              height: node.radius * 2,
              left: node.x - node.radius,
              top: node.y - node.radius,
            }}
          >
            <span className="px-6 text-lg font-medium capitalize tracking-wide">
              {node.label}
            </span>
            <span className="pointer-events-none mt-2 rounded-full bg-[#111111]/80 px-4 py-1 text-xs font-semibold uppercase tracking-caps text-text-muted">
              {Math.round(node.weight * 100)}%
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

BubbleCanvas.propTypes = {
  conceptTuples: PropTypes.arrayOf(
    PropTypes.arrayOf(
      PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    ).isRequired,
  ),
  onAdjustBubble: PropTypes.func,
};

BubbleCanvas.defaultProps = {
  conceptTuples: undefined,
  onAdjustBubble: undefined,
};

export default BubbleCanvas;

