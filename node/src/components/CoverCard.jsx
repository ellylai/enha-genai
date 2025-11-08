import PropTypes from "prop-types";

function CoverCard({ imageUrl, title, prompt, onDownload }) {
  const handleClick = () => {
    onDownload?.();
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl bg-surface/80 shadow-lg transition hover:-translate-y-1 hover:shadow-glow">
      <button
        type="button"
        className="relative h-72 w-full overflow-hidden focus:outline-none"
        onClick={handleClick}
      >
        <img
          src={imageUrl}
          alt={title}
          className="h-full w-full object-cover transition duration-200 group-hover:brightness-[0.75]"
        />
        <span className="pointer-events-none absolute bottom-4 left-4 rounded-full bg-primary px-4 py-1 text-xs font-semibold uppercase tracking-caps text-light">
          Download
        </span>
      </button>
      <div className="flex flex-1 flex-col gap-3 px-6 py-5 text-left">
        <h3 className="text-xl uppercase tracking-caps text-text-light">{title}</h3>
        {prompt && (
          <p className="text-sm text-text-muted">
            {prompt.length > 140 ? `${prompt.slice(0, 137)}...` : prompt}
          </p>
        )}
      </div>
    </article>
  );
}

CoverCard.propTypes = {
  imageUrl: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  prompt: PropTypes.string,
  onDownload: PropTypes.func,
};

CoverCard.defaultProps = {
  prompt: "",
  onDownload: undefined,
};

export default CoverCard;

