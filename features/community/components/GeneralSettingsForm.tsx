import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/common/Button";
import { ErrorText } from "@/components/common/ErrorText";
import { Input } from "@/components/UI/Input";
import { Textarea } from "@/components/UI/TextArea";
import { COMMUNITY_SECTORS } from "@/features/community/constants/communitySectors";
import { CommunityWithDetails } from "@/api/community/community.types";
import { communityGeneralSchema } from "@/features/community/schema/community-general.schema";
import { MAX_COMMUNITY_DESCRIPTION_LENGTH } from "@/features/community/schema/community-create.schema";
import { useUpdateCommunity } from "@/api/community/mutations/useUpdateCommunity";
import { useCommunityTags } from "@/api/community/queries/useCommunityTags";
import { useUploadCommunityProfilePicture } from "@/api/community/mutations/useUploadCommunityProfilePicture";
import { useRemoveCommunityProfilePicture } from "@/api/community/mutations/useRemoveCommunityProfilePicture";
import { useUploadCommunityBanner } from "@/api/community/mutations/useUploadCommunityBanner";
import { useRemoveCommunityBanner } from "@/api/community/mutations/useRemoveCommunityBanner";
import { QUERY_KEYS } from "@/api/queryKeys";
import { FormRow } from "./FormRow";
import { SectorManager } from "./SectorManager";
import { CommunityHeaderPreview } from "./CommunityHeaderPreview";
import { DeleteCommunitySection } from "./DeleteCommunitySection";

type GeneralFormValues = z.infer<typeof communityGeneralSchema>;

type GeneralFormProps = {
  community: CommunityWithDetails;
  onLogoPreviewChange?: (url: string | null) => void;
  canDeleteCommunity?: boolean;
  isCommunityNameDisabled?: boolean;
};

const getDefaultValues = (
  community: CommunityWithDetails,
): GeneralFormValues => ({
  name: community.name,
  description: community.description ?? "",
  sectors: community.tags.map((tag) => tag.name),
  logoUrl: community.profilePicture,
  bannerUrl: community.banner,
  logoFile: null,
  bannerFile: null,
});

