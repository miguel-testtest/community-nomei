import { useState } from "react";
import { twMerge } from "tailwind-merge";
import { LuX, LuHash } from "react-icons/lu";
import { useCreateCommunityChannel } from "@/api/community/mutations/useCreateCommunityChannel";
import { Channel } from "@/api/community/community.types";

interface CreateChannelViewProps {
  communityId: string;
  onChannelCreated: (channel: Channel) => void;
  onClose: () => void;
}

export function CreateChannelView({
  communityId,
  onChannelCreated,
  onClose,
}: CreateChannelViewProps) {
  const [channelName, setChannelName] = useState("");
  const [description, setDescription] = useState("");
  const { mutate: createChannel, isPending } = useCreateCommunityChannel();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim() || isPending) return;

    createChannel(
      {
        communityId,
        payload: {
          name: channelName.trim(),
          description: description.trim() || undefined,
        },
      },
      {
        onSuccess: (channel) => {
          onChannelCreated(channel);
        },
      },
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-background">
      <div className="px-4 py-3 flex-shrink-0 border-b border-border bg-background flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Create Channel</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded-lg transition-colors"
        >
          <LuX className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Channel Name
            </label>
            <div className="relative">
              <LuHash className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70" />
              <input
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="e.g. general"
                maxLength={50}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-foreground"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this channel about?"
              rows={3}
              maxLength={200}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-foreground resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!channelName.trim() || isPending}
              className={twMerge(
                "flex-1 px-4 py-2 bg-accent text-foreground rounded-lg hover:bg-primary-hover transition-colors font-semibold",
                (!channelName.trim() || isPending) &&
                  "opacity-50 cursor-not-allowed",
              )}
            >
              {isPending ? "Creating..." : "Create Channel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

