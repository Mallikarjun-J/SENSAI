import { generateReactHelpers, generateUploadButton, generateUploadDropzone } from "@uploadthing/react";

export const { useUploadThing, uploadFiles } = generateReactHelpers();
export const UploadButton = generateUploadButton();
export const UploadDropzone = generateUploadDropzone();

