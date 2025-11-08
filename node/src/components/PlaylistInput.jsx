import { useCallback } from "react";
import PropTypes from "prop-types";

function PlaylistInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  statusMessage,
  errorMessage,
}) {
  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();
      if (!isLoading) {
        onSubmit();
      }
    },
    [onSubmit, isLoading],
  );

  return (
    <section className="rounded-3xl bg-surface/70 p-8 shadow-glow backdrop-blur">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-6 md:flex-row md:items-center"
      >
        <label className="flex flex-1 flex-col gap-2 text-left">
          <span className="text-sm uppercase tracking-caps text-text-muted">
            Spotify Playlist Link
          </span>
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="https://open.spotify.com/playlist/..."
            className="w-full rounded-2xl border border-transparent bg-[#1f1f1f] px-5 py-4 text-base text-text-light transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            type="url"
            required
          />
        </label>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-2xl bg-primary px-5 py-4 font-semibold uppercase tracking-wide text-light transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/40 disabled:cursor-not-allowed disabled:bg-primary/40 md:w-auto"
        >
          {isLoading ? "Analyzing..." : "Analyze Playlist"}
        </button>
      </form>
      <div className="min-h-[3rem] pt-4">
        {statusMessage && !errorMessage && (
          <p className="text-sm tracking-wide text-text-muted">{statusMessage}</p>
        )}
        {errorMessage && (
          <p className="text-sm font-semibold text-primary">{errorMessage}</p>
        )}
      </div>
    </section>
  );
}

PlaylistInput.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  statusMessage: PropTypes.string,
  errorMessage: PropTypes.string,
};

PlaylistInput.defaultProps = {
  isLoading: false,
  statusMessage: "",
  errorMessage: "",
};

export default PlaylistInput;

