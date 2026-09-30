import { CommentReaction } from "@/api/community/community.types";
import { useCreateCommentReaction } from "@/api/community/mutations/useCreateCommentReaction";
import { ReactionsBar } from "./ReactionsBar";

interface CommentReactionsProps {
  reactions: CommentReaction[];
  communityId: string;
  postId: string;
  commentId: string;
  className?: string;
  isMember?: boolean;
  showAddButton?: boolean;
  showContainer?: boolean;
  onReactionsChange: (reactions: CommentReaction[]) => void;
}

export function CommentReactions({
  reactions,
  communityId,
  postId,
  commentId,
  className,
  isMember = true,
  showAddButton = false,
  showContainer = true,
  onReactionsChange,
}: CommentReactionsProps) {
  const { mutate: createReaction, isPending } = useCreateCommentReaction();

  const handleReactionClick = (emoji: string) => {
    createReaction(
      {
        communityId,
        postId,
        commentId,
        emoji,
      },
      {
        onSuccess: (reaction) => {
          const alreadyReacted = reactions.some(
            (existingReaction) =>
              existingReaction.userId === reaction.userId &&
              existingReaction.emoji === reaction.emoji,
          );

          if (alreadyReacted) {
            onReactionsChange(
              reactions.filter(
                (existingReaction) =>
                  !(
                    existingReaction.userId === reaction.userId &&
                    existingReaction.emoji === reaction.emoji
                  ),
              ),
            );
            return;
          }

          onReactionsChange([...reactions, reaction]);
        },
      },
    );
  };

  return (
    <ReactionsBar
      reactions={reactions}
      onReactionClick={handleReactionClick}
      isPending={isPending}
      isMember={isMember}
      className={className}
      tone="comment"
      showAddButton={showAddButton}
      showContainer={showContainer}
    />
  );
}
