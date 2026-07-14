function getYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

interface Props {
  mediaUrl?: string;
  audioUrl?: string;
}

/** Optional image/YouTube-embed/audio block shown above a stage's
 * description. Shared by INFO and QUIZ, both of which can carry media. */
export function StageMedia({ mediaUrl, audioUrl }: Props) {
  if (!mediaUrl) return null;
  const ytId = getYouTubeId(mediaUrl);

  return (
    <div className="w-full mb-6 flex flex-col gap-4">
      {ytId ? (
        <div className="aspect-video rounded-xl overflow-hidden shadow-sm">
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube-nocookie.com/embed/${ytId}?rel=0`}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      ) : (
        <img src={mediaUrl} alt="Мултимедија" className="w-full h-auto rounded-xl shadow-sm object-cover max-h-48" />
      )}

      {audioUrl && (
        <audio controls className="w-full rounded-xl">
          <source src={audioUrl} type="audio/mpeg" />
          Вашиот прелистувач не поддржува аудио.
        </audio>
      )}
    </div>
  );
}