export function GeneralSettingsForm({
  community,
  onLogoPreviewChange,
  canDeleteCommunity,
  isCommunityNameDisabled = false,
}: GeneralFormProps) {
  const queryClient = useQueryClient();
  const { data: communityTags } = useCommunityTags();
  const backendTags = communityTags?.map((tag) => tag.name) ?? [];

  const availableTags = useMemo(() => {
    const combined = [...COMMUNITY_SECTORS, ...backendTags];
    const unique = Array.from(
      new Set(combined.map((tag) => tag.toLowerCase())),
    ).map((lowercaseTag) => {
      const sectorMatch = COMMUNITY_SECTORS.find(
        (sector) => sector.toLowerCase() === lowercaseTag,
      );
      if (sectorMatch) return sectorMatch;
      return (
        backendTags.find((tag) => tag.toLowerCase() === lowercaseTag) ||
        lowercaseTag
      );
    });
    return unique;
  }, [backendTags]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<GeneralFormValues>({
    resolver: zodResolver(communityGeneralSchema),
    defaultValues: getDefaultValues(community),
  });

  const updateCommunityMutation = useUpdateCommunity();
  const uploadProfilePictureMutation = useUploadCommunityProfilePicture();
  const removeProfilePictureMutation = useRemoveCommunityProfilePicture();
  const uploadBannerMutation = useUploadCommunityBanner();
  const removeBannerMutation = useRemoveCommunityBanner();

  const selectedSectors = watch("sectors");
  const descriptionValue = watch("description") ?? "";
  const nameValue = watch("name") ?? "";


  const logoObjectUrlRef = useRef<string | null>(null);
  const bannerObjectUrlRef = useRef<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [bannerRemoved, setBannerRemoved] = useState(false);

  const [logoPreview, setLogoPreview] = useState<string | null>(
    community.profilePicture,
  );
  const [bannerPreview, setBannerPreview] = useState<string | null>(
    community.banner,
  );

  useEffect(() => {
    reset(getDefaultValues(community));
    const initialLogo = community.profilePicture;
    const initialBanner = community.banner;
    setLogoPreview(initialLogo);
    setBannerPreview(initialBanner);
    setLogoFile(null);
    setBannerFile(null);
    setLogoRemoved(false);
    setBannerRemoved(false);
    if (logoObjectUrlRef.current) {
      URL.revokeObjectURL(logoObjectUrlRef.current);
      logoObjectUrlRef.current = null;
    }
    if (bannerObjectUrlRef.current) {
      URL.revokeObjectURL(bannerObjectUrlRef.current);
      bannerObjectUrlRef.current = null;
    }

    if (onLogoPreviewChange) {
      onLogoPreviewChange(initialLogo);
    }
  }, [
    community.id,
    community.profilePicture,
    community.banner,
    reset,
    onLogoPreviewChange,
  ]);

  useEffect(() => {
    return () => {
      if (logoObjectUrlRef.current) {
        URL.revokeObjectURL(logoObjectUrlRef.current);
      }
      if (bannerObjectUrlRef.current) {
        URL.revokeObjectURL(bannerObjectUrlRef.current);
      }
    };
  }, []);

  const availableStandardSectors = useMemo(() => {
    const normalized = selectedSectors ?? [];
    return availableTags.filter(
      (tag) =>
        !normalized.some(
          (selected) => selected.toLowerCase() === tag.toLowerCase(),
        ),
    );
  }, [selectedSectors, availableTags]);

  const sanitizedSelectedSectors = useMemo(() => {
    return (selectedSectors ?? []).sort();
  }, [selectedSectors]);

  const handleAddSector = (sector: string) => {
    const trimmed = sector.trim();
    if (!trimmed) return;
    const updated = Array.from(new Set([...(selectedSectors ?? []), trimmed]));
    setValue("sectors", updated, { shouldDirty: true });
  };

  const handleRemoveSector = (target: string) => {
    const updated = (selectedSectors ?? []).filter(
      (sector) => sector !== target,
    );
    setValue("sectors", updated, { shouldDirty: true });
  };

  const handleLogoChange = (file: File | null) => {
    if (logoObjectUrlRef.current) {
      URL.revokeObjectURL(logoObjectUrlRef.current);
      logoObjectUrlRef.current = null;
    }

    if (file) {
      const previewUrl = URL.createObjectURL(file);
      logoObjectUrlRef.current = previewUrl;
      setLogoPreview(previewUrl);
      setLogoFile(file);
      setLogoRemoved(false);
      if (onLogoPreviewChange) {
        onLogoPreviewChange(previewUrl);
      }
    } else {
      setLogoFile(null);
      setLogoPreview(null);
      setLogoRemoved(true);
      if (onLogoPreviewChange) {
        onLogoPreviewChange(null);
      }
    }
  };

  const handleBannerChange = (file: File | null) => {
    if (bannerObjectUrlRef.current) {
      URL.revokeObjectURL(bannerObjectUrlRef.current);
      bannerObjectUrlRef.current = null;
    }

    if (file) {
      const previewUrl = URL.createObjectURL(file);
      bannerObjectUrlRef.current = previewUrl;
      setBannerPreview(previewUrl);
      setBannerFile(file);
      setBannerRemoved(false);
    } else {
      setBannerFile(null);
      setBannerPreview(null);
      setBannerRemoved(true);
    }
  };

  const onSubmit = async (values: GeneralFormValues) => {
    const normalizedTags = values.sectors
      .map((sector) => sector.trim())
      .filter((sector) => sector.length > 0);
    const uniqueTags = Array.from(new Set(normalizedTags));

    try {
      await updateCommunityMutation.mutateAsync({
        communityId: community.id,
        payload: {
          name: values.name.trim(),
          description: values.description.trim(),
          tags: uniqueTags,
        },
      });

      setValue("sectors", uniqueTags, { shouldDirty: false });

      if (logoRemoved && community.profilePicture) {
        await removeProfilePictureMutation.mutateAsync({
          communityId: community.id,
        });
        if (logoObjectUrlRef.current) {
          URL.revokeObjectURL(logoObjectUrlRef.current);
          logoObjectUrlRef.current = null;
        }
        setLogoFile(null);
        setLogoRemoved(false);
        setLogoPreview(null);
        if (onLogoPreviewChange) {
          onLogoPreviewChange(null);
        }
      } else if (logoFile) {
        const logoResponse = await uploadProfilePictureMutation.mutateAsync({
          communityId: community.id,
          file: logoFile,
        });

        if (logoObjectUrlRef.current) {
          URL.revokeObjectURL(logoObjectUrlRef.current);
          logoObjectUrlRef.current = null;
        }
        setLogoFile(null);
        setLogoRemoved(false);
        if (logoResponse?.profilePicture) {
          setLogoPreview(logoResponse.profilePicture);
          if (onLogoPreviewChange) {
            onLogoPreviewChange(logoResponse.profilePicture);
          }
        }
      }

      if (bannerRemoved && community.banner) {
        await removeBannerMutation.mutateAsync({
          communityId: community.id,
        });

        if (bannerObjectUrlRef.current) {
          URL.revokeObjectURL(bannerObjectUrlRef.current);
          bannerObjectUrlRef.current = null;
        }

        setBannerFile(null);
        setBannerRemoved(false);
        setBannerPreview(null);
      } else if (bannerFile) {
        const bannerResponse = await uploadBannerMutation.mutateAsync({
          communityId: community.id,
          file: bannerFile,
        });
        if (bannerObjectUrlRef.current) {
          URL.revokeObjectURL(bannerObjectUrlRef.current);
          bannerObjectUrlRef.current = null;
        }

        setBannerFile(null);
        setBannerRemoved(false);

        if (bannerResponse?.banner) {
          setBannerPreview(bannerResponse.banner);
        }
      }

      await queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.COMMUNITY.DETAIL, community.id],
        refetchType: "active",
      });

      toast.success("Community updated successfully");
    } catch {
      toast.error("Failed to update community, please try again");
    }
  };

  const handleReset = () => {
    reset(getDefaultValues(community));
    const initialLogo = community.profilePicture;
    const initialBanner = community.banner;
    setLogoPreview(initialLogo);
    setBannerPreview(initialBanner);
    setLogoFile(null);
    setBannerFile(null);
    setLogoRemoved(false);
    setBannerRemoved(false);
    if (logoObjectUrlRef.current) {
      URL.revokeObjectURL(logoObjectUrlRef.current);
      logoObjectUrlRef.current = null;
    }
    if (bannerObjectUrlRef.current) {
      URL.revokeObjectURL(bannerObjectUrlRef.current);
      bannerObjectUrlRef.current = null;
    }
    if (onLogoPreviewChange) {
      onLogoPreviewChange(initialLogo);
    }
  };

  const isBusy =
    isSubmitting ||
    updateCommunityMutation.isPending ||
    uploadProfilePictureMutation.isPending ||
    removeProfilePictureMutation.isPending ||
    uploadBannerMutation.isPending ||
    removeBannerMutation.isPending;

  const hasImageChanges =
    logoRemoved || bannerRemoved || Boolean(logoFile) || Boolean(bannerFile);
  const hasFormChanges = isDirty || hasImageChanges;

  const canSubmit = hasFormChanges && !isBusy;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-5xl flex-col gap-8 self-start pb-6 pr-6"
      noValidate
    >
      <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-border bg-background pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-foreground text-2xl font-semibold">Settings</h2>
          <p className="text-muted-foreground text-sm">
            Configure how your community is displayed.
          </p>
        </div>
        {hasFormChanges && (
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleReset}
              disabled={isBusy}
              className="shadow-sm"
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!canSubmit}>
              {isBusy ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </header>

      <section className="flex flex-col divide-y divide-border">
        <FormRow
          title="Name"
          htmlFor="community-name"
          description="Configure how your community name is shown."
        >
          <Input
            id="community-name"
            placeholder="Community name"
            fullWidth
            error={!!errors.name}
            disabled={isCommunityNameDisabled}
            {...register("name")}
          />
          {errors.name && (
            <ErrorText className="ml-1 text-xs">
              {errors.name.message}
            </ErrorText>
          )}
        </FormRow>

        <FormRow
          title="Description"
          htmlFor="community-description"
          description="This will be displayed on your profile."
        >
          <>
            <Textarea
              id="community-description"
              placeholder="Some info about my community here."
              className="max-h-[6.5rem] min-h-[6.5rem]"
              error={!!errors.description}
              {...register("description")}
            />
            <div className="flex items-center justify-between text-xs">
              {errors.description ? (
                <ErrorText>{errors.description.message}</ErrorText>
              ) : (
                <span />
              )}
              <span className="text-muted-foreground">
                {MAX_COMMUNITY_DESCRIPTION_LENGTH - descriptionValue.length}{" "}
                characters left
              </span>
            </div>
          </>
        </FormRow>

        <FormRow
          title="Sector"
          description="Help to optimise the visibility of your community."
        >
          <SectorManager
            selectedSectors={sanitizedSelectedSectors}
            availableSectors={availableStandardSectors}
            onAddSector={handleAddSector}
            onRemoveSector={handleRemoveSector}
            sectorError={errors.sectors?.message}
          />
        </FormRow>

        <div className="py-6">
          <CommunityHeaderPreview
            communityName={nameValue}
            logoPreview={logoPreview}
            bannerPreview={bannerPreview}
            onLogoChange={handleLogoChange}
            onBannerChange={handleBannerChange}
            disabled={isBusy}
          />
        </div>
      </section>

      <DeleteCommunitySection
        communityId={community.id}
        communityName={community.name}
        canDeleteCommunity={canDeleteCommunity}
      />
    </form>
  );
}
