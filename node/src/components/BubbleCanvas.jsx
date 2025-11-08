import PropTypes from "prop-types";

const MIN_WEIGHT = 0.6;
const MAX_WEIGHT = 1.6;
const WEIGHT_STEP = 0.2;

function BubbleCanvas({ bubbles, onAdjustBubble }) {
  const handleBubbleClick = (bubble) => {
    const newWeight =
      bubble.weight + WEIGHT_STEP > MAX_WEIGHT ? MIN_WEIGHT : bubble.weight + WEIGHT_STEP;
    onAdjustBubble(bubble.id, parseFloat(newWeight.toFixed(2)));
  };

  return (
    <section className="relative overflow-hidden rounded-3xl bg-surface/70 px-6 py-10 shadow-glow backdrop-blur">
      <header className="mb-6 text-center">
        <p className="text-sm uppercase tracking-caps text-text-muted">
          Refine the vibe
        </p>
        <h2 className="text-3xl text-text-light">Tap bubbles to amplify concepts</h2>
      </header>
      <div className="relative mx-auto flex min-h-[340px] max-w-4xl flex-wrap items-center justify-center gap-6">
        {bubbles.map((bubble) => {
          const size = 150 * bubble.weight;
          return (
            <button
              key={bubble.id}
              type="button"
              onClick={() => handleBubbleClick(bubble)}
              className={`bubble focus-ring group relative flex items-center justify-center rounded-full border-2 border-primary/60 bg-primary/20 text-center text-text-light transition-all duration-200 hover:-translate-y-1 hover:bg-primary/30 focus:outline-none ${
                bubble.weight >= MAX_WEIGHT - WEIGHT_STEP ? "shadow-glow" : ""
              }`}
              style={{
                width: size,
                height: size,
              }}
            >
              <span className="px-6 text-lg font-medium capitalize tracking-wide">
                {bubble.label}
              </span>
              <span className="pointer-events-none absolute -bottom-3 rounded-full bg-[#111111] px-4 py-1 text-xs font-semibold uppercase tracking-caps text-text-muted">
                {Math.round(bubble.weight * 100)}%
              </span>
            </button>
          );
        })}
        {bubbles.length === 0 && (
          <p className="text-center text-text-muted">
            Submit a playlist to surface mood concepts.
          </p>
        )}
      </div>
    </section>
  );
}

BubbleCanvas.propTypes = {
  bubbles: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      weight: PropTypes.number.isRequired,
    }),
  ).isRequired,
  onAdjustBubble: PropTypes.func.isRequired,
};

export default BubbleCanvas;

