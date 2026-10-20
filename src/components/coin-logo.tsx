import { useEffect, useState } from "react";
import { cn } from "@/components/ui/button";

const SIZES = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-16 text-base",
} as const;

export function CoinLogo({
  base,
  size = "md",
  priority = false,
}: {
  base: string;
  size?: keyof typeof SIZES;
  priority?: boolean;
}) {
  const [step, setStep] = useState(0);
  useEffect(() => setStep(0), [base]);

  const sources = [
    `https://assets.coincap.io/assets/icons/${encodeURIComponent(base.toLowerCase())}@2x.png`,
  ];
  const src = step < sources.length ? sources[step] : null;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-2 font-medium text-brass",
        SIZES[size],
      )}
    >
      {src ? (
        <img
          src={src}
          alt=""
          width={64}
          height={64}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          className="size-full object-cover"
          onError={() => setStep((value) => value + 1)}
        />
      ) : (
        base.slice(0, 3)
      )}
    </span>
  );
}
