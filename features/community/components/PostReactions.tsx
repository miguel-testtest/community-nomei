import { PostReaction } from "@/api/community/community.types";
import { useCreatePostReaction } from "@/api/community/mutations/useCreatePostReaction";
import { ReactionsBar } from "./ReactionsBar";

interface PostReactionsProps {
  reactions: PostReaction[];
  communityId: string;
  postId: string;
  className?: string;
  isMember?: boolean;
  currentUserId?: string | undefined;
}

export function PostReactions({
  reactions = [],
  communityId,
  postId,
  className,
  isMember = true,
  currentUserId,
}: PostReactionsProps) {
  const { mutate: createReaction, isPending } = useCreatePostReaction();

  const handleReactionClick = (emoji: string) => {
    createReaction({
      communityId,
      postId,
      emoji,
    });
  };

  return (
    <ReactionsBar
      reactions={reactions}
      onReactionClick={handleReactionClick}
      isPending={isPending}
      isMember={isMember}
      className={className}
      currentUserId={currentUserId}
    />
  );
}
