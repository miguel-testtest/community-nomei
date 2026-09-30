import { twMerge } from "tailwind-merge";
import { getUserInitials } from "../../features/community/utils/userHelpers";

type AvatarProps = {
    firstName?: string | undefined;
    lastName?: string | undefined;
    profilePicture?: string | null | undefined;
    userId?: string | undefined;
    size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
    className?: string;
    alt?: string;
};

const AVATAR_COLORS = [
    { bg: "var(--color-red)", text: "text-white" },
    { bg: "var(--color-orange)", text: "text-white" },
    { bg: "var(--color-yellow)", text: "text-white" },
    { bg: "#9ABE3C", text: "text-white" },
    { bg: "#64BE3C", text: "text-white" },
    { bg: "#3CBE3C", text: "text-white" },
    { bg: "#3CBE70", text: "text-white" },
    { bg: "#3CBEA4", text: "text-white" },
    { bg: "#3CBEBE", text: "text-white" },
    { bg: "#3CA4BE", text: "text-white" },
    { bg: "var(--color-blue)", text: "text-white" },
    { bg: "var(--color-indigo)", text: "text-white" },
    { bg: "var(--color-primary)", text: "text-white" },
    { bg: "var(--color-violet)", text: "text-white" },
    { bg: "var(--color-purple)", text: "text-white" },
    { bg: "var(--color-muted-foreground)", text: "text-white" },
];

const SIZE_CLASSES = {
    xs: "h-6 w-6 text-xs",
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
    xl: "h-16 w-16 text-lg",
    "2xl": "h-24 w-24 text-xl sm:h-28 sm:w-28 sm:text-2xl",
};

function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

function getAvatarColor(identifier: string) {
    const hash = hashString(identifier);
    const colorIndex = hash % AVATAR_COLORS.length;
    return AVATAR_COLORS[colorIndex];
}

export function Avatar({
    firstName,
    lastName,
    profilePicture,
    userId,
    size = "md",
    className,
    alt,
}: AvatarProps) {
    if (profilePicture) {
        const sizeClass = SIZE_CLASSES[size];
        return (
            <img
                src={profilePicture}
                alt={alt || `${firstName || ""} ${lastName || ""}`.trim() || "User"}
                className={twMerge(
                    "flex-shrink-0 rounded-full object-cover",
                    sizeClass,
                    className,
                )}
            />
        );
    }

    const initials = firstName?.charAt(0).toUpperCase() ?? getUserInitials(firstName, lastName);
    const identifier =
        userId ||
        `${firstName || ""}${lastName || ""}`.trim() ||
        initials ||
        "default";

    const color = getAvatarColor(identifier);
    const sizeClass = SIZE_CLASSES[size];

    return (
        <div
            className={twMerge(
                "flex flex-shrink-0 items-center justify-center rounded-full font-semibold",
                color.text,
                sizeClass,
                className,
            )}
            style={{ background: color.bg }}
            aria-label={alt || `${firstName || ""} ${lastName || ""}`.trim() || "User avatar"}
        >
            {initials}
        </div>
    );
}
