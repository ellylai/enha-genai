import PropTypes from "prop-types";
import CoverCard from "./CoverCard";

function CoverGallery({ covers, onDownloadCover }) {
  if (!covers.length) {
    return (
      <section className="rounded-3xl bg-surface/60 px-6 py-12 text-center text-text-muted">
        <p className="text-sm uppercase tracking-caps text-text-muted">
          Cover Candidates
        </p>
        <h2 className="mt-3 text-3xl text-text-light">Generate the playlist cover to see options</h2>
        <p className="mt-4 max-w-xl mx-auto text-sm text-text-muted">
          You&apos;ll receive three variations once the analysis is complete. Adjust the mood
          bubbles above to influence the final prompt.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl bg-surface/60 px-6 py-10">
      <header className="mb-8 text-left">
        <p className="text-sm uppercase tracking-caps text-text-muted">Cover Candidates</p>
        <h2 className="text-3xl text-text-light">Choose your favorite</h2>
      </header>
      <div className="grid gap-6 md:grid-cols-3">
        {covers.map((cover, index) => (
          <CoverCard
            key={cover.id}
            imageUrl={cover.imageUrl}
            title={`Version 0${index + 1}`}
            prompt={cover.prompt}
            onDownload={() => onDownloadCover?.(cover)}
          />
        ))}
      </div>
    </section>
  );
}

CoverGallery.propTypes = {
  covers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      imageUrl: PropTypes.string.isRequired,
      prompt: PropTypes.string,
    }),
  ),
  onDownloadCover: PropTypes.func,
};

CoverGallery.defaultProps = {
  covers: [],
  onDownloadCover: undefined,
};

export default CoverGallery;

