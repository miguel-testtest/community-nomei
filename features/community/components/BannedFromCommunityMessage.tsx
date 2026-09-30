import { Button } from "@/components/common/Button";
import { Modal } from "@/components/UI/Modal";
import { LuBan } from "react-icons/lu";
import { ROUTES } from "@/routes/paths";
import { useNavigate } from "react-router";

export function BannedFromCommunityMessage() {
  const navigate = useNavigate();

  const handleRedirectToDiscovery = () => {
    navigate(ROUTES.COMMUNITY);
  };

  return (
    <Modal open={true} setClose={() => {}} backdrop={true}>
      <div className="mx-auto max-w-md rounded-2xl bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <LuBan className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <h2 className="text-foreground mb-4 text-center text-xl font-semibold">
          You are banned from this community
        </h2>
        <p className="text-muted-foreground mb-6 text-center text-sm">
          You cannot access this community's content. You will be redirected to
          the community discovery page.
        </p>
        <Button
          type="button"
          variant="primary"
          onClick={handleRedirectToDiscovery}
          className="w-full"
        >
          Go back
        </Button>
      </div>
    </Modal>
  );
}
