import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { CreateForm } from "@/features/community/components/CreateForm";
import { CommunityDiscoveryCard } from "@/features/community/components/CommunityDiscoveryCard";
import { Header } from "@/features/community/components/Header";
import { CommunityCreateFormValues } from "@/features/community/schema/community-create.schema";
import { SectorStep } from "@/features/community/components/SectorStep";
import { InviteStep } from "@/features/community/components/InviteStep";
import {
  COMMUNITY_SECTORS,
  CommunitySector,
} from "@/features/community/constants/communitySectors";
import { ROUTES } from "@/routes/paths";
import { useResponsive } from "@/hooks/useResponsive";
import { twMerge } from "tailwind-merge";
import { useAuthStore } from "@/stores/useAuthStore";
import { canCreateCommunity } from "@/api/user/privileges";
import { useCreateCommunity } from "@/api/community/mutations/useCreateCommunity";
import { useInviteCommunityMembers } from "@/api/community/mutations/useInviteCommunityMembers";
import { filterValidEmails } from "@/features/community/utils/emailHelpers";
import { toast } from "react-hot-toast";

type CommunityPreviewState = {
  communityName: string;
  description: string;
  logoFile: File | null;
  logoUrl: string | null;
  bannerFile: File | null;
  bannerUrl: string | null;
};

const enum CreateStep {
  Form = "form",
  Sector = "sector",
  Invite = "invite",
}

