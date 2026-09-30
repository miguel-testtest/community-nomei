import { ReactNode } from "react";

type FormRowProps = {
  title: string;
  description?: string;
  htmlFor?: string;
  children: ReactNode;
};

export const FormRow = ({
  title,
  description,
  htmlFor,
  children,
}: FormRowProps) => (
  <div className="grid gap-3 py-6 first:pt-0 2xl:grid-cols-[220px_minmax(0,1fr)] 2xl:items-start">
    <div className="flex flex-col gap-1">
      {htmlFor ? (
        <label
          htmlFor={htmlFor}
          className="text-foreground text-sm font-semibold"
        >
          {title}
        </label>
      ) : (
        <span className="text-foreground text-sm font-semibold">{title}</span>
      )}
      {description && <p className="text-muted-foreground text-xs">{description}</p>}
    </div>
    <div className="flex flex-col gap-2">{children}</div>
  </div>
);
