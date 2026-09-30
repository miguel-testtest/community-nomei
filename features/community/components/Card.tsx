import { ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import { getUserInitials } from "../utils/userHelpers";

export type CardStat = {
  icon: ReactNode;
  label: string;
  id?: string;
};

export type CardProps = {
  name: string;
  description: string;
  ownerName?: string | undefined;
  logoUrl?: string | null | undefined;
  fallbackInitials?: string;
  stats?: CardStat[];
  actionsSlot?: ReactNode;
  className?: string;
};

export const Card = ({
  name,
  description,
  ownerName,
  logoUrl,
  fallbackInitials = "C",
  stats,
  actionsSlot,
  className,
}: CardProps) => {
  const displayName = name.trim() || "Community name";
  const displayDescription =
    description.trim() ||
    "Keep this section updated so members quickly understand why they should join.";

  const initials = getUserInitials(
    undefined,
    undefined,
    name.trim() || ownerName?.trim() || fallbackInitials,
  );

  const hostLabel = ownerName ? `Hosted by ${ownerName}` : "Hosted by you";

  return (
    <div
      className={twMerge(
        "flex h-full w-full max-w-[40rem] min-w-0 items-center justify-center",
        className,
      )}
    >
      <div className="w-full max-w-full min-w-0 rounded-3xl border border-border bg-card/80 p-6 shadow-lg backdrop-blur-sm">
        <header className="flex min-w-0 items-start gap-4">
          <CardLogo logoUrl={logoUrl} initials={initials} />

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="text-h3 text-foreground truncate" title={displayName}>
              {displayName}
            </h2>
            <p className="text-muted-foreground text-c2 truncate">{hostLabel}</p>
          </div>
        </header>

        <section className="mt-4 min-w-0 space-y-3">
          <p
            className="text-foreground text-c1 line-clamp-3 overflow-hidden leading-relaxed break-words"
            title={displayDescription}
          >
            {displayDescription}
          </p>
          {stats && stats.length > 0 && (
            <div className="text-muted-foreground text-c2 flex flex-wrap items-center gap-3">
              {stats.map((stat, index) => (
                <span
                  key={stat.id ?? `${stat.label}-${index}`}
                  className="text-muted-foreground flex items-center gap-3 rounded-md px-3 py-1 shadow-sm"
                >
                  {stat.icon}
                  {stat.label}
                </span>
              ))}
            </div>
          )}
        </section>

        {actionsSlot && (
          <footer className="mt-6 flex flex-wrap justify-center gap-4">
            {actionsSlot}
          </footer>
        )}
      </div>
    </div>
  );
};

type CardLogoProps = {
  logoUrl?: string | null | undefined;
  initials: string;
};

const CardLogo = ({ logoUrl, initials }: CardLogoProps) => {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`${initials} avatar`}
        className="h-16 w-16 flex-none rounded-2xl object-cover"
      />
    );
  }

  return (
    <div className="from-accent via-primary-hover/70 text-h2 flex h-16 w-16 flex-none items-center justify-center rounded-2xl bg-gradient-to-br to-primary text-white">
      {initials}
    </div>
  );
};