export function CommunityCreate() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { isLarge } = useResponsive();

  const createCommunityMutation = useCreateCommunity();
  const inviteMembersMutation = useInviteCommunityMembers();
  const isCreatingCommunity = createCommunityMutation.isPending;
  const isInvitingMembers = inviteMembersMutation.isPending;
  const [previewData, setPreviewData] = useState<CommunityPreviewState>({
    communityName: "",
    description: "",
    logoFile: null,
    logoUrl: null,
    bannerFile: null,
    bannerUrl: null,
  });
  const logoPreviewUrlRef = useRef<string | null>(null);
  const bannerPreviewUrlRef = useRef<string | null>(null);

  const [formValues, setFormValues] =
    useState<CommunityCreateFormValues | null>(null);
  const [step, setStep] = useState<CreateStep>(CreateStep.Form);
  const [selectedSectors, setSelectedSectors] = useState<CommunitySector[]>([]);
  const [inviteEmails, setInviteEmails] = useState<string[]>(["", "", ""]);

  const initialValuesForForm = useMemo(() => {
    return step === CreateStep.Form ? formValues : null;
  }, [step, formValues]);

  useEffect(() => {
    if (user && !canCreateCommunity(user.userPrivilege, user.role)) {
      navigate(ROUTES.COMMUNITY);
    }
  }, [user, navigate]);

  if (user && !canCreateCommunity(user.userPrivilege, user.role)) {
    return null;
  }

  const handleCancel = () => {
    navigate(ROUTES.COMMUNITY);
  };

  const handleSubmitForm = (values: CommunityCreateFormValues) => {
    setFormValues(values);
    setStep(CreateStep.Sector);
  };

  const handleFormChange = (values: CommunityCreateFormValues) => {
    setPreviewData((prev) => {
      const logoFile = values.logo?.[0] ?? null;
      const bannerFile = values.banner?.[0] ?? null;

      let logoUrl = prev.logoUrl;
      let bannerUrl = prev.bannerUrl;

      if (logoFile) {
        const isSameLogoFile =
          prev.logoFile === logoFile ||
          (prev.logoFile &&
            prev.logoFile.name === logoFile.name &&
            prev.logoFile.size === logoFile.size &&
            prev.logoFile.lastModified === logoFile.lastModified);

        if (!isSameLogoFile) {
          if (logoPreviewUrlRef.current) {
            URL.revokeObjectURL(logoPreviewUrlRef.current);
          }
          logoUrl = URL.createObjectURL(logoFile);
          logoPreviewUrlRef.current = logoUrl;
        } else {
          logoUrl = prev.logoUrl;
        }
      } else {
        if (logoPreviewUrlRef.current) {
          URL.revokeObjectURL(logoPreviewUrlRef.current);
          logoPreviewUrlRef.current = null;
        }
        logoUrl = null;
      }

      if (bannerFile) {
        const isSameBannerFile =
          prev.bannerFile === bannerFile ||
          (prev.bannerFile &&
            prev.bannerFile.name === bannerFile.name &&
            prev.bannerFile.size === bannerFile.size &&
            prev.bannerFile.lastModified === bannerFile.lastModified);

        if (!isSameBannerFile) {
          if (bannerPreviewUrlRef.current) {
            URL.revokeObjectURL(bannerPreviewUrlRef.current);
          }
          bannerUrl = URL.createObjectURL(bannerFile);
          bannerPreviewUrlRef.current = bannerUrl;
        } else {
          bannerUrl = prev.bannerUrl;
        }
      } else {
        if (bannerPreviewUrlRef.current) {
          URL.revokeObjectURL(bannerPreviewUrlRef.current);
          bannerPreviewUrlRef.current = null;
        }
        bannerUrl = null;
      }

      return {
        communityName: values.communityName,
        description: values.description,
        logoFile,
        logoUrl,
        bannerFile,
        bannerUrl,
      };
    });
  };

  useEffect(() => {
    return () => {
      if (logoPreviewUrlRef.current) {
        URL.revokeObjectURL(logoPreviewUrlRef.current);
      }
      if (bannerPreviewUrlRef.current) {
        URL.revokeObjectURL(bannerPreviewUrlRef.current);
      }
    };
  }, []);

  const header = <Header onBack={() => navigate(ROUTES.COMMUNITY)} />;

  const handleToggleSector = (sector: CommunitySector) => {
    setSelectedSectors((previous) =>
      previous.includes(sector)
        ? previous.filter((value) => value !== sector)
        : [...previous, sector],
    );
  };

  const handleProceedToInviteStep = () => {
    setStep(CreateStep.Invite);
  };

  const finalizeCreation = async (emails: string[]) => {
    if (!formValues) return;

    const normalizedSectors = selectedSectors.filter(
      (sector) => sector.trim().length > 0 && sector.toLowerCase() !== "other",
    );
    if (normalizedSectors.length === 0 || isCreatingCommunity) {
      return;
    }

    const name = formValues.communityName.trim();
    const description = formValues.description.trim();

    try {
      const createdCommunity = await createCommunityMutation.mutateAsync({
        name,
        description: description || null,
        tags: normalizedSectors,
        profilePictureFile: previewData.logoFile,
        bannerFile: previewData.bannerFile,
      });

      toast.success("Community created successfully");
      const validEmails = filterValidEmails(emails);

      if (validEmails.length > 0) {
        try {
          const inviteResult = await inviteMembersMutation.mutateAsync({
            communityId: createdCommunity.id,
            params: {
              emails: validEmails,
            },
          });

          let inviteMessage = `Invitations sent successfully`;
          if (inviteResult.totalFailed > 0) {
            inviteMessage += `. Failed to send invitations to ${inviteResult.totalFailed} emails`;
          }
          toast.success(inviteMessage);
        } catch (inviteError: any) {
          const errorMessage =
            inviteError?.response?.data?.message ||
            inviteError?.message ||
            "Community created, but failed to send some invitations";
          toast.error(errorMessage);
        }
      }

      navigate(ROUTES.COMMUNITY);
    } catch (error) {
      toast.error("Failed to create community, please try again");
    }
  };

  const handleSkipInvites = () => {
    finalizeCreation([]);
  };

  const handleCreateWithInvites = (validInvites: string[]) => {
    finalizeCreation(validInvites);
  };

  const shouldUseTabbedLayout = !isLarge;

  const previewCommunity = {
    id: "",
    name: previewData.communityName.trim() || "Community name",
    description: previewData.description.trim() || "Add a description for your community.",
    profilePicture: previewData.logoUrl,
    profilePictureAssetId: null,
    profilePictureUpdatedAt: null,
    banner: previewData.bannerUrl,
    bannerAssetId: null,
    bannerUpdatedAt: null,
    ownerId: "",
    createdAt: "",
    updatedAt: "",
    tags: [],
    stats: { members: 0, posts: 0 },
  };

  if (shouldUseTabbedLayout) {
    return (
      <div className="bg-background flex h-full flex-col">
        {header}
        <TabGroup className="flex flex-1 flex-col">
          <TabList className="flex w-full justify-center border-b border-border px-4">
            <Tab className="data-[selected]:text-foreground data-[selected]:border-foreground text-muted-foreground px-6 py-2 text-sm focus:outline-none data-[selected]:border-b-2 data-[selected]:font-semibold">
              {step === CreateStep.Form && "Create community"}
              {step === CreateStep.Sector && "Select sector"}
              {step === CreateStep.Invite && "Invite members"}
            </Tab>
            {step === CreateStep.Form && (
              <Tab className="data-[selected]:text-foreground data-[selected]:border-foreground text-muted-foreground px-6 py-2 text-sm focus:outline-none data-[selected]:border-b-2 data-[selected]:font-semibold">
                Preview
              </Tab>
            )}
          </TabList>
          <TabPanels className="flex flex-1 flex-col">
            <TabPanel
              className="flex flex-1 items-center justify-center overflow-y-auto px-14 py-6"
              unmount={false}
            >
              {step === CreateStep.Form && (
                <CreateForm
                  onCancel={handleCancel}
                  onSubmit={handleSubmitForm}
                  onChange={handleFormChange}
                  submitLabel="Continue"
                  initialValues={initialValuesForForm}
                />
              )}
              {step === CreateStep.Sector && (
                <SectorStep
                  title="Optimise the visibility of your community"
                  description="Reach top-notch members by completing your community information."
                  sectors={COMMUNITY_SECTORS}
                  selectedSectors={selectedSectors}
                  onToggle={handleToggleSector}
                  onBack={() => setStep(CreateStep.Form)}
                  onConfirm={handleProceedToInviteStep}
                  confirmLabel="Continue"
                />
              )}
              {step === CreateStep.Invite && (
                <InviteStep
                  initialInvites={inviteEmails}
                  onInvitesChange={setInviteEmails}
                  onSkip={handleSkipInvites}
                  onCreate={handleCreateWithInvites}
                  isCreating={isCreatingCommunity || isInvitingMembers}
                />
              )}
            </TabPanel>
            {step === CreateStep.Form && (
              <TabPanel
                className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-6"
                unmount={false}
              >
                <CommunityDiscoveryCard
                    community={previewCommunity}
                    onCardClick={null}
                    className="max-w-sm"
                  />
              </TabPanel>
            )}
          </TabPanels>
        </TabGroup>
      </div>
    );
  }

  return (
    <div className="bg-background flex h-full flex-col">
      {header}
      <div className="flex flex-1 flex-row items-center justify-center gap-10 overflow-hidden">
        <div
          className={twMerge(
            "flex w-full flex-row items-center justify-center p-5 pb-8 sm:px-6 md:px-8 lg:px-12",
            step === CreateStep.Form
              ? "w-full max-w-[55rem] lg:w-1/2 lg:border-r lg:border-border"
              : "max-w-[60rem] lg:w-full",
          )}
        >
          {step === CreateStep.Form && (
            <CreateForm
              onCancel={handleCancel}
              onSubmit={handleSubmitForm}
              onChange={handleFormChange}
              submitLabel="Continue"
              initialValues={initialValuesForForm}
            />
          )}
          {step === CreateStep.Sector && (
            <SectorStep
              sectors={COMMUNITY_SECTORS}
              selectedSectors={selectedSectors}
              onToggle={handleToggleSector}
              onBack={() => setStep(CreateStep.Form)}
              onConfirm={handleProceedToInviteStep}
              confirmLabel="Continue"
            />
          )}
          {step === CreateStep.Invite && (
            <InviteStep
              initialInvites={inviteEmails}
              onInvitesChange={setInviteEmails}
              onSkip={handleSkipInvites}
              onCreate={handleCreateWithInvites}
              isCreating={isCreatingCommunity}
            />
          )}
        </div>
        {step === CreateStep.Form && (
          <div className="flex w-full max-w-[55rem] min-w-0 justify-center px-4 pb-12 lg:w-1/2 lg:px-12">
            <CommunityDiscoveryCard
              community={previewCommunity}
              onCardClick={null}
              className="max-w-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}
