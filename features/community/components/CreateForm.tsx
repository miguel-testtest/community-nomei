import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/common/Button";
import { ErrorText } from "@/components/common/ErrorText";
import { Input } from "@/components/UI/Input";
import { Textarea } from "@/components/UI/TextArea";
import {
  CommunityCreateFormValues,
  communityCreateSchema,
  MAX_COMMUNITY_DESCRIPTION_LENGTH,
} from "../schema/community-create.schema";
import { ImageUploadInput } from "./ImageUploadInput";

type CreateFormProps = {
  onSubmit?: (values: CommunityCreateFormValues) => void | Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  onChange?: (values: CommunityCreateFormValues) => void;
  submitLabel?: string;
  initialValues?: CommunityCreateFormValues | null;
};

export function CreateForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  onChange,
  submitLabel = "Continue",
  initialValues,
}: CreateFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting: isFormSubmitting },
    watch,
    setValue,
    resetField,
  } = useForm<CommunityCreateFormValues>({
    resolver: zodResolver(communityCreateSchema),
    defaultValues: initialValues ?? {
      communityName: "",
      description: "",
      logo: undefined,
      banner: undefined,
    },
    mode: "onChange",
  });

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  const communityNameValue = watch("communityName") ?? "";
  const description = watch("description") ?? "";

  const logoFiles = watch("logo");
  const logoFile = logoFiles?.[0] ?? null;

  const bannerFiles = watch("banner");
  const bannerFile = bannerFiles?.[0] ?? null;

  const remainingCharacters =
    MAX_COMMUNITY_DESCRIPTION_LENGTH - description.length;

  const syncInputFiles = (
    input: HTMLInputElement | null,
    files: FileList | null,
  ) => {
    if (!input) return;

    if (!files || files.length === 0) {
      input.value = "";
      input.files = null;
      return;
    }

    if (typeof window !== "undefined" && typeof DataTransfer !== "undefined") {
      const dataTransfer = new DataTransfer();
      Array.from(files).forEach((file) => dataTransfer.items.add(file));
      input.files = dataTransfer.files;
    }
  };

  const {
    ref: logoRegisterRef,
    onChange: onLogoChange,
    onBlur: onLogoBlur,
    ...logoFieldRest
  } = register("logo");

  const {
    ref: bannerRegisterRef,
    onChange: onBannerChange,
    onBlur: onBannerBlur,
    ...bannerFieldRest
  } = register("banner");

  useEffect(() => {
    if (!onChange) return;

    const subscription = watch((values) => {
      const cleanedValues: CommunityCreateFormValues = {
        ...values,
        logo: values.logo && values.logo.length > 0 ? values.logo : undefined,
        banner:
          values.banner && values.banner.length > 0 ? values.banner : undefined,
      } as CommunityCreateFormValues;

      onChange(cleanedValues);
    });

    return () => subscription.unsubscribe();
  }, [watch, onChange]);

  const handleFormSubmit = async (values: CommunityCreateFormValues) => {
    await onSubmit?.(values);
  };

  const handleLogoFileChange = (files: FileList | null) => {
    if (!files || files.length === 0) {
      resetField("logo", { defaultValue: undefined });
      syncInputFiles(logoInputRef.current, null);
      return;
    }

    syncInputFiles(logoInputRef.current, files);

    setValue("logo", files, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const handleBannerFileChange = (files: FileList | null) => {
    if (!files || files.length === 0) {
      resetField("banner", { defaultValue: undefined });
      syncInputFiles(bannerInputRef.current, null);
      return;
    }

    syncInputFiles(bannerInputRef.current, files);

    setValue("banner", files, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const formSubmitDisabled = isSubmitting || isFormSubmitting;

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="flex w-full max-w-[40rem] flex-col"
      noValidate
    >
      <div className="flex flex-col">
        <header className="flex flex-col gap-4">
          <div>
            <h1 className="text-h2 text-foreground">
              Let's create your community!
            </h1>
            <p className="text-muted-foreground text-c1">
              Our users like to know more about a community before they get
              involved.
            </p>
          </div>
          <div className="mb-4 border-b border-border" />
        </header>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="communityName"
            className="text-foreground text-c1 font-semibold"
          >
            Community's name
          </label>
          <Input
            id="communityName"
            placeholder="Enter community's name"
            fullWidth
            maxLength={120}
            error={!!errors.communityName}
            {...register("communityName")}
          />
          <div className="flex items-start justify-between text-xs">
            <div className="ml-1 min-h-[1.2rem]">
              {errors.communityName?.message && (
                <ErrorText>{errors.communityName.message}</ErrorText>
              )}
            </div>
            <span className="text-muted-foreground">
              {communityNameValue.length}/120
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="description"
            className="text-foreground text-c1 font-semibold"
          >
            Description
          </label>
          <Textarea
            id="description"
            placeholder="Enter community's description"
            fullWidth
            error={!!errors.description}
            maxLength={MAX_COMMUNITY_DESCRIPTION_LENGTH}
            className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent max-h-[6.5rem] min-h-[6.5rem] resize-none"
            {...register("description")}
          />
          <div className="flex items-start justify-between">
            <div className="min-h-[1.2rem]">
              {errors.description?.message && (
                <ErrorText>{errors.description.message}</ErrorText>
              )}
            </div>
            <span className="text-muted-foreground text-c2">
              {remainingCharacters} characters left
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-foreground text-c1 font-semibold">
            Community logo
          </span>
          <ImageUploadInput
            file={logoFile}
            accept="image/jpeg,image/jpg, image/png, image/webp"
            hasError={!!errors.logo}
            helperText="Format: only jpeg, jpg. Maximum size: 5MB"
            onFilesSelected={handleLogoFileChange}
            onRemove={() => {
              handleLogoFileChange(null);
            }}
            inputProps={logoFieldRest}
            inputRef={(instance) => {
              logoRegisterRef(instance);
              logoInputRef.current = instance;
            }}
            onInputChange={onLogoChange}
            onInputBlur={onLogoBlur}
            disabled={formSubmitDisabled}
          />
          {errors.logo?.message && <ErrorText>{errors.logo.message}</ErrorText>}
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <span className="text-foreground text-c1 font-semibold">
            Community banner
          </span>
          <ImageUploadInput
            file={bannerFile}
            accept="image/jpeg,image/jpg"
            hasError={!!errors.banner}
            helperText="Format: only jpeg, jpg. Maximum size: 5MB"
            onFilesSelected={handleBannerFileChange}
            onRemove={() => {
              handleBannerFileChange(null);
            }}
            inputProps={bannerFieldRest}
            inputRef={(instance) => {
              bannerRegisterRef(instance);
              bannerInputRef.current = instance;
            }}
            onInputChange={onBannerChange}
            onInputBlur={onBannerBlur}
            disabled={formSubmitDisabled}
          />
          {errors.banner?.message && (
            <ErrorText>{errors.banner.message}</ErrorText>
          )}
        </div>
      </div>

      <footer className="mt-6 flex justify-center gap-3 md:flex-row md:justify-end">
        <Button
          type="button"
          variant="secondary"
          className="bg-surface w-fit md:min-w-[8rem]"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          className="w-fit md:min-w-[8rem]"
          disabled={formSubmitDisabled}
        >
          {submitLabel}
        </Button>
      </footer>
    </form>
  );
}
