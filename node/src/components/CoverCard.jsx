import PropTypes from "prop-types";

function CoverCard({ imageUrl, title, onDownload }) {
  const handleClick = () => {
    onDownload?.();
  };

  return (
    <button
      type="button"
      // Added aspect-square and removed all text/padding
      className="group relative w-full aspect-square overflow-hidden rounded-3xl bg-surface/80 shadow-lg transition hover:-translate-y-1 hover:shadow-glow focus:outline-none"
      onClick={handleClick}
    >
      <img
        src={imageUrl}
        alt={title} // Alt text is kept for accessibility
        className="h-full w-full object-cover transition duration-200 group-hover:brightness-[0.75]"
      />
      {/* All text elements have been removed */}
    </button>
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