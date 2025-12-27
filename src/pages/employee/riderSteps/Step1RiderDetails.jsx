import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Upload, RotateCcw } from "lucide-react";
import { lookupRider } from "../../../utils/riderLookup";
import { useRiderForm } from "../RiderFormContext";

const sanitizeNumericInput = (value, maxLength) =>
  String(value || "").replace(/\D/g, "").slice(0, maxLength);

const isValidPhoneNumber = (value) => String(value || "").length === 10;

const isValidAadhaarNumber = (value) => String(value || "").length === 12;

const bannerStyles = {
  info: "bg-blue-50 border-blue-200 text-blue-700",
  success: "bg-green-50 border-green-200 text-green-700",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-700",
  error: "bg-red-50 border-red-200 text-red-700",
};

export default function Step1RiderDetails() {
  const { formData, updateForm, errors, setErrors, saveDraft } =
    useRiderForm();
  const navigate = useNavigate();

  const governmentIdInputRef = useRef(null);
  const riderPhotoInputRef = useRef(null);
  const preRidePhotosInputRef = useRef(null);
  const riderVideoRef = useRef(null);
  const riderStreamRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [facingMode, setFacingMode] = useState("user");

  const [aadhaarStatus, setAadhaarStatus] = useState(
    formData.aadhaarVerified ? "verified" : "idle"
  );
  const [aadhaarMessage, setAadhaarMessage] = useState(
    formData.aadhaarVerified ? "Aadhaar already verified." : ""
  );
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState("");
  const [pendingAadhaar, setPendingAadhaar] = useState("");
  const [banner, setBanner] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const bannerTimeoutRef = useRef(null);
  const tempAddressCache = useRef(
    formData.sameAddress ? "" : formData.temporaryAddress || ""
  );

  useEffect(() => {
    if (!imagePreview?.src) return;
    const prevOverflow = document.body.style.overflow;
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [imagePreview?.src]);

  useEffect(() => {
    return () => {
      if (bannerTimeoutRef.current) {
        clearTimeout(bannerTimeoutRef.current);
      }

      if (riderStreamRef.current) {
        riderStreamRef.current.getTracks().forEach((t) => t.stop());
        riderStreamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!cameraActive) return;

    const video = riderVideoRef.current;
    const stream = riderStreamRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;

    const handleLoadedMetadata = async () => {
      try {
        await video.play();
      } catch {
        // Some browsers might block play despite autoplay/muted restrictions.
      }
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [cameraActive]);

  const showBanner = (type, message) => {
    if (bannerTimeoutRef.current) {
      clearTimeout(bannerTimeoutRef.current);
    }

    setBanner({ type, message });
    bannerTimeoutRef.current = setTimeout(() => setBanner(null), 4000);
  };

  const clearFieldError = (field) => {
    if (!errors[field]) return;
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

  const getImageDataUrl = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object" && typeof value.dataUrl === "string") {
      return value.dataUrl;
    }
    return "";
  };

  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Unable to read file"));
      reader.readAsDataURL(file);
    });

  const validateImageFile = (file) => {
    if (!file) return "No file selected";
    if (!String(file.type || "").startsWith("image/")) return "Please select an image file";
    if (file.size > MAX_IMAGE_BYTES) return "Image must be 5MB or smaller";
    return "";
  };

  const handleImagePick = async (kind, file) => {
    const validation = validateImageFile(file);
    if (validation) {
      showBanner("error", validation);
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const payload = {
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl,
        updatedAt: new Date().toISOString(),
      };

      if (kind === "riderPhoto") {
        updateForm({ riderPhoto: payload });
        showBanner("success", "Rider photo uploaded.");
      } else {
        updateForm({ governmentId: payload });
        showBanner("success", "ID card uploaded.");
      }
    } catch (e) {
      showBanner("error", e?.message || "Unable to upload image");
    }
  };

  const handlePreRidePhotosPick = async (files) => {
    const list = Array.from(files || []);
    if (list.length === 0) return;

    const current = Array.isArray(formData.preRidePhotos)
      ? formData.preRidePhotos
      : [];
    const remainingSlots = Math.max(0, 8 - current.length);

    if (remainingSlots === 0) {
      showBanner("warning", "You can upload up to 8 pre-ride photos.");
      return;
    }

    const picked = list.slice(0, remainingSlots);

    try {
      const uploads = await Promise.all(
        picked.map(async (file) => {
          const validation = validateImageFile(file);
          if (validation) throw new Error(validation);
          const dataUrl = await readFileAsDataUrl(file);
          return {
            name: file.name,
            type: file.type,
            size: file.size,
            dataUrl,
            updatedAt: new Date().toISOString(),
          };
        })
      );

      updateForm({ preRidePhotos: [...current, ...uploads] });
      showBanner("success", "Pre-ride photos uploaded.");
    } catch (e) {
      showBanner("error", e?.message || "Unable to upload pre-ride photos");
    }
  };

  const stopRiderCamera = () => {
    if (riderStreamRef.current) {
      riderStreamRef.current.getTracks().forEach((t) => t.stop());
      riderStreamRef.current = null;
    }
    if (riderVideoRef.current) {
      riderVideoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const describeCameraError = (error) => {
    const name = error?.name;

    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return "Camera permission was denied. Please allow camera access in your browser settings and try again.";
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return "No camera device was found. If you're on a PC without a webcam (or using Remote Desktop), upload a photo instead.";
    }
    if (name === "NotReadableError" || name === "TrackStartError") {
      return "Camera is already in use by another app/tab. Close other apps using the camera and try again.";
    }
    if (name === "OverconstrainedError") {
      return "Your camera doesn't support the requested settings. Trying a compatible mode may help.";
    }
    if (name === "SecurityError") {
      return "Camera access is blocked due to browser security settings.";
    }

    return error?.message || "Unable to access camera. Please allow permission.";
  };

  const startRiderCamera = async (targetFacingMode) => {
    setCameraError("");

    // Most browsers require HTTPS (secure context) for camera access.
    // localhost/loopback hosts are treated as secure.
    const host =
      typeof window !== "undefined" ? String(window.location?.hostname || "") : "";
    const isLoopbackHost =
      host === "localhost" || host === "127.0.0.1" || host === "::1";
    if (
      typeof window !== "undefined" &&
      window.isSecureContext === false &&
      !isLoopbackHost
    ) {
      setCameraError(
        "Camera requires HTTPS. Please open this site using https:// (or use localhost during development)."
      );
      return;
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError("Camera is not supported in this browser.");
      return;
    }

    const desiredFacingMode = targetFacingMode || facingMode;
    setFacingMode(desiredFacingMode);

    try {
      // Stop any previous stream before starting a new one.
      stopRiderCamera();

      const tryGetStream = async (constraints) => {
        return await navigator.mediaDevices.getUserMedia(constraints);
      };

      // Prefer the front camera, but fall back if constraints aren't supported.
      const fallbackFacingMode =
        desiredFacingMode === "user" ? "environment" : "user";

      let stream;
      try {
        stream = await tryGetStream({
          video: { facingMode: { ideal: desiredFacingMode } },
          audio: false,
        });
      } catch (firstError) {
        try {
          stream = await tryGetStream({
            video: { facingMode: { ideal: fallbackFacingMode } },
            audio: false,
          });
        } catch (secondError) {
          try {
            stream = await tryGetStream({
              video: true,
              audio: false,
            });
          } catch (thirdError) {
            throw thirdError || secondError || firstError;
          }
        }
      }

      riderStreamRef.current = stream;
      setCameraActive(true);
      const trackFacingMode =
        stream
          ?.getVideoTracks?.()?.[0]
          ?.getSettings?.()?.facingMode;
      if (trackFacingMode) {
        setFacingMode(trackFacingMode);
      }
    } catch (e) {
      setCameraActive(false);
      setCameraError(describeCameraError(e));
    }
  };

  const handleFlipCamera = () => {
    const nextFacingMode = facingMode === "user" ? "environment" : "user";
    startRiderCamera(nextFacingMode);
  };

  const captureRiderPhoto = () => {
    const video = riderVideoRef.current;
    if (!video) return;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    updateForm({
      riderPhoto: {
        name: `rider-photo-${Date.now()}.jpg`,
        type: "image/jpeg",
        size: null,
        dataUrl,
        updatedAt: new Date().toISOString(),
      },
    });
    showBanner("success", "Rider photo captured.");
    stopRiderCamera();
  };

  const handleRetainLookup = async ({ phone, aadhaar } = {}) => {
    const lookupPhone = phone ?? formData.phone;
    const lookupAadhaar = aadhaar ?? formData.aadhaar;

    if (!lookupPhone && !lookupAadhaar) return;

    const rider = await lookupRider({
      phone: lookupPhone,
      aadhaar: lookupAadhaar,
    });

    if (rider) {
      const sanitizedPhone = sanitizeNumericInput(rider.phone || "", 10);
      const sanitizedAadhaar = sanitizeNumericInput(rider.aadhaar || "", 12);

      updateForm({
        name: rider.name,
        phone: sanitizedPhone,
        aadhaar: sanitizedAadhaar,
        gender: rider.gender,
        bikeModel: rider.bikeModel,
        isRetainRider: true,
        existingRiderId: rider.id,
        aadhaarVerified: true,
      });

      setOtpModalOpen(false);
      setOtpValue("");
      setOtpError("");
      setPendingAadhaar("");
      setAadhaarStatus("verified");
      setAadhaarMessage("Existing rider matched. Aadhaar verified (mock).");
      clearFieldError("aadhaar");
    }
  };

  const handleAadhaarVerify = () => {
    const aadhaarDigits = sanitizeNumericInput(formData.aadhaar, 12);

    if (!aadhaarDigits) {
      setErrors((prev) => ({
        ...prev,
        aadhaar: "Aadhaar number is required",
      }));
      setAadhaarStatus("idle");
      setAadhaarMessage("");
      return;
    }

    if (!isValidAadhaarNumber(aadhaarDigits)) {
      setErrors((prev) => ({
        ...prev,
        aadhaar: "Enter a valid 12-digit Aadhaar number",
      }));
      setAadhaarStatus("idle");
      setAadhaarMessage("");
      updateForm({ aadhaar: aadhaarDigits, aadhaarVerified: false });
      return;
    }

    clearFieldError("aadhaar");
    updateForm({ aadhaar: aadhaarDigits });

    setPendingAadhaar(aadhaarDigits);
    setOtpValue("");
    setOtpError("");
    setAadhaarStatus("awaiting-otp");
    setAadhaarMessage(
      "Enter the 6-digit OTP sent to the registered mobile (mock: 123456)."
    );
    setOtpModalOpen(true);
  };

  const handleOtpSubmit = () => {
    const otpDigits = sanitizeNumericInput(otpValue, 6);

    if (otpDigits.length !== 6) {
      setOtpError("Enter the 6-digit OTP");
      return;
    }

    if (otpDigits !== "123456") {
      setOtpError("Invalid OTP. Use 123456 for mock verification.");
      return;
    }

    updateForm({ aadhaar: pendingAadhaar, aadhaarVerified: true });
    clearFieldError("aadhaar");

    setAadhaarStatus("verified");
    setAadhaarMessage("Aadhaar verified successfully (mock).");

    setOtpModalOpen(false);
    setOtpValue("");
    setOtpError("");
    setPendingAadhaar("");
    showBanner("success", "Aadhaar verified successfully.");
  };

  const handleOtpCancel = () => {
    setOtpModalOpen(false);
    setOtpValue("");
    setOtpError("");
    setPendingAadhaar("");
    setAadhaarStatus("idle");
    setAadhaarMessage("Aadhaar verification cancelled.");
    updateForm({ aadhaarVerified: false });
  };

  const handleSaveDraft = async () => {
    if (!formData.name && !formData.phone && !formData.aadhaar) {
      showBanner("warning", "Add rider details before saving a draft.");
      return;
    }

    try {
      await saveDraft({ stepLabel: "Rider Details", stepPath: "step-1" });
      showBanner(
        "success",
        "Draft saved. You can resume anytime from the dashboard."
      );
    } catch (error) {
      const detail = String(error?.message || "").trim();
      showBanner(
        "error",
        detail
          ? `Unable to save draft: ${detail}`
          : "Unable to save draft. Check local API/Postgres connection."
      );
    }
  };

  const handleNext = () => {
    const nextErrors = {};

    const trimmedName = formData.name.trim();
    const phoneDigits = sanitizeNumericInput(formData.phone, 10);
    const aadhaarDigits = sanitizeNumericInput(formData.aadhaar, 12);
    const permanentAddress = formData.permanentAddress.trim();
    const temporaryAddress = formData.temporaryAddress.trim();

    if (!trimmedName) {
      nextErrors.name = "Full name is required";
    }

    if (!phoneDigits) {
      nextErrors.phone = "Mobile number is required";
    } else if (!isValidPhoneNumber(phoneDigits)) {
      nextErrors.phone = "Enter a valid 10-digit mobile number";
    }

    if (!aadhaarDigits) {
      nextErrors.aadhaar = "Aadhaar number is required";
    } else if (!isValidAadhaarNumber(aadhaarDigits)) {
      nextErrors.aadhaar = "Enter a valid 12-digit Aadhaar number";
    } else if (!formData.aadhaarVerified) {
      nextErrors.aadhaar = "Please verify Aadhaar before continuing";
    }

    if (!permanentAddress) {
      nextErrors.permanentAddress = "Permanent address is required";
    }

    if (!formData.sameAddress && !temporaryAddress) {
      nextErrors.temporaryAddress = "Temporary address is required";
    }

    if (!formData.dob) {
      nextErrors.dob = "Date of birth is required";
    }

    if (!formData.gender) {
      nextErrors.gender = "Please select a gender";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      updateForm({
        name: trimmedName,
        phone: phoneDigits,
        aadhaar: aadhaarDigits,
        permanentAddress,
        ...(formData.sameAddress
          ? { temporaryAddress: permanentAddress }
          : { temporaryAddress }),
      });

      navigate("../step-2");
    }
  };

  const nextFacingLabel = facingMode === "user" ? "rear-facing" : "front-facing";
  const videoStyle =
    cameraActive && facingMode === "user"
      ? { transform: "scaleX(-1)" }
      : undefined;

  return (
    <div className="space-y-5">
      {banner && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            bannerStyles[banner.type] || bannerStyles.info
          }`}
        >
          {banner.message}
        </div>
      )}

      <div className="card space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-base font-semibold text-evegah-text">
              Rider Information
            </h3>
            <p className="text-sm text-gray-500">
              Personal and contact details for the rider.
            </p>
          </div>

          <div className="w-full md:w-auto">
            <label className="label mb-1 md:text-right">Operational Zone</label>
            <select
              className="select md:min-w-[200px]"
              value={formData.operationalZone || ""}
              onChange={(e) => updateForm({ operationalZone: e.target.value })}
            >
              <option>Gotri Zone</option>
              <option>Manjalpur</option>
              <option>Karelibaug</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="label">Full Name *</label>
            <input
              className="input"
              placeholder="As per your government ID"
              value={formData.name}
              onChange={(e) => {
                updateForm({ name: e.target.value });
                clearFieldError("name");
              }}
            />
            {errors.name && <p className="error">{errors.name}</p>}
          </div>

          <div>
            <label className="label">Mobile Number *</label>
            <input
              className="input"
              type="tel"
              value={formData.phone}
              inputMode="numeric"
              maxLength={10}
              onChange={(e) => {
                const digits = sanitizeNumericInput(e.target.value, 10);
                updateForm({ phone: digits });
                clearFieldError("phone");
              }}
              onBlur={(e) =>
                handleRetainLookup({
                  phone: sanitizeNumericInput(e.target.value, 10),
                })
              }
            />
            {errors.phone && <p className="error">{errors.phone}</p>}
          </div>
        </div>

        <div className={`grid grid-cols-1 gap-4 ${formData.sameAddress ? "md:grid-cols-1" : "md:grid-cols-2"}`}>
          <div>
            <label className="label">Resident Address *</label>
            <textarea
              className="textarea"
              rows={3}
              placeholder="House no, Street, Area, City, Pincode"
              value={formData.permanentAddress}
              onChange={(e) => {
                const value = e.target.value;
                updateForm({
                  permanentAddress: value,
                  ...(formData.sameAddress ? { temporaryAddress: value } : {}),
                });
                clearFieldError("permanentAddress");
                if (formData.sameAddress) clearFieldError("temporaryAddress");
              }}
            />
            {errors.permanentAddress && (
              <p className="error">{errors.permanentAddress}</p>
            )}
          </div>

          {!formData.sameAddress && (
            <div>
              <label className="label">Permanent Address *</label>
              <textarea
                className="textarea"
                rows={3}
                placeholder="House no, Street, Area, City, Pincode"
                value={formData.temporaryAddress}
                onChange={(e) => {
                  updateForm({ temporaryAddress: e.target.value });
                  clearFieldError("temporaryAddress");
                }}
              />
              {errors.temporaryAddress && (
                <p className="error">{errors.temporaryAddress}</p>
              )}
            </div>
          )}
        </div>

        <div className="pt-1">
          <label className="flex items-center gap-2 text-sm text-evegah-text font-medium">
            <input
              type="checkbox"
              className="checkbox"
              checked={formData.sameAddress}
              onChange={(e) => {
                const checked = e.target.checked;
                if (checked) {
                  tempAddressCache.current = formData.temporaryAddress;
                  updateForm({
                    sameAddress: true,
                    temporaryAddress: formData.permanentAddress,
                  });
                  clearFieldError("temporaryAddress");
                } else {
                  updateForm({
                    sameAddress: false,
                    temporaryAddress: tempAddressCache.current || "",
                  });
                }
              }}
            />
            My temporary/mailing address is the same as my permanent address.
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="label">Reference Name / Number</label>
            <input
              className="input"
              value={formData.reference}
              onChange={(e) => {
                updateForm({ reference: e.target.value });
              }}
            />
          </div>

          <div>
            <label className="label">Date of Birth *</label>
            <input
              type="date"
              className="input"
              value={formData.dob}
              onChange={(e) => {
                updateForm({ dob: e.target.value });
                clearFieldError("dob");
              }}
              max={new Date().toISOString().split("T")[0]}
            />
            {errors.dob && <p className="error">{errors.dob}</p>}
          </div>

          <div>
            <label className="label">Gender *</label>
            <div className="flex gap-4 mt-2">
              {["Male", "Female", "Other"].map((g) => (
                <label key={g} className="flex items-center gap-1 text-sm">
                  <input
                    type="radio"
                    className="radio"
                    name="gender"
                    value={g}
                    checked={formData.gender === g}
                    onChange={() => {
                      updateForm({ gender: g });
                      clearFieldError("gender");
                    }}
                  />
                  {g}
                </label>
              ))}
            </div>
            {errors.gender && <p className="error">{errors.gender}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-evegah-border bg-gray-50 p-4 space-y-2">
            <h3 className="font-medium text-evegah-text">Rider Photo</h3>
            <p className="text-sm text-gray-500">
              Capture a clear, forward-facing photo.
            </p>

            {getImageDataUrl(formData.riderPhoto) ? (
              <div className="mt-3">
                <div className="rounded-xl border border-evegah-border bg-white p-3">
                  <button
                    type="button"
                    className="block w-full"
                    onClick={() =>
                      setImagePreview({
                        src: getImageDataUrl(formData.riderPhoto),
                        title: "Rider Photo",
                      })
                    }
                    title="Open preview"
                  >
                    <img
                      src={getImageDataUrl(formData.riderPhoto)}
                      alt="Rider"
                      className="h-44 w-full rounded-lg object-cover"
                    />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={async () => {
                      updateForm({ riderPhoto: null });
                      await startRiderCamera();
                    }}
                  >
                    <Camera size={16} />
                    <span className="ml-2">Retake Photo</span>
                  </button>
                  <button
                    type="button"
                    className="btn-muted"
                    onClick={() => updateForm({ riderPhoto: null })}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-evegah-border bg-white p-4">
                <input
                  ref={riderPhotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImagePick("riderPhoto", file);
                    e.target.value = "";
                  }}
                />

                {cameraActive ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <video
                        ref={riderVideoRef}
                        className="w-full rounded-lg border border-evegah-border bg-black/90"
                        style={videoStyle}
                        playsInline
                        muted
                        autoPlay
                      />
                      <button
                        type="button"
                        aria-label={`Flip to ${nextFacingLabel} camera`}
                        className="absolute top-3 right-3 h-10 w-10 rounded-full border border-white bg-white/90 shadow text-evegah-text flex items-center justify-center"
                        onClick={handleFlipCamera}
                      >
                        <RotateCcw size={18} />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={captureRiderPhoto}
                      >
                        <Camera size={16} />
                        <span className="ml-2">Capture Photo</span>
                      </button>
                      <button
                        type="button"
                        className="btn-muted"
                        onClick={stopRiderCamera}
                      >
                        Stop Camera
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Camera size={16} />
                      Take a live photo using the camera.
                    </div>

                    {cameraError ? (
                      <p className="text-xs text-red-600 mt-2">{cameraError}</p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={startRiderCamera}
                      >
                        <span className="ml-2">Start Camera</span>
                      </button>

                      <button
                        type="button"
                        className="btn-outline"
                        onClick={() => riderPhotoInputRef.current?.click()}
                      >
                        <Upload size={16} />
                        <span className="ml-2">Upload Photo</span>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Allow camera permission when prompted.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-evegah-border bg-gray-50 p-4 space-y-3">
            <h3 className="font-medium text-evegah-text">Pre-ride Photos (Upload)</h3>
            <p className="text-sm text-gray-500">
              Upload photos of the vehicle before handing over to the rider.
            </p>

            <input
              ref={preRidePhotosInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                handlePreRidePhotosPick(e.target.files);
                e.target.value = "";
              }}
            />

            <button
              type="button"
              className="w-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-sm text-gray-500 p-5 hover:bg-gray-50 transition"
              onClick={() => preRidePhotosInputRef.current?.click()}
            >
              <Upload size={20} />
              <p className="mt-2 font-medium">
                {Array.isArray(formData.preRidePhotos) && formData.preRidePhotos.length > 0
                  ? "Add more photos"
                  : "Click to upload photos"}
              </p>
              <p className="text-xs">PNG, JPG, WEBP (max 5MB each, up to 8)</p>
            </button>

            {Array.isArray(formData.preRidePhotos) && formData.preRidePhotos.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {formData.preRidePhotos.slice(0, 8).map((p, idx) => (
                  <div
                    key={`${p?.name || "photo"}-${idx}`}
                    className="relative rounded-lg overflow-hidden border border-evegah-border bg-white"
                  >
                    <button
                      type="button"
                      className="block w-full"
                      onClick={() =>
                        setImagePreview({
                          src: getImageDataUrl(p),
                          title: "Pre-ride Photo",
                        })
                      }
                      title="Open preview"
                    >
                      <img
                        src={getImageDataUrl(p)}
                        alt="Pre-ride"
                        className="h-16 w-full object-cover"
                      />
                    </button>
                    <button
                      type="button"
                      className="absolute top-1 right-1 h-6 w-6 rounded-full border border-evegah-border bg-white/90 text-gray-700 hover:bg-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = [...formData.preRidePhotos];
                        next.splice(idx, 1);
                        updateForm({ preRidePhotos: next });
                      }}
                      title="Remove"
                      aria-label="Remove photo"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">No pre-ride photos uploaded yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-evegah-border bg-white p-4 space-y-4">
          <h3 className="font-medium text-evegah-text">Identity Verification</h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="label">Aadhaar Card Number *</label>
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="XXXX-XXXX-XXXX"
                  value={formData.aadhaar}
                  inputMode="numeric"
                  maxLength={12}
                  onChange={(e) => {
                    const digits = sanitizeNumericInput(e.target.value, 12);
                    updateForm({ aadhaar: digits, aadhaarVerified: false });
                    setAadhaarStatus("idle");
                    setAadhaarMessage("");
                    clearFieldError("aadhaar");
                  }}
                  onBlur={(e) =>
                    handleRetainLookup({
                      aadhaar: sanitizeNumericInput(e.target.value, 12),
                    })
                  }
                />
                <button
                  type="button"
                  className="btn-primary whitespace-nowrap disabled:opacity-60"
                  onClick={handleAadhaarVerify}
                  disabled={
                    aadhaarStatus === "awaiting-otp" || formData.aadhaarVerified
                  }
                >
                  {formData.aadhaarVerified
                    ? "Verified"
                    : aadhaarStatus === "awaiting-otp"
                    ? "OTP Sent"
                    : "Verify"}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Mock verification completes after OTP entry.
              </p>
              {errors.aadhaar && <p className="error">{errors.aadhaar}</p>}
              {aadhaarMessage && (
                <p
                  className={`text-xs mt-1 ${
                    aadhaarStatus === "verified"
                      ? "text-green-600"
                      : aadhaarStatus === "awaiting-otp"
                      ? "text-blue-600"
                      : "text-gray-500"
                  }`}
                >
                  {aadhaarMessage}
                </p>
              )}
            </div>

            <div>
              <input
                ref={governmentIdInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  handleImagePick("governmentId", file);
                  e.target.value = "";
                }}
              />

              <button
                type="button"
                className="w-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-sm text-gray-500 p-5 hover:bg-gray-50 transition text-left"
                onClick={() => governmentIdInputRef.current?.click()}
              >
                <Upload size={20} />
                <p className="mt-2">
                  {getImageDataUrl(formData.governmentId)
                    ? "Change uploaded ID card"
                    : "Click to upload ID card"}
                </p>
                <p className="text-xs">PNG, JPG, WEBP (max 5MB)</p>
              </button>
            </div>
          </div>

          {getImageDataUrl(formData.governmentId) ? (
            <div className="mt-1 rounded-xl border border-evegah-border bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-600 mb-2">
                Uploaded ID Preview
              </p>
              <button
                type="button"
                className="block w-full"
                onClick={() =>
                  setImagePreview({
                    src: getImageDataUrl(formData.governmentId),
                    title: "ID Card Photo",
                  })
                }
                title="Open preview"
              >
                <img
                  src={getImageDataUrl(formData.governmentId)}
                  alt="Government ID"
                  className="h-40 w-full rounded-lg object-cover bg-white"
                />
              </button>
              <div className="mt-3">
                <button
                  type="button"
                  className="btn-muted"
                  onClick={() => updateForm({ governmentId: null })}
                >
                  Remove ID
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end border-t border-evegah-border pt-4">
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-outline"
              onClick={handleSaveDraft}
            >
              Save Draft
            </button>

            <button
              onClick={handleNext}
              className="btn-primary flex items-center gap-2"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {otpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Enter OTP</h3>
              <p className="text-sm text-gray-500 mt-1">
                We sent a mock OTP to the registered mobile. Use <span className="font-medium">123456</span> to verify.
              </p>
            </div>

            <div>
              <label className="label">6-digit OTP</label>
              <input
                className="input text-center tracking-[0.35em]"
                value={otpValue}
                inputMode="numeric"
                maxLength={6}
                onChange={(e) => {
                  setOtpError("");
                  setOtpValue(sanitizeNumericInput(e.target.value, 6));
                }}
                autoFocus
              />
              {otpError && <p className="error">{otpError}</p>}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                className="btn-muted"
                onClick={handleOtpCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleOtpSubmit}
              >
                Verify OTP
              </button>
            </div>
          </div>
        </div>
      )}

      {imagePreview?.src ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setImagePreview(null)}
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-2xl border border-evegah-border bg-white shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-evegah-border px-4 py-3">
              <div className="text-sm font-semibold text-evegah-text truncate">
                {imagePreview.title || "Preview"}
              </div>
              <button
                type="button"
                className="h-9 w-9 rounded-xl border border-evegah-border bg-white text-gray-600 hover:bg-gray-50"
                onClick={() => setImagePreview(null)}
                aria-label="Close preview"
              >
                ✕
              </button>
            </div>
            <div className="bg-black/5 p-3">
              <img
                src={imagePreview.src}
                alt={imagePreview.title || "Preview"}
                className="max-h-[75vh] w-full object-contain rounded-xl bg-white"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
