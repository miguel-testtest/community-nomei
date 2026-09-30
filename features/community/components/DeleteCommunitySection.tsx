import { useState } from "react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/UI/Modal";
import { Input } from "@/components/UI/Input";
import { ErrorText } from "@/components/common/ErrorText";
import { LuTrash2 } from "react-icons/lu";
import { HiExclamationTriangle } from "react-icons/hi2";
import { useDeleteCommunity } from "@/api/community/mutations/useDeleteCommunity";
import { useCommunityAccess } from "@/api/community/queries/useCommunityAccess";
import { CommunityMemberRole } from "@/api/community/enums/community-member-role.enum";

interface DeleteCommunitySectionProps {
  communityId: string;
  communityName: string;
  canDeleteCommunity?: boolean | undefined;
}

export function DeleteCommunitySection({
  communityId,
  communityName,
  canDeleteCommunity,
}: DeleteCommunitySectionProps) {
  const { data: access } = useCommunityAccess(communityId);
  const { mutate: deleteCommunity, isPending: isDeleting } =
    useDeleteCommunity();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFinalConfirmModal, setShowFinalConfirmModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [showValidationError, setShowValidationError] = useState(false);

  const isOwner = access?.role === CommunityMemberRole.OWNER;
  const canDelete =
    canDeleteCommunity !== undefined ? canDeleteCommunity : isOwner;
  const isDeleteConfirmationValid = deleteConfirmationText === communityName;

  if (!canDelete) {
    return null;
  }

  const handleRequestDelete = () => {
    setShowDeleteModal(true);
    setDeleteConfirmationText("");
    setShowValidationError(false);
  };

  const handleCloseDeleteModal = () => {
    if (isDeleting) return;
    setShowDeleteModal(false);
    setDeleteConfirmationText("");
    setShowValidationError(false);
  };

  const handleConfirmDelete = () => {
    if (isDeleteConfirmationValid) {
      setShowDeleteModal(false);
      setShowFinalConfirmModal(true);
      setShowValidationError(false);
    } else {
      setShowValidationError(true);
    }
  };

  const handleConfirmationTextChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setDeleteConfirmationText(e.target.value);
    if (showValidationError) {
      setShowValidationError(false);
    }
  };

  const handleFinalConfirmDelete = () => {
    deleteCommunity(
      { communityId },
      {
        onSuccess: () => {
          toast.success("Community deleted successfully");
        },
        onError: () => {
          toast.error("Failed to delete community. Please try again.");
          setShowFinalConfirmModal(false);
        },
      },
    );
  };

  const handleCloseFinalConfirmModal = () => {
    if (isDeleting) return;
    setShowFinalConfirmModal(false);
  };

  return (
    <>
      <section className="border-t border-border pt-6">
        <div className="grid gap-3 py-6 first:pt-0 2xl:grid-cols-[220px_minmax(0,1fr)] 2xl:items-start">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-destructive">
              Delete community
            </span>
            <p className="text-sm text-destructive/70">
              Permanently delete this community and all its data.
            </p>
          </div>
          <div className="flex items-center">
            <Button
              type="button"
              variant="delete"
              onClick={handleRequestDelete}
              disabled={isDeleting}
              className="flex items-center gap-2"
            >
              <LuTrash2 className="h-4 w-4 flex-shrink-0" />
              <span>Delete Community</span>
            </Button>
          </div>
        </div>
      </section>

      {showDeleteModal && (
        <Modal open={showDeleteModal} setClose={handleCloseDeleteModal}>
          <div className="min-w-0 rounded-2xl bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <HiExclamationTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <h2 className="text-foreground mb-4 px-10 text-center text-xl font-semibold">
              Verify deletion of "{communityName}"
            </h2>
            <p className="text-muted-foreground mb-4 text-center text-sm">
              Do you want to permanently delete this <br /> community and all of
              its data?
            </p>
            <p className="text-foreground mb-4 text-center text-sm font-medium">
              Enter the community name to confirm
            </p>
            <div className="mb-6 w-full">
              <Input
                type="text"
                placeholder={communityName}
                value={deleteConfirmationText}
                onChange={handleConfirmationTextChange}
                fullWidth
                error={showValidationError}
                className="mb-2"
              />
              {showValidationError && (
                <ErrorText className="mt-1 max-w-[20rem] text-xs break-words">
                  The community name does not match. Please enter the exact name
                  to confirm deletion.
                </ErrorText>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCloseDeleteModal}
                className="flex-1"
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleConfirmDelete}
                className="flex-1 bg-red-300 hover:bg-red-500"
                disabled={isDeleting}
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showFinalConfirmModal && (
        <Modal
          open={showFinalConfirmModal}
          setClose={handleCloseFinalConfirmModal}
        >
          <div className="mx-auto max-w-md rounded-2xl bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <HiExclamationTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <h2 className="text-foreground mb-4 text-center text-xl font-semibold">
              Are you sure?
            </h2>
            <p className="text-muted-foreground mb-6 text-center text-sm">
              This action is not reversible. All data will be permanently
              deleted.
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCloseFinalConfirmModal}
                className="flex-1"
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleFinalConfirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
