import { useState, useCallback, useRef } from "react";
import Webcam from "react-webcam";
import { config } from "./config";
import { ResultModal, TextractResult } from "./ResultModal";
import { LoadingIcon } from "./loading-icon";

const { uploadFunctionUrl, textractFunctionUrl, bucket } = config;

interface ImageUploadPresenterProps {
  capturedImage: string | null;
  isUploading: boolean;
  isModalOpen: boolean;
  error: string | null;
  textractResults: TextractResult[];
  webcamRef: React.RefObject<Webcam>;
  videoConstraints: {
    facingMode: string;
    width: number;
    height: number;
  };
  onCapture: () => void;
  onRetake: () => void;
  onUpload: () => void;
  onModalClose: () => void;
}

export const ImageUploadPresenter = ({
  capturedImage,
  isUploading,
  isModalOpen,
  error,
  textractResults,
  webcamRef,
  videoConstraints,
  onCapture,
  onRetake,
  onUpload,
  onModalClose,
}: ImageUploadPresenterProps) => {
  return (
    <div className="flex flex-col items-center">
      {!capturedImage ? (
        <div className="relative max-w-2xl">
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}
            className="w-full rounded-lg"
          />
          <button
            onClick={onCapture}
            className="absolute text-lg bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-black hover:bg-gray-400 text-white"
          >
            撮影
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center w-full max-w-2xl">
          <img
            src={capturedImage}
            alt="Captured"
            className="w-full rounded-lg"
          />
          <div className="flex gap-4 mt-4">
            <button
              onClick={onRetake}
              disabled={isUploading}
              className="px-4 py-2 text-lg rounded-md bg-gray-500 hover:bg-gray-400 text-white disabled:cursor-not-allowed"
            >
              撮り直す
            </button>
            <button
              onClick={onUpload}
              disabled={isUploading}
              className="px-4 py-2 text-lg rounded-md bg-green-600 hover:bg-green-400 text-white disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <div className="flex items-center gap-2">
                  <LoadingIcon />
                  アップロード中...
                </div>
              ) : (
                "画像アップロード"
              )}
            </button>
          </div>
        </div>
      )}
      {error && <div className="text-red-500">{error}</div>}
      <ResultModal
        isOpen={isModalOpen}
        onClose={onModalClose}
        results={textractResults}
      />
    </div>
  );
};

interface UploadResponse {
  uploadUrl: string;
  key: string;
}

export const ImageUploadComponent = () => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [textractResults, setTextractResults] = useState<TextractResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const webcamRef = useRef<Webcam>(null);

  const videoConstraints = {
    facingMode: "environment",
    width: 720,
    height: 720,
  };

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setCapturedImage(imageSrc);
    }
  }, [webcamRef]);

  const uploadImage = async () => {
    if (!capturedImage) return;

    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const file = new File([blob], `capture-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      const presignedUrlResponse = await fetch(uploadFunctionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
      });

      if (!presignedUrlResponse.ok) {
        throw new Error("Pre-signed URLの取得に失敗しました");
      }

      const { uploadUrl, key }: UploadResponse =
        await presignedUrlResponse.json();

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("アップロードに失敗しました");
      }

      const textractResponse = await fetch(textractFunctionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key, bucket }),
      });

      const results = await textractResponse.json();
      setTextractResults(results);
      setIsModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsUploading(false);
    }
  };

  const retake = () => {
    setCapturedImage(null);
  };

  return (
    <ImageUploadPresenter
      capturedImage={capturedImage}
      isUploading={isUploading}
      isModalOpen={isModalOpen}
      error={error}
      textractResults={textractResults}
      webcamRef={webcamRef}
      videoConstraints={videoConstraints}
      onCapture={capture}
      onRetake={retake}
      onUpload={uploadImage}
      onModalClose={() => setIsModalOpen(false)}
    />
  );
};
