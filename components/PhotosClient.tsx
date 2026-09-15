"use client";

import { useTransition } from "react";
import { useLibrary } from "@/lib/library-context";

export function PhotosClient() {
  const { photos, uploadPhotos, deletePhoto, setPhotoUsed } = useLibrary();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-10">
      <header>
        <p className="eyebrow">Library</p>
        <h1 className="display mt-3">Photos</h1>
        <p className="mt-3 max-w-xl text-[#6e6a69]">
          Upload once. Reuse on any quote. A photo is marked used after you download a card.
          Photos stay in this browser until we add cloud storage.
        </p>
      </header>

      <label className="paper-card block cursor-pointer p-6 text-[#6e6a69]">
        Add photos
        <input
          name="photos"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="mt-4 block"
          disabled={pending}
          onChange={(event) => {
            const files = event.target.files;
            if (!files?.length) return;
            startTransition(async () => {
              await uploadPhotos(Array.from(files));
              event.target.value = "";
            });
          }}
        />
      </label>

      <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
        {photos.map((photo) => (
          <figure key={photo.id}>
            <div className="overflow-hidden" style={{ borderRadius: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.originalName}
                className="aspect-[4/5] w-full object-cover"
              />
            </div>
            <figcaption className="mt-4 flex items-center justify-between text-[18px]">
              <span className="used-stamp">{photo.used ? "Used" : "Unused"}</span>
              <span className="flex gap-4 text-[14px] text-[#6e6a69]">
                <button
                  type="button"
                  onClick={() => startTransition(() => setPhotoUsed(photo.id, !photo.used))}
                >
                  Toggle
                </button>
                <button
                  type="button"
                  onClick={() => startTransition(() => deletePhoto(photo.id))}
                >
                  Delete
                </button>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
      {photos.length === 0 ? <p className="text-[#9a9796]">No photos yet.</p> : null}
    </div>
  );
}
