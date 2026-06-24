import { useEffect, useState, type CSSProperties, type ImgHTMLAttributes } from "react";

type HeroImageProps = {
  src: string;
  className?: string;
  style?: CSSProperties;
} & Pick<ImgHTMLAttributes<HTMLImageElement>, "loading" | "decoding">;

export function HeroImage({ src, className = "", style, loading, decoding }: HeroImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState(src);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setResolvedSrc(src);
    setFailed(false);
  }, [src]);

  return (
    <img
      src={resolvedSrc}
      alt=""
      draggable={false}
      className={className}
      style={style}
      loading={loading}
      decoding={decoding}
      onError={() => {
        if (!failed && resolvedSrc.endsWith(".png")) {
          setFailed(true);
          setResolvedSrc(resolvedSrc.replace(/\.png$/i, ".svg"));
        }
      }}
    />
  );
}
